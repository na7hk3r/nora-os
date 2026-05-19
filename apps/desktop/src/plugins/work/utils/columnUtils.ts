/**
 * Centralized column utility functions for Kanban boards
 * Used in MainDayTasks, WorkSummaryWidget, and KanbanBoard
 */

import type { Column } from '@plugins/work/types'

/**
 * Check if column name matches pattern (case-insensitive)
 */
function isColumnMatch(name: string, pattern: RegExp): boolean {
  return pattern.test(name.toLowerCase())
}

/**
 * Check if column is a "Done" column.
 * Prioriza el flag explícito `isDone`; si no está, usa heurística por id/nombre
 * (compatibilidad hacia atrás antes de la migración v8).
 */
export function isDoneColumn(col: Column): boolean {
  if (col.isDone) return true
  return col.id === 'col-done' || isColumnMatch(col.name, /hecho|done|completad/)
}

/**
 * Check if column is an "In Progress" column
 */
export function isInProgressColumn(col: Column): boolean {
  return col.id === 'col-progress' || isColumnMatch(col.name, /progreso|progress/)
}

/**
 * Check if column is a "To Do" column
 */
export function isTodoColumn(col: Column): boolean {
  return col.id === 'col-todo' || isColumnMatch(col.name, /hacer|todo/)
}

/**
 * Check if column is a "Backlog" column
 */
export function isBacklogColumn(col: Column): boolean {
  return col.id === 'col-backlog' || isColumnMatch(col.name, /backlog|idea/)
}

/**
 * Helper to get all columns matching a predicate
 */
export function filterColumns(
  columns: Column[],
  predicate: (col: Column) => boolean,
): Column[] {
  return columns.filter(predicate)
}

/**
 * Helper to get IDs of columns matching a predicate
 */
export function getColumnIds(
  columns: Column[],
  predicate: (col: Column) => boolean,
): Set<string> {
  return new Set(filterColumns(columns, predicate).map((c) => c.id))
}
