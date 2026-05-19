/**
 * Proveedor de contexto IA para el plugin Hábitos.
 *
 * Expone hábitos activos + racha + tasa 30d para que el snapshot incluya
 * señales de constancia / abandono. Se queda fuera la lista de logs crudos
 * por privacidad y por costo de tokens.
 */

import type { AIContextProvider } from '@core/services/aiContextRegistry'
import { useHabitsStore } from './store'
import { computeStats } from './utils'

interface HabitsAISlice {
  total: number
  todayCompleted: number
  topStreaks: Array<{ name: string; streak: number; rate30d: number }>
  atRisk: Array<{ name: string; streak: number }>
}

export const habitsAIProvider: AIContextProvider<HabitsAISlice> = {
  id: 'habits',
  async collect() {
    const { habits, logs } = useHabitsStore.getState()
    const active = habits.filter((h) => !h.archived)
    if (active.length === 0) return undefined

    let todayCompleted = 0
    const stats = active.map((h) => {
      const habitLogs = logs.filter((l) => l.habitId === h.id)
      const s = computeStats(h, habitLogs)
      if (s.completedThisPeriod) todayCompleted += 1
      return { habit: h, stats: s }
    })

    const topStreaks = stats
      .filter((s) => s.stats.streak >= 3)
      .sort((a, b) => b.stats.streak - a.stats.streak)
      .slice(0, 3)
      .map((s) => ({ name: s.habit.name, streak: s.stats.streak, rate30d: s.stats.rate30d }))

    // En riesgo: tenían racha >= 5 y todavía no cumplido el período actual.
    const atRisk = stats
      .filter((s) => !s.stats.completedThisPeriod && s.stats.streak >= 5)
      .map((s) => ({ name: s.habit.name, streak: s.stats.streak }))

    return {
      total: active.length,
      todayCompleted,
      topStreaks,
      atRisk,
    }
  },
  render(slice) {
    const lines: string[] = []
    lines.push(`Hábitos: ${slice.todayCompleted}/${slice.total} cumplidos hoy.`)
    if (slice.topStreaks.length > 0) {
      const list = slice.topStreaks.map((s) => `${s.name} (${s.streak}d)`).join(', ')
      lines.push(`Rachas: ${list}.`)
    }
    if (slice.atRisk.length > 0) {
      const list = slice.atRisk.map((s) => `${s.name} (${s.streak}d)`).join(', ')
      lines.push(`En riesgo: ${list}.`)
    }
    return lines
  },
}
