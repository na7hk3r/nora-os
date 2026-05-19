/**
 * Operaciones del plugin Goals.
 *  - Persisten en SQLite vía repositorios tipados.
 *  - Actualizan el store Zustand.
 *  - Emiten eventos vía eventBus (con persist=true).
 *  - Sincronizan currentValue de KRs `metric:*` desde metricsRegistry.
 */

import { eventBus } from '@core/events/EventBus'
import { getMetricValue } from '@core/services/metricsRegistry'
import { useGoalsStore } from './store'
import { GOALS_EVENTS } from './events'
import { genId, computeKRProgress, currentQuarter, metricIdOf } from './utils'
import { goalsRepo, keyResultsRepo, milestonesRepo } from './repository'
import type {
  Goal,
  GoalPeriod,
  KeyResult,
  KeyResultDirection,
  KeyResultSource,
} from './types'

// ─── Goals CRUD ──────────────────────────────────────────────────────

export interface CreateGoalInput {
  title: string
  description?: string | null
  period?: GoalPeriod
  year?: number
  color?: string | null
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const title = input.title.trim()
  if (!title) throw new Error('goal title required')
  const draft: Goal = {
    id: genId('gol'),
    title,
    description: input.description?.trim() || null,
    period: input.period ?? currentQuarter(),
    year: input.year ?? new Date().getFullYear(),
    status: 'active',
    color: input.color ?? null,
    createdAt: new Date().toISOString(),
  }
  const goal = await goalsRepo.create(draft)
  useGoalsStore.getState().upsertGoal(goal)
  eventBus.emit(GOALS_EVENTS.GOAL_CREATED, { id: goal.id, title: goal.title }, { source: 'goals', persist: true })
  return goal
}

export async function updateGoal(
  id: string,
  patch: Partial<Pick<Goal, 'title' | 'description' | 'period' | 'year' | 'color' | 'status'>>,
): Promise<void> {
  const existing = useGoalsStore.getState().goals.find((g) => g.id === id)
  if (!existing) return
  const updated = await goalsRepo.update(id, patch)
  if (updated) useGoalsStore.getState().upsertGoal(updated)
  eventBus.emit(GOALS_EVENTS.GOAL_UPDATED, { id }, { source: 'goals', persist: true })
}

export async function archiveGoal(id: string): Promise<void> {
  await updateGoal(id, { status: 'archived' })
  eventBus.emit(GOALS_EVENTS.GOAL_ARCHIVED, { id }, { source: 'goals', persist: true })
}

export async function deleteGoal(id: string): Promise<void> {
  const krIds = useGoalsStore.getState().keyResults.filter((k) => k.goalId === id).map((k) => k.id)
  if (krIds.length > 0) {
    await milestonesRepo.deleteWhere([{ column: 'kr_id', op: 'IN', value: krIds }])
  }
  await keyResultsRepo.deleteWhere([{ column: 'goal_id', op: '=', value: id }])
  await goalsRepo.delete(id)
  useGoalsStore.getState().removeGoal(id)
  eventBus.emit(GOALS_EVENTS.GOAL_ARCHIVED, { id, deleted: true }, { source: 'goals', persist: true })
}

// ─── Key Results CRUD ────────────────────────────────────────────────

export interface CreateKeyResultInput {
  goalId: string
  name: string
  source?: KeyResultSource
  baseline?: number
  targetValue: number
  currentValue?: number
  unit?: string | null
  direction?: KeyResultDirection
}

export async function createKeyResult(input: CreateKeyResultInput): Promise<KeyResult> {
  const goal = useGoalsStore.getState().goals.find((g) => g.id === input.goalId)
  if (!goal) throw new Error('goal not found')
  const name = input.name.trim()
  if (!name) throw new Error('key result name required')

  const source = input.source ?? 'manual'
  const baseline = Number.isFinite(input.baseline) ? Number(input.baseline) : 0
  const direction = input.direction ?? 'increase'

  // Si el source es métrica, sembramos current con el valor publicado.
  let currentValue = input.currentValue ?? baseline
  const mid = metricIdOf(source)
  if (mid) currentValue = getMetricValue(mid, currentValue)

  const draft: KeyResult = {
    id: genId('krs'),
    goalId: goal.id,
    name,
    source,
    baseline,
    targetValue: Number(input.targetValue),
    currentValue,
    unit: input.unit?.trim() || null,
    direction,
    createdAt: new Date().toISOString(),
  }
  const kr = await keyResultsRepo.create(draft)
  useGoalsStore.getState().upsertKeyResult(kr)
  eventBus.emit(GOALS_EVENTS.KR_CREATED, { id: kr.id, goalId: kr.goalId }, { source: 'goals', persist: true })
  return kr
}

