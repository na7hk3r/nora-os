/**
 * Tipos del plugin Goals / OKRs.
 */

export type GoalPeriod = 'q1' | 'q2' | 'q3' | 'q4' | 'year'

export type GoalStatus = 'active' | 'completed' | 'archived'

export interface Goal {
  id: string
  title: string
  description: string | null
  period: GoalPeriod
  year: number
  status: GoalStatus
  /** Color de acento opcional (hex o tailwind token). */
  color: string | null
  createdAt: string
}

/**
 * Origen del Key Result:
 *  - `manual`: el usuario actualiza el `currentValue` a mano.
 *  - `metric:<metricId>`: lee el último valor publicado en `metricsRegistry`
 *    (ej. `metric:work.focus_hours`).
 */
export type KeyResultSource = 'manual' | `metric:${string}`

export type KeyResultDirection = 'increase' | 'decrease'

export interface KeyResult {
  id: string
  goalId: string
  name: string
  source: KeyResultSource
  /** Valor inicial (baseline). Útil cuando `direction = decrease`. */
  baseline: number
  targetValue: number
  /** Cache del último valor calculado. Para `manual` es la fuente de verdad. */
  currentValue: number
  unit: string | null
  direction: KeyResultDirection
  createdAt: string
}

export interface GoalMilestone {
  id: string
  krId: string
  value: number
  achievedAt: string
  note: string | null
}

export interface KeyResultProgress {
  /** 0..1 normalizado. 1 = cumplido. */
  ratio: number
  /** Porcentaje 0..100. */
  percent: number
  done: boolean
}

export interface GoalProgress {
  goalId: string
  /** Promedio de los KRs (0..1). */
  ratio: number
  percent: number
  /** Cuántos KRs están en 100%. */
  completedKRs: number
  totalKRs: number
}
