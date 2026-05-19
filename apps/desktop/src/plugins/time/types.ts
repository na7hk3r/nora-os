export type TimeEntrySource = 'manual' | 'focus'

export interface TimeProject {
  id: string
  name: string
  color: string
  client: string | null
  hourlyRate: number | null
  archived: boolean
  createdAt: string
}

export interface TimeEntry {
  id: string
  projectId: string | null
  taskId: string | null
  /** ISO datetime when entry started. */
  start: string
  /** ISO datetime when entry stopped. null while running. */
  end: string | null
  /** Duration in seconds at the moment of stop. 0 while running. */
  durationSec: number
  billable: boolean
  source: TimeEntrySource
  note: string
  createdAt: string
}

export interface TimeStats {
  todaySec: number
  weekSec: number
  billableWeekSec: number
  weekRevenue: number
  activeEntryId: string | null
}

export const TIME_ENTRY_SOURCES: readonly TimeEntrySource[] = ['manual', 'focus'] as const
