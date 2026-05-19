/**
 * Repositorios del plugin Goals.
 */

import { defineRepository } from '@core/storage/Repository'
import type { Goal, KeyResult, GoalMilestone, GoalPeriod, GoalStatus, KeyResultSource, KeyResultDirection } from './types'

interface GoalRow extends Record<string, unknown> {
  id: string
  title: string
  description: string | null
  period: string
  year: number
  status: string
  color: string | null
  created_at: string
}

interface KeyResultRow extends Record<string, unknown> {
  id: string
  goal_id: string
  name: string
  source: string
  baseline: number
  target_value: number
  current_value: number
  unit: string | null
  direction: string
  created_at: string
}

interface MilestoneRow extends Record<string, unknown> {
  id: string
  kr_id: string
  value: number
  achieved_at: string
  note: string | null
}

const VALID_PERIODS: GoalPeriod[] = ['q1', 'q2', 'q3', 'q4', 'year']
const VALID_STATUS: GoalStatus[] = ['active', 'completed', 'archived']

function coercePeriod(p: string): GoalPeriod {
  return VALID_PERIODS.includes(p as GoalPeriod) ? (p as GoalPeriod) : 'q1'
}
function coerceStatus(s: string): GoalStatus {
  return VALID_STATUS.includes(s as GoalStatus) ? (s as GoalStatus) : 'active'
}
function coerceSource(s: string): KeyResultSource {
  if (s === 'manual') return 'manual'
  if (s.startsWith('metric:')) return s as KeyResultSource
  return 'manual'
}
function coerceDirection(d: string): KeyResultDirection {
  return d === 'decrease' ? 'decrease' : 'increase'
}

export const goalsRepo = defineRepository<Goal, GoalRow>({
  table: 'goals_objectives',
  mapRow: (row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    period: coercePeriod(row.period),
    year: Number(row.year),
    status: coerceStatus(row.status),
    color: row.color ?? null,
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<GoalRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.title !== undefined) row.title = entity.title
    if (entity.description !== undefined) row.description = entity.description
    if (entity.period !== undefined) row.period = entity.period
    if (entity.year !== undefined) row.year = entity.year
    if (entity.status !== undefined) row.status = entity.status
    if (entity.color !== undefined) row.color = entity.color
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})

export const keyResultsRepo = defineRepository<KeyResult, KeyResultRow>({
  table: 'goals_key_results',
  mapRow: (row) => ({
    id: row.id,
    goalId: row.goal_id,
    name: row.name,
    source: coerceSource(row.source),
    baseline: Number(row.baseline ?? 0),
    targetValue: Number(row.target_value ?? 1),
    currentValue: Number(row.current_value ?? 0),
    unit: row.unit ?? null,
    direction: coerceDirection(row.direction),
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<KeyResultRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.goalId !== undefined) row.goal_id = entity.goalId
    if (entity.name !== undefined) row.name = entity.name
    if (entity.source !== undefined) row.source = entity.source
    if (entity.baseline !== undefined) row.baseline = entity.baseline
    if (entity.targetValue !== undefined) row.target_value = entity.targetValue
    if (entity.currentValue !== undefined) row.current_value = entity.currentValue
    if (entity.unit !== undefined) row.unit = entity.unit
    if (entity.direction !== undefined) row.direction = entity.direction
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})

export const milestonesRepo = defineRepository<GoalMilestone, MilestoneRow>({
  table: 'goals_milestones',
  mapRow: (row) => ({
    id: row.id,
    krId: row.kr_id,
    value: Number(row.value),
    achievedAt: row.achieved_at,
    note: row.note ?? null,
  }),
  toRow: (entity) => {
    const row: Partial<MilestoneRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.krId !== undefined) row.kr_id = entity.krId
    if (entity.value !== undefined) row.value = entity.value
    if (entity.achievedAt !== undefined) row.achieved_at = entity.achievedAt
    if (entity.note !== undefined) row.note = entity.note
    return row
  },
})
