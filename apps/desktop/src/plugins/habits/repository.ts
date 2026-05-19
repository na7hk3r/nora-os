/**
 * Repositorios del plugin Habits sobre la capa Repository del core.
 */

import { defineRepository } from '@core/storage/Repository'
import type { HabitDefinition, HabitLog } from './types'

interface HabitDefinitionRow extends Record<string, unknown> {
  id: string
  name: string
  icon: string | null
  color: string | null
  kind: string
  period: string
  target: number
  archived: number
  created_at: string
}

interface HabitLogRow extends Record<string, unknown> {
  id: string
  habit_id: string
  date: string
  count: number
  note: string | null
  created_at: string
}

export const habitDefinitionsRepo = defineRepository<HabitDefinition, HabitDefinitionRow>({
  table: 'habits_definitions',
  mapRow: (row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon ?? '',
    color: row.color ?? '',
    kind: (row.kind === 'negative' ? 'negative' : 'positive'),
    period: (row.period === 'weekly' ? 'weekly' : 'daily'),
    target: Number(row.target ?? 1),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<HabitDefinitionRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.name !== undefined) row.name = entity.name
    if (entity.icon !== undefined) row.icon = entity.icon
    if (entity.color !== undefined) row.color = entity.color
    if (entity.kind !== undefined) row.kind = entity.kind
    if (entity.period !== undefined) row.period = entity.period
    if (entity.target !== undefined) row.target = entity.target
    if (entity.archived !== undefined) row.archived = entity.archived ? 1 : 0
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})

export const habitLogsRepo = defineRepository<HabitLog, HabitLogRow>({
  table: 'habits_logs',
  mapRow: (row) => ({
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    count: Number(row.count ?? 1),
    note: row.note ?? '',
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<HabitLogRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.habitId !== undefined) row.habit_id = entity.habitId
    if (entity.date !== undefined) row.date = entity.date
    if (entity.count !== undefined) row.count = entity.count
    if (entity.note !== undefined) row.note = entity.note
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})