export async function updateKeyResult(
  id: string,
  patch: Partial<Pick<KeyResult, 'name' | 'source' | 'baseline' | 'targetValue' | 'currentValue' | 'unit' | 'direction'>>,
): Promise<void> {
  const existing = useGoalsStore.getState().keyResults.find((k) => k.id === id)
  if (!existing) return
  const updated = await keyResultsRepo.update(id, patch)
  if (updated) useGoalsStore.getState().upsertKeyResult(updated)
  eventBus.emit(GOALS_EVENTS.KR_UPDATED, { id }, { source: 'goals', persist: true })
  await maybeFireCompletion(id)
}

export async function deleteKeyResult(id: string): Promise<void> {
  await milestonesRepo.deleteWhere([{ column: 'kr_id', op: '=', value: id }])
  await keyResultsRepo.delete(id)
  useGoalsStore.getState().removeKeyResult(id)
  eventBus.emit(GOALS_EVENTS.KR_DELETED, { id }, { source: 'goals', persist: true })
}

/**
 * Setea el `currentValue` de un KR (para sources `manual`) y agrega
 * un milestone si el valor cambió. Emite KR_PROGRESS y, si llegó al
 * target, KR_COMPLETED + bonus de gamificación.
 */
export async function setKRValue(id: string, value: number, note?: string): Promise<void> {
  const existing = useGoalsStore.getState().keyResults.find((k) => k.id === id)
  if (!existing) return
  if (!Number.isFinite(value)) return
  if (existing.currentValue === value) return

  const updated = await keyResultsRepo.update(id, { currentValue: value })
  if (updated) useGoalsStore.getState().upsertKeyResult(updated)

  const milestone = {
    id: genId('mil'),
    krId: id,
    value,
    achievedAt: new Date().toISOString(),
    note: note?.trim() || null,
  }
  await milestonesRepo.create(milestone)
  useGoalsStore.getState().upsertMilestone(milestone)

  eventBus.emit(GOALS_EVENTS.KR_PROGRESS, { id, value }, { source: 'goals', persist: true })
  eventBus.emit(GOALS_EVENTS.MILESTONE_ADDED, { id: milestone.id, krId: id, value }, { source: 'goals', persist: true })

  await maybeFireCompletion(id)
}

/**
 * Sincroniza el currentValue de todos los KRs con source `metric:*`
 * desde el metricsRegistry. Llamado al iniciar el plugin y en cada
 * cambio de métrica.
 */
export async function syncMetricBackedKRs(changedMetricId?: string): Promise<void> {
  const krs = useGoalsStore.getState().keyResults
  for (const kr of krs) {
    const mid = metricIdOf(kr.source)
    if (!mid) continue
    if (changedMetricId && mid !== changedMetricId) continue
    const value = getMetricValue(mid, kr.currentValue)
    if (value === kr.currentValue) continue
    const updated = await keyResultsRepo.update(kr.id, { currentValue: value })
    if (updated) useGoalsStore.getState().upsertKeyResult(updated)
    eventBus.emit(GOALS_EVENTS.KR_PROGRESS, { id: kr.id, value }, { source: 'goals', persist: true })
    await maybeFireCompletion(kr.id)
  }
}

async function maybeFireCompletion(krId: string): Promise<void> {
  const kr = useGoalsStore.getState().keyResults.find((k) => k.id === krId)
  if (!kr) return
  const progress = computeKRProgress(kr)
  if (!progress.done) return
  eventBus.emit(GOALS_EVENTS.KR_COMPLETED, { id: kr.id, goalId: kr.goalId }, { source: 'goals', persist: true })

  // Si todos los KRs del goal están done, marcamos el goal como completed.
  const state = useGoalsStore.getState()
  const goal = state.goals.find((g) => g.id === kr.goalId)
  if (!goal || goal.status === 'completed') return
  const siblings = state.keyResults.filter((k) => k.goalId === kr.goalId)
  const allDone = siblings.length > 0 && siblings.every((k) => computeKRProgress(k).done)
  if (allDone) {
    const updated = await goalsRepo.update(goal.id, { status: 'completed' })
    if (updated) state.upsertGoal(updated)
    eventBus.emit(GOALS_EVENTS.GOAL_COMPLETED, { id: goal.id, title: goal.title }, { source: 'goals', persist: true })
  }
}
