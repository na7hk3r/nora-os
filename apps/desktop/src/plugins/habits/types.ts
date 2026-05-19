/**
 * Tipos del plugin Hábitos.
 *
 * Filosofía:
 *  - Un hábito = una acción concreta repetible. No "objetivo de vida".
 *  - kind = positive (querés hacerlo) o negative (querés evitarlo).
 *  - period = daily o weekly. Sin cron, sin recurrencias complejas.
 *  - target = cuántas veces por período. Default 1.
 */

export type HabitKind = 'positive' | 'negative'
export type HabitPeriod = 'daily' | 'weekly'

export interface HabitDefinition {
  id: string
  name: string
  icon: string | null
  color: string | null
  kind: HabitKind
  period: HabitPeriod
  /** Cantidad mínima por período para considerarlo "cumplido". */
  target: number
  archived: boolean
  createdAt: string
}

export interface HabitLog {
  id: string
  habitId: string
  /** YYYY-MM-DD. */
  date: string
  /** Cantidad de veces realizada en esa fecha. Default 1. */
  count: number
  note: string | null
  createdAt: string
}

export interface HabitStats {
  /** Días consecutivos cumplidos (incluye hoy si está cumplido). */
  streak: number
  /** Mejor racha histórica. */
  bestStreak: number
  /** Cumplido en el período actual. */
  completedThisPeriod: boolean
  /** Conteo del período actual. */
  countThisPeriod: number
  /** % de cumplimiento últimos 30 días (0..1). */
  rate30d: number
}
