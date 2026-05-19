import { describe, expect, it } from 'vitest'
import {
  archiveCompletedCards,
  getCompletedArchiveTargets,
  getNextActiveCardPosition,
  restoreArchivedCard,
} from './archive'
import type { Card } from './types'

function card(partial: Partial<Card> & Pick<Card, 'id' | 'columnId'>): Card {
  return {
    id: partial.id,
    columnId: partial.columnId,
    title: partial.title ?? partial.id,
    description: '',
    content: '',
    labels: partial.labels ?? [],
    dueDate: null,
    position: partial.position ?? 0,
    priority: partial.priority ?? null,
    estimateMinutes: partial.estimateMinutes ?? null,
    checklist: partial.checklist ?? [],
    archived: partial.archived ?? false,
    archivedAt: partial.archivedAt ?? null,
  }
}

describe('work card archive helpers', () => {
  it('selects only non-archived cards from the completed column', () => {
    const cards = [
      card({ id: 'done-1', columnId: 'done' }),
      card({ id: 'done-old', columnId: 'done', archived: true, archivedAt: 10 }),
      card({ id: 'todo-1', columnId: 'todo' }),
    ]

    expect(getCompletedArchiveTargets(cards, 'done').map((item) => item.id)).toEqual(['done-1'])
  })

  it('archives completed cards without touching active columns', () => {
    const archivedAt = 1_717_171_717
    const cards = [
      card({ id: 'done-1', columnId: 'done' }),
      card({ id: 'done-2', columnId: 'done' }),
      card({ id: 'todo-1', columnId: 'todo' }),
    ]

    const result = archiveCompletedCards(cards, 'done', archivedAt)

    expect(result.targetIds).toEqual(['done-1', 'done-2'])
    expect(result.cards.find((item) => item.id === 'done-1')).toMatchObject({ archived: true, archivedAt })
    expect(result.cards.find((item) => item.id === 'done-2')).toMatchObject({ archived: true, archivedAt })
    expect(result.cards.find((item) => item.id === 'todo-1')).toMatchObject({ archived: false, archivedAt: null })
  })

  it('restores an archived card to Done and clears archive metadata', () => {
    const cards = [
      card({ id: 'done-1', columnId: 'done', position: 0 }),
      card({ id: 'done-old', columnId: 'done', position: 1, archived: true, archivedAt: 10 }),
    ]

    const position = getNextActiveCardPosition(cards, 'done')
    const restored = restoreArchivedCard(cards, 'done-old', 'done', position)

    expect(position).toBe(1)
    expect(restored.find((item) => item.id === 'done-old')).toMatchObject({
      columnId: 'done',
      position: 1,
      archived: false,
      archivedAt: null,
    })
  })
})
