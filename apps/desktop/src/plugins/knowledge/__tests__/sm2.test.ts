import { describe, expect, it } from 'vitest'
import {
  applySm2ToFlashcard,
  dueFlashcards,
  isMastered,
  parseTagsCsv,
  serializeTagsCsv,
  sm2Schedule,
  todayISO,
} from '../utils'
import type { KnowledgeFlashcard } from '../types'

function makeCard(overrides: Partial<KnowledgeFlashcard> = {}): KnowledgeFlashcard {
  return {
    id: 'fc_test',
    resourceId: null,
    deck: 'general',
    front: 'q',
    back: 'a',
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: todayISO(),
    archived: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('sm2Schedule', () => {
  it('first successful review schedules 1 day', () => {
    const r = sm2Schedule({ ease: 2.5, interval: 0, repetitions: 0, quality: 5 })
    expect(r.repetitions).toBe(1)
    expect(r.interval).toBe(1)
    expect(r.nextIntervalDays).toBe(1)
    expect(r.ease).toBeGreaterThan(2.5)
  })

  it('second successful review schedules 6 days', () => {
    const r = sm2Schedule({ ease: 2.5, interval: 1, repetitions: 1, quality: 4 })
    expect(r.repetitions).toBe(2)
    expect(r.interval).toBe(6)
  })

  it('third+ review multiplies by ease factor', () => {
    const r = sm2Schedule({ ease: 2.5, interval: 6, repetitions: 2, quality: 4 })
    expect(r.repetitions).toBe(3)
    expect(r.interval).toBe(15) // round(6 * 2.5) = 15
  })

  it('failure resets repetitions and interval to 1', () => {
    const r = sm2Schedule({ ease: 2.6, interval: 30, repetitions: 5, quality: 1 })
    expect(r.repetitions).toBe(0)
    expect(r.interval).toBe(1)
  })

  it('ease never drops below 1.3', () => {
    let ease = 2.5
    for (let i = 0; i < 50; i++) {
      const r = sm2Schedule({ ease, interval: 1, repetitions: 0, quality: 0 })
      ease = r.ease
    }
    expect(ease).toBeGreaterThanOrEqual(1.3)
  })

  it('clamps quality 0..5', () => {
    const low = sm2Schedule({ ease: 2.5, interval: 1, repetitions: 1, quality: -10 })
    const high = sm2Schedule({ ease: 2.5, interval: 1, repetitions: 1, quality: 99 })
    expect(low.repetitions).toBe(0)
    expect(high.repetitions).toBe(2)
  })
})

describe('applySm2ToFlashcard', () => {
  it('returns next-review date as today + interval', () => {
    const card = makeCard({ ease: 2.5, interval: 6, repetitions: 2 })
    const today = new Date('2025-01-10T12:00:00Z')
    const patch = applySm2ToFlashcard(card, 4, today)
    // interval becomes 15 → nextReview = 2025-01-25
    expect(patch.interval).toBe(15)
    expect(patch.nextReview).toBe('2025-01-25')
  })
})

describe('dueFlashcards', () => {
  it('includes cards with nextReview today or earlier, excludes archived', () => {
    const today = new Date('2025-06-15T12:00:00Z')
    const cards = [
      makeCard({ id: 'a', nextReview: '2025-06-15' }),
      makeCard({ id: 'b', nextReview: '2025-06-10' }),
      makeCard({ id: 'c', nextReview: '2025-06-20' }),
      makeCard({ id: 'd', nextReview: '2025-06-01', archived: true }),
    ]
    const due = dueFlashcards(cards, today).map((c) => c.id)
    expect(due).toEqual(['a', 'b'])
  })
})

describe('isMastered', () => {
  it('true only when reps>=4 and interval>=21', () => {
    expect(isMastered(makeCard({ repetitions: 4, interval: 21 }))).toBe(true)
    expect(isMastered(makeCard({ repetitions: 4, interval: 20 }))).toBe(false)
    expect(isMastered(makeCard({ repetitions: 3, interval: 30 }))).toBe(false)
  })
})

describe('tags csv', () => {
  it('roundtrips', () => {
    expect(parseTagsCsv('a, b ,c')).toEqual(['a', 'b', 'c'])
    expect(parseTagsCsv(null)).toEqual([])
    expect(serializeTagsCsv(['a', '', ' b '])).toBe('a,b')
  })
})
