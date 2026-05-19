/**
 * Proveedor de contexto IA para el plugin Knowledge.
 *
 * Aporta señales de qué está aprendiendo el usuario, qué le falta repasar
 * y cuándo fue su última sesión de estudio.
 */

import type { AIContextProvider } from '@core/services/aiContextRegistry'
import { useKnowledgeStore } from './store'
import { dueFlashcards, isMastered, todayISO } from './utils'

interface KnowledgeAISlice {
  inProgress: Array<{ title: string; type: string; progress: number }>
  finishedThisMonth: number
  totalHighlights: number
  flashcardsDue: number
  flashcardsMastered: number
  daysSinceLastReview: number | null
}

export const knowledgeAIProvider: AIContextProvider<KnowledgeAISlice> = {
  id: 'knowledge',
  async collect() {
    const { resources, highlights, flashcards, reviews } = useKnowledgeStore.getState()

    if (
      resources.length === 0 &&
      flashcards.length === 0 &&
      highlights.length === 0
    ) {
      return undefined
    }

    const inProgress = resources
      .filter((r) => r.status === 'in_progress')
      .slice(0, 5)
      .map((r) => ({ title: r.title, type: r.type, progress: r.progress }))

    const today = todayISO()
    const monthPrefix = today.slice(0, 7)
    const finishedThisMonth = resources.filter(
      (r) => r.status === 'finished' && (r.finishedAt ?? '').startsWith(monthPrefix),
    ).length

    const due = dueFlashcards(flashcards)
    const mastered = flashcards.filter(isMastered).length

    let daysSinceLastReview: number | null = null
    if (reviews.length > 0) {
      const last = reviews
        .map((r) => r.reviewedAt)
        .sort()
        .at(-1)!
      const lastDate = new Date(last)
      const diff = Math.max(0, Math.floor((Date.now() - lastDate.getTime()) / 86_400_000))
      daysSinceLastReview = diff
    }

    return {
      inProgress,
      finishedThisMonth,
      totalHighlights: highlights.length,
      flashcardsDue: due.length,
      flashcardsMastered: mastered,
      daysSinceLastReview,
    }
  },
  render(slice) {
    const lines: string[] = []
    if (slice.inProgress.length > 0) {
      const list = slice.inProgress
        .map((r) => `${r.title} (${r.type}, ${r.progress}%)`)
        .join('; ')
      lines.push(`Aprendiendo: ${list}.`)
    }
    if (slice.finishedThisMonth > 0) {
      lines.push(`Recursos terminados este mes: ${slice.finishedThisMonth}.`)
    }
    if (slice.flashcardsDue > 0) {
      lines.push(
        `Flashcards a revisar hoy: ${slice.flashcardsDue} (mastered: ${slice.flashcardsMastered}).`,
      )
    }
    if (slice.totalHighlights > 0) {
      lines.push(`Highlights guardados: ${slice.totalHighlights}.`)
    }
    if (slice.daysSinceLastReview != null) {
      if (slice.daysSinceLastReview === 0) {
        lines.push('Repasaste hoy.')
      } else if (slice.daysSinceLastReview <= 3) {
        lines.push(`Último repaso: hace ${slice.daysSinceLastReview}d.`)
      } else {
        lines.push(
          `Sin repasar hace ${slice.daysSinceLastReview} días — considerar retomar.`,
        )
      }
    }
    return lines
  },
}
