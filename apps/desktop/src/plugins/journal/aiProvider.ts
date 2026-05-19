/**
 * Provider de contexto IA del Journal.
 *
 * Expone solo agregados (mood promedio últimos 7 días, frecuencia, tags top).
 * NO expone contenido bruto de las entradas (privacidad).
 */

import type { AIContextProvider } from '@core/services/aiContextRegistry'
import { useJournalStore } from './store'
import { todayISO, formatLocalDate } from './utils'

interface JournalAISlice {
  totalEntries: number
  last7Days: number
  moodAvg7d: number | null
  topTags: string[]
  wroteToday: boolean
}

export const journalAIProvider: AIContextProvider<JournalAISlice> = {
  id: 'journal',
  async collect() {
    const entries = useJournalStore.getState().entries
    if (entries.length === 0) return undefined

    const today = todayISO()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7)
    const cutoff = formatLocalDate(cutoffDate)

    const last7 = entries.filter((e) => e.date >= cutoff)
    const moods = last7.map((e) => e.mood).filter((m): m is number => m != null)
    const moodAvg7d = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null

    const tagFreq = new Map<string, number>()
    for (const e of last7) {
      for (const t of e.tags) {
        tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1)
      }
    }
    const topTags = Array.from(tagFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t)

    return {
      totalEntries: entries.length,
      last7Days: last7.length,
      moodAvg7d,
      topTags,
      wroteToday: entries.some((e) => e.date === today),
    }
  },
  render(slice) {
    const lines: string[] = []
    lines.push(`Journal: ${slice.last7Days} entradas en 7 días${slice.wroteToday ? ' (incluye hoy)' : ''}.`)
    if (slice.moodAvg7d != null) {
      lines.push(`Mood promedio 7d: ${slice.moodAvg7d.toFixed(1)}/5.`)
    }
    if (slice.topTags.length > 0) {
      lines.push(`Tags frecuentes: ${slice.topTags.join(', ')}.`)
    }
    return lines
  },
}
