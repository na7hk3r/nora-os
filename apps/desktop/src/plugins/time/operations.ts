import { eventBus } from '@core/events/EventBus'
import { TIME_EVENTS } from './events'
import { timeEntriesRepo, timeProjectsRepo } from './repository'
import { useTimeStore } from './store'
import type { TimeEntry, TimeEntrySource, TimeProject } from './types'
import { entryDurationSec, genId, nowISO } from './utils'

const COLOR_PALETTE = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#34d399', '#fbbf24', '#60a5fa']

function nextProjectColor(): string {
  const count = useTimeStore.getState().projects.length
  return COLOR_PALETTE[count % COLOR_PALETTE.length]
}

export async function loadAll(): Promise<void> {
  const [projects, entries] = await Promise.all([
    timeProjectsRepo.find({ orderBy: [{ column: 'name', direction: 'ASC' }] }),
    timeEntriesRepo.find({ orderBy: [{ column: 'start', direction: 'DESC' }], limit: 500 }),
  ])
  useTimeStore.getState().setProjects(projects)
  useTimeStore.getState().setEntries(entries)
}

export async function createProject(input: {
  name: string
  client?: string | null
  hourlyRate?: number | null
  color?: string
}): Promise<TimeProject> {
  const project: TimeProject = {
    id: genId('tp'),
    name: input.name.trim(),
    color: input.color ?? nextProjectColor(),
    client: input.client?.trim() || null,
    hourlyRate: input.hourlyRate ?? null,
    archived: false,
    createdAt: nowISO(),
  }
  await timeProjectsRepo.create(project)
  useTimeStore.getState().upsertProject(project)
  eventBus.emit(TIME_EVENTS.PROJECT_CREATED, { id: project.id, name: project.name })
  return project
}

export async function updateProject(id: string, patch: Partial<TimeProject>): Promise<void> {
  const current = useTimeStore.getState().projects.find((p) => p.id === id)
  if (!current) return
  const next = { ...current, ...patch }
  await timeProjectsRepo.update(id, next)
  useTimeStore.getState().upsertProject(next)
  eventBus.emit(TIME_EVENTS.PROJECT_UPDATED, { id })
}

export async function deleteProject(id: string): Promise<void> {
  // Detach entries first (set projectId=null), then delete the project itself.
  const affected = useTimeStore.getState().entries.filter((e) => e.projectId === id)
  for (const e of affected) {
    const next = { ...e, projectId: null }
    await timeEntriesRepo.update(e.id, next)
    useTimeStore.getState().upsertEntry(next)
  }
  await timeProjectsRepo.delete(id)
  useTimeStore.getState().removeProject(id)
  eventBus.emit(TIME_EVENTS.PROJECT_DELETED, { id })
}

export async function startEntry(input: {
  projectId?: string | null
  taskId?: string | null
  billable?: boolean
  note?: string
  source?: TimeEntrySource
}): Promise<TimeEntry> {
  // If something is already running, stop it first.
  const running = useTimeStore.getState().runningEntry()
  if (running) {
    await stopEntry(running.id)
  }
  const entry: TimeEntry = {
    id: genId('te'),
    projectId: input.projectId ?? null,
    taskId: input.taskId ?? null,
    start: nowISO(),
    end: null,
    durationSec: 0,
    billable: input.billable ?? false,
    source: input.source ?? 'manual',
    note: input.note ?? '',
    createdAt: nowISO(),
  }
  await timeEntriesRepo.create(entry)
  useTimeStore.getState().upsertEntry(entry)
  eventBus.emit(TIME_EVENTS.ENTRY_STARTED, { id: entry.id, projectId: entry.projectId })
  return entry
}

export async function stopEntry(id: string): Promise<TimeEntry | null> {
  const current = useTimeStore.getState().entries.find((e) => e.id === id)
  if (!current || current.end !== null) return null
  const end = nowISO()
  const next: TimeEntry = {
    ...current,
    end,
    durationSec: entryDurationSec({ ...current, end }),
  }
  await timeEntriesRepo.update(id, next)
  useTimeStore.getState().upsertEntry(next)
  eventBus.emit(TIME_EVENTS.ENTRY_STOPPED, { id, durationSec: next.durationSec })
  return next
}

export async function createManualEntry(input: {
  projectId?: string | null
  start: string
  end: string
  billable?: boolean
  note?: string
}): Promise<TimeEntry> {
  const startMs = Date.parse(input.start)
  const endMs = Date.parse(input.end)
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
    throw new Error('Rango de fechas inválido')
  }
  const entry: TimeEntry = {
    id: genId('te'),
    projectId: input.projectId ?? null,
    taskId: null,
    start: input.start,
    end: input.end,
    durationSec: Math.floor((endMs - startMs) / 1000),
    billable: input.billable ?? false,
    source: 'manual',
    note: input.note ?? '',
    createdAt: nowISO(),
  }
  await timeEntriesRepo.create(entry)
  useTimeStore.getState().upsertEntry(entry)
  eventBus.emit(TIME_EVENTS.ENTRY_CREATED, { id: entry.id })
  return entry
}

export async function updateEntry(id: string, patch: Partial<TimeEntry>): Promise<void> {
  const current = useTimeStore.getState().entries.find((e) => e.id === id)
  if (!current) return
  const next = { ...current, ...patch }
  // Recompute duration if start/end changed and not running.
  if (next.end) {
    const startMs = Date.parse(next.start)
    const endMs = Date.parse(next.end)
    if (!Number.isNaN(startMs) && !Number.isNaN(endMs) && endMs > startMs) {
      next.durationSec = Math.floor((endMs - startMs) / 1000)
    }
  }
  await timeEntriesRepo.update(id, next)
  useTimeStore.getState().upsertEntry(next)
  eventBus.emit(TIME_EVENTS.ENTRY_UPDATED, { id })
}

export async function deleteEntry(id: string): Promise<void> {
  await timeEntriesRepo.delete(id)
  useTimeStore.getState().removeEntry(id)
  eventBus.emit(TIME_EVENTS.ENTRY_DELETED, { id })
}

/**
 * Cross-plugin: cuando una sesión de Focus de Work se completa o se interrumpe,
 * crea un time_entry con source='focus' (no requiere proyecto).
 */
export async function recordFocusSession(payload: {
  sessionId: string
  taskId: string | null
  durationMin: number
}): Promise<void> {
  if (!payload.durationMin || payload.durationMin <= 0) return
  const end = nowISO()
  const start = new Date(Date.now() - payload.durationMin * 60_000).toISOString()
  const entry: TimeEntry = {
    id: genId('te'),
    projectId: null,
    taskId: payload.taskId,
    start,
    end,
    durationSec: payload.durationMin * 60,
    billable: false,
    source: 'focus',
    note: payload.sessionId ? `focus:${payload.sessionId}` : '',
    createdAt: nowISO(),
  }
  await timeEntriesRepo.create(entry)
  useTimeStore.getState().upsertEntry(entry)
  eventBus.emit(TIME_EVENTS.ENTRY_CREATED, { id: entry.id, source: 'focus' })
}
