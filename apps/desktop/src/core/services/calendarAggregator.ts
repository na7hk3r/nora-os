import { storageAPI } from '@core/storage/StorageAPI'

export type CalendarSource = 'planner' | 'work' | 'fitness' | 'focus'

export interface CalendarEvent {
  id: string
  title: string
  source: CalendarSource
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  meta?: Record<string, unknown>
  ctaPath?: string
}

interface PlannerTask {
  id: string
  title: string
  date: string
  category?: string
  complexity?: string
  completed?: boolean
}

interface WorkCard { id: string; title: string; due_date: string | null; archived: number; column_id: string }
interface FitnessRow { date: string; weight: number | null; workout: string | null }
interface FocusRow { id: string; start_time: number; end_time: number | null; duration: number | null }

function toDateOnly(iso: string): string { return iso.slice(0, 10) }

async function tableExists(table: string): Promise<boolean> {
  const rows = await storageAPI.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [table],
  ) as { name: string }[]
  return rows.length > 0
}

async function plannerEvents(): Promise<CalendarEvent[]> {
  const rows = await storageAPI.query<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'corePlannerTasksV1'",
  )
  if (!rows[0]) return []
  try {
    const tasks = JSON.parse(rows[0].value) as PlannerTask[]
    return tasks.map((t) => ({
      id: `planner:${t.id}`,
      title: `${t.completed ? '✓ ' : ''}${t.title}`,
      source: 'planner' as const,
      date: t.date,
      meta: { completed: !!t.completed, category: t.category },
      ctaPath: '/planner',
    }))
  } catch {
    return []
  }
}

async function workEvents(): Promise<CalendarEvent[]> {
  if (!(await tableExists('work_cards'))) return []
  const cards = await storageAPI.query<WorkCard>(
    'SELECT id, title, due_date, archived, column_id FROM work_cards WHERE due_date IS NOT NULL AND archived = 0',
  )
  return cards.map((c) => ({
    id: `work:${c.id}`,
    title: c.title,
    source: 'work' as const,
    date: toDateOnly(c.due_date as string),
    meta: { columnId: c.column_id },
    ctaPath: '/work',
  }))
}

async function fitnessEvents(): Promise<CalendarEvent[]> {
  if (!(await tableExists('fitness_daily_entries'))) return []
  const rows = await storageAPI.query<FitnessRow>(
    "SELECT date, weight, workout FROM fitness_daily_entries WHERE workout IS NOT NULL AND TRIM(workout) <> ''",
  )
  return rows.map((r) => ({
    id: `fitness:${r.date}`,
    title: `Entreno: ${r.workout}`,
    source: 'fitness' as const,
    date: r.date,
    meta: { weight: r.weight },
    ctaPath: '/fitness',
  }))
}

async function focusEvents(): Promise<CalendarEvent[]> {
  if (!(await tableExists('work_focus_sessions'))) return []
  const rows = await storageAPI.query<FocusRow>(
    'SELECT id, start_time, end_time, duration FROM work_focus_sessions WHERE end_time IS NOT NULL ORDER BY start_time DESC LIMIT 200',
  )
  return rows.map((r) => {
    const d = new Date(r.start_time)
    const minutes = Math.round((r.duration ?? 0) / 60_000)
    return {
      id: `focus:${r.id}`,
      title: `Foco ${minutes}min`,
      source: 'focus' as const,
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
      meta: { duration: r.duration },
      ctaPath: '/work',
    }
  })
}

export const calendarAggregator = {
  async getRange(from: string, to: string, sources?: CalendarSource[]): Promise<CalendarEvent[]> {
    const allowed = new Set<CalendarSource>(sources ?? ['planner', 'work', 'fitness', 'focus'])
    const buckets = await Promise.all([
      allowed.has('planner') ? plannerEvents() : Promise.resolve([]),
      allowed.has('work') ? workEvents() : Promise.resolve([]),
      allowed.has('fitness') ? fitnessEvents() : Promise.resolve([]),
      allowed.has('focus') ? focusEvents() : Promise.resolve([]),
    ])
    const all = buckets.flat().filter((e) => e.date >= from && e.date <= to)
    all.sort((a, b) => (a.date === b.date ? (a.time ?? '').localeCompare(b.time ?? '') : a.date.localeCompare(b.date)))
    return all
  },
}
