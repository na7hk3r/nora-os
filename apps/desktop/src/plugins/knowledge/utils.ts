import type { KnowledgeFlashcard } from './types'

/**
 * Helpers puros del plugin Knowledge. Sin IO, sin stores. Testeables.
 */

export function genId(prefix = 'kn'): string {
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

export function parseTagsCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function serializeTagsCsv(tags: string[]): string {
  return tags
    .map((t) => t.trim())
    .filter(Boolean)
    .join(',')
}

// ─── Algoritmo SuperMemo 2 (SM-2) ────────────────────────────────────
// Referencia: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
// quality: 0..5 (0..2 = fallo, 3..5 = éxito)

export interface SM2Input {
  ease: number
  interval: number
  repetitions: number
  quality: number
}

export interface SM2Result {
  ease: number
  interval: number
  repetitions: number
  /** Días hasta el próximo review. */
  nextIntervalDays: number
}

export function sm2Schedule(input: SM2Input): SM2Result {
  const q = Math.max(0, Math.min(5, Math.floor(input.quality)))
  let { ease, repetitions } = input
  let interval: number

  if (q < 3) {
    // Fallo: reseteamos racha y mostramos pronto.
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(input.interval * ease)
    }
  }

  // Update ease factor (independiente del éxito; SM-2 lo ajusta también en fallos).
  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ease < 1.3) ease = 1.3

  return {
    ease: Math.round(ease * 1000) / 1000,
    interval,
    repetitions,
    nextIntervalDays: interval,
  }
}

/** Aplica SM-2 sobre una flashcard y devuelve un patch listo para guardar. */
export function applySm2ToFlashcard(
  card: KnowledgeFlashcard,
  quality: number,
  today: Date = new Date(),
): Pick<KnowledgeFlashcard, 'ease' | 'interval' | 'repetitions' | 'nextReview'> {
  const result = sm2Schedule({
    ease: card.ease,
    interval: card.interval,
    repetitions: card.repetitions,
    quality,
  })
  const next = addDays(today, result.nextIntervalDays)
  return {
    ease: result.ease,
    interval: result.interval,
    repetitions: result.repetitions,
    nextReview: formatLocalDate(next),
  }
}

/** Considera "mastered" una card con repeticiones >= 4 e intervalo >= 21 días. */
export function isMastered(card: KnowledgeFlashcard): boolean {
  return card.repetitions >= 4 && card.interval >= 21
}

/** Cards con nextReview <= today. */
export function dueFlashcards(
  cards: KnowledgeFlashcard[],
  today: Date = new Date(),
): KnowledgeFlashcard[] {
  const todayStr = formatLocalDate(today)
  return cards.filter((c) => !c.archived && c.nextReview <= todayStr)
}
