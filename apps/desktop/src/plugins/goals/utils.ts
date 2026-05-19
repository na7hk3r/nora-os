/**
 * Helpers puros del plugin Goals (sin IO).
 */

import type { Goal, GoalPeriod, KeyResult, KeyResultProgress, GoalProgress } from './types'

export function genId(prefix = 'gol'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

const PERIOD_LABEL: Record<GoalPeriod, string> = {
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
  year: 'Año',
}

export function formatPeriod(period: GoalPeriod, year: number): string {
  return `${PERIOD_LABEL[period]} ${year}`
}

export function currentQuarter(date = new Date()): GoalPeriod {
  const m = date.getMonth() // 0..11
  if (m < 3) return 'q1'
  if (m < 6) return 'q2'
  if (m < 9) return 'q3'
  return 'q4'
}

/**
 * Calcula progreso de un KR.
 *  - `increase`: ratio = (current - baseline) / (target - baseline)
 *  - `decrease`: ratio = (baseline - current) / (baseline - target)
 * Clampea a [0,1]. Si los rangos son inválidos (target == baseline), 0.
 */
export function computeKRProgress(kr: KeyResult): KeyResultProgress {
  const range = kr.direction === 'increase'
    ? kr.targetValue - kr.baseline
    : kr.baseline - kr.targetValue
  if (range <= 0) {
    const done = kr.direction === 'increase'
      ? kr.currentValue >= kr.targetValue
      : kr.currentValue <= kr.targetValue
    return { ratio: done ? 1 : 0, percent: done ? 100 : 0, done }
  }
  const delta = kr.direction === 'increase'
    ? kr.currentValue - kr.baseline
    : kr.baseline - kr.currentValue
  const ratio = Math.max(0, Math.min(1, delta / range))
  return { ratio, percent: Math.round(ratio * 100), done: ratio >= 1 }
}

export function computeGoalProgress(goal: Goal, krs: KeyResult[]): GoalProgress {
  const own = krs.filter((k) => k.goalId === goal.id)
  if (own.length === 0) {
    return { goalId: goal.id, ratio: 0, percent: 0, completedKRs: 0, totalKRs: 0 }
  }
  let sum = 0
  let completed = 0
  for (const kr of own) {
    const p = computeKRProgress(kr)
    sum += p.ratio
    if (p.done) completed += 1
  }
  const ratio = sum / own.length
  return {
    goalId: goal.id,
    ratio,
    percent: Math.round(ratio * 100),
    completedKRs: completed,
    totalKRs: own.length,
  }
}

/** Extrae el `metricId` del source `metric:<id>`, o null si es manual. */
export function metricIdOf(source: KeyResult['source']): string | null {
  if (source.startsWith('metric:')) return source.slice('metric:'.length)
  return null
}
