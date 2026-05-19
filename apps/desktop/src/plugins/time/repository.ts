import { defineRepository } from '@core/storage/Repository'
import type { TimeEntry, TimeEntrySource, TimeProject } from './types'
import { TIME_ENTRY_SOURCES } from './types'

interface ProjectRow extends Record<string, unknown> {
  id: string
  name: string
  color: string
  client: string | null
  hourly_rate: number | null
  archived: number
  created_at: string
}

interface EntryRow extends Record<string, unknown> {
  id: string
  project_id: string | null
  task_id: string | null
  start: string
  end: string | null
  duration_sec: number
  billable: number
  source: string
  note: string | null
  created_at: string
}

export const timeProjectsRepo = defineRepository<TimeProject, ProjectRow>({
  table: 'time_projects',
  mapRow: (row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    client: row.client ?? null,
    hourlyRate: row.hourly_rate ?? null,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
  }),
  toRow: (entity) => ({
    id: entity.id,
    name: entity.name,
    color: entity.color,
    client: entity.client,
    hourly_rate: entity.hourlyRate,
    archived: entity.archived ? 1 : 0,
    created_at: entity.createdAt,
  }),
})

export const timeEntriesRepo = defineRepository<TimeEntry, EntryRow>({
  table: 'time_entries',
  mapRow: (row) => ({
    id: row.id,
    projectId: row.project_id ?? null,
    taskId: row.task_id ?? null,
    start: row.start,
    end: row.end ?? null,
    durationSec: Number(row.duration_sec ?? 0),
    billable: Boolean(row.billable),
    source: (TIME_ENTRY_SOURCES.includes(row.source as TimeEntrySource)
      ? row.source
      : 'manual') as TimeEntrySource,
    note: row.note ?? '',
    createdAt: row.created_at,
  }),
  toRow: (entity) => ({
    id: entity.id,
    project_id: entity.projectId,
    task_id: entity.taskId,
    start: entity.start,
    end: entity.end,
    duration_sec: entity.durationSec,
    billable: entity.billable ? 1 : 0,
    source: entity.source,
    note: entity.note,
    created_at: entity.createdAt,
  }),
})
