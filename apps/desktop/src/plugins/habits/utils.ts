import type { HabitDefinition, HabitLog, HabitStats } from './types'

/**
 * Helpers puros del plugin Hábitos. Sin IO, sin stores. Testeables.
 */

export function genId(prefix = 'hbt'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return formatLocalDate(new Date())
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Número de semana ISO 8601 (lunes inicio). Devuelve "YYYY-Www". */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** Dado un date string ISO, devuelve la "clave de período" para agrupar. */
export function periodKey(period: 'daily' | 'weekly', dateStr: string): string {
  if (period === 'daily') return dateStr
  const d = new Date(`${dateStr}T00:00:00`)
  return isoWeekKey(d)
}

/**
 * Calcula estadísticas para un hábito dado su lista de logs.
 * Asume logs ordenados o no — esta función ordena defensivamente.
 */
export function computeStats(habit: HabitDefinition, logs: HabitLog[], today: Date = new Date()): HabitStats {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))

  // Agregar conteo por período.
  const totalsByPeriod = new Map<string, number>()
  for (const log of sorted) {
    const key = periodKey(habit.period, log.date)
    totalsByPeriod.set(key, (totalsByPeriod.get(key) ?? 0) + log.count)
  }

  const todayStr = formatLocalDate(today)
  const currentKey = periodKey(habit.period, todayStr)
  const countThisPeriod = totalsByPeriod.get(currentKey) ?? 0
  const completedThisPeriod = countThisPeriod >= habit.target

  // Streak: contar períodos consecutivos cumplidos retrocediendo desde hoy.
  // Para weekly retrocedemos por semanas; para daily, por días.
  let streak = 0
  const stepDays = habit.period === 'weekly' ? 7 : 1
  let cursor = new Date(today)
  // Si el período actual NO está cumplido todavía, el streak se mide desde el período anterior.
  if (!completedThisPeriod) {
    cursor = addDays(cursor, -stepDays)
  }
  for (;;) {
    const key = periodKey(habit.period, formatLocalDate(cursor))
    const total = totalsByPeriod.get(key) ?? 0
    if (total >= habit.target) {
      streak += 1
      cursor = addDays(cursor, -stepDays)
    } else {
      break
    }
    // Hard cap para evitar loops anómalos.
    if (streak > 3650) break
  }

  // Best streak: recorrer todos los períodos en orden y calcular máxima racha consecutiva.
  let bestStreak = 0
  if (totalsByPeriod.size > 0) {
    const keys = Array.from(totalsByPeriod.keys()).sort()
    // Helper para parsear key y obtener el "índice secuencial" en pasos de período.
    const keyToOrdinal = (k: string): number => {
      if (habit.period === 'daily') {
        const t = new Date(`${k}T00:00:00`).getTime()
        return Math.floor(t / 86400000)
      }
      // weekly key "YYYY-Www"
      const [y, w] = k.split('-W')
      return Number.parseInt(y, 10) * 53 + Number.parseInt(w, 10)
    }

    let run = 0
    let prevOrd: number | null = null
    for (const k of keys) {
      const total = totalsByPeriod.get(k) ?? 0
      const ord = keyToOrdinal(k)
      if (total >= habit.target) {
        if (prevOrd != null && ord === prevOrd + 1) {
          run += 1
        } else {
          run = 1
        }
        if (run > bestStreak) bestStreak = run
        prevOrd = ord
      } else {
        run = 0
        prevOrd = ord
      }
    }
  }

  // Rate 30d (basado en días, también para weekly se aproxima por días dentro del rango).
  let hits = 0
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i)
    const ds = formatLocalDate(d)
    const key = periodKey(habit.period, ds)
    const total = totalsByPeriod.get(key) ?? 0
    if (total >= habit.target) hits += 1
  }
  const rate30d = hits / 30

  return { streak, bestStreak, completedThisPeriod, countThisPeriod, rate30d }
}

/** Color por defecto si el usuario no eligió uno (basado en hash del nombre). */
export function fallbackColor(name: string): string {
  const palette = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#f87171', '#22d3ee', '#fb923c']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return palette[h % palette.length]
}
