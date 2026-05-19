/**
 * Centralized date utility functions
 * Used across MainDayTasks, systemGuidance, and other components
 */

import type { EventLogEntry } from '@core/types'

const ONE_DAY_MS = 86_400_000
const THREE_DAYS_MS = ONE_DAY_MS * 3

/**
 * Calculate milliseconds elapsed since an event was created
 */
export function getElapsedMs(entry: EventLogEntry | undefined): number | null {
  if (!entry) return null
  return Date.now() - new Date(entry.created_at).getTime()
}

/**
 * Get start of today at 00:00:00
 */
export function getStartOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Get end of today at 23:59:59
 */
export function getEndOfToday(): Date {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

/**
 * Check if due date has passed today
 */
export function isDueDateOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const t = new Date(dueDate).getTime()
  if (isNaN(t)) return false
  return t < getStartOfToday().getTime()
}

/**
 * Check if due date is today
 */
export function isDueDateToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  const t = new Date(dueDate).getTime()
  if (isNaN(t)) return false
  const start = getStartOfToday().getTime()
  const end = getEndOfToday().getTime()
  return t >= start && t <= end
}

/**
 * Format due date in human-readable format for task display
 * Returns null if no date or date is invalid
 * Examples: "Vence hace 2d", "Vence hoy", "Vence mañana", "Vence en 3d"
 */
export function formatDueDate(dueDate: string | null): string | null {
  if (!dueDate) return null
  const t = new Date(dueDate).getTime()
  if (isNaN(t)) return null

  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diff = Math.floor((t - start) / ONE_DAY_MS)

  if (diff < 0) return `Vence hace ${Math.abs(diff)}d`
  if (diff === 0) return 'Vence hoy'
  if (diff === 1) return 'Vence mañana'
  return `Vence en ${diff}d`
}

/**
 * Check if event log entry matches any of the provided event types
 */
export function hasEventType(eventType: string, eventSet: Set<string>): boolean {
  return eventSet.has(eventType)
}

/**
 * Find the most recent event matching the provided types
 */
export function findMostRecentEvent(
  events: EventLogEntry[],
  eventTypes: Set<string>,
): EventLogEntry | undefined {
  return events.find((e) => hasEventType(e.event_type, eventTypes))
}

/**
 * Constants for common event type sets
 */
export const COMMON_EVENT_SETS = {
  WEIGHT: new Set(['WEIGHT_RECORDED', 'FITNESS_WEIGHT_RECORDED']),
  TASK_CREATED: new Set(['TASK_CREATED', 'WORK_TASK_CREATED']),
  TASK_COMPLETED: new Set(['TASK_COMPLETED', 'WORK_TASK_COMPLETED']),
  DAILY_ENTRY: new Set(['DAILY_ENTRY_SAVED', 'FITNESS_DAILY_ENTRY_SAVED']),
}
