/**
 * Proveedor de contexto IA del plugin Goals.
 *
 * Expone los objetivos activos del trimestre actual con su % de avance
 * agregado, para que el copiloto pueda responder "¿cómo voy con mis OKRs?".
 */

import type { AIContextProvider } from '@core/services/aiContextRegistry'
import { useGoalsStore } from './store'
import { computeGoalProgress, currentQuarter, formatPeriod } from './utils'

interface GoalsAISlice {
  totalActive: number
  current: Array<{ title: string; period: string; percent: number; krs: number; doneKRs: number }>
  atRisk: Array<{ title: string; percent: number }>
}

export const goalsAIProvider: AIContextProvider<GoalsAISlice> = {
  id: 'goals',
  async collect() {
    const { goals, keyResults } = useGoalsStore.getState()
    const active = goals.filter((g) => g.status === 'active')
    if (active.length === 0) return undefined

    const year = new Date().getFullYear()
    const period = currentQuarter()

    const current = active
      .filter((g) => g.year === year && (g.period === period || g.period === 'year'))
      .map((g) => {
        const p = computeGoalProgress(g, keyResults)
        return {
          title: g.title,
          period: formatPeriod(g.period, g.year),
          percent: p.percent,
          krs: p.totalKRs,
          doneKRs: p.completedKRs,
        }
      })

    // En riesgo: avance < 50% y estamos en la segunda mitad del trimestre.
    const monthInQuarter = new Date().getMonth() % 3 // 0,1,2
    const lateInQuarter = monthInQuarter >= 2
    const atRisk = lateInQuarter
      ? current.filter((g) => g.percent < 50).map((g) => ({ title: g.title, percent: g.percent }))
      : []

    return {
      totalActive: active.length,
      current,
      atRisk,
    }
  },
  render(slice) {
    const lines: string[] = []
    lines.push(`Objetivos activos: ${slice.totalActive}.`)
    if (slice.current.length > 0) {
      const list = slice.current
        .map((g) => `${g.title} (${g.period}): ${g.percent}% [${g.doneKRs}/${g.krs} KRs]`)
        .join('; ')
      lines.push(`En curso: ${list}.`)
    }
    if (slice.atRisk.length > 0) {
      const list = slice.atRisk.map((g) => `${g.title} (${g.percent}%)`).join(', ')
      lines.push(`En riesgo: ${list}.`)
    }
    return lines
  },
}
