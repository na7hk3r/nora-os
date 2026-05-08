import { describe, expect, it } from 'vitest'
import {
  getChangedReorderUpdates,
  getInsertionIndex,
  getVisibleCardsForColumn,
  moveVisibleCard,
  sortVisibleCardsByPriority,
} from './kanbanDnD'
import type { Card } from '../types'

function card(
  id: string,
  columnId: string,
  position: number,
  archived = false,
  priority: Card['priority'] = null,
): Card {
  return {
    id,
    columnId,
    position,
    archived,
    title: id,
    description: '',
    content: '',
    labels: [],
    dueDate: null,
    priority,
    estimateMinutes: null,
    checklist: [],
    archivedAt: archived ? Date.now() : null,
  }
}

describe('kanbanDnD helpers', () => {
  it('drops a card into an empty column', () => {
    const cards = [card('a', 'todo', 0), card('b', 'todo', 1)]
    const result = moveVisibleCard(cards, 'a', 'done', 0)

    expect(result.cards.find((c) => c.id === 'a')).toMatchObject({ columnId: 'done', position: 0 })
    expect(result.cards.find((c) => c.id === 'b')).toMatchObject({ columnId: 'todo', position: 0 })
    expect(result.updates).toEqual([
      { id: 'a', columnId: 'done', position: 0 },
      { id: 'b', columnId: 'todo', position: 0 },
    ])
  })

  it('moves a card to the start of the same column', () => {
    const cards = [card('a', 'todo', 0), card('b', 'todo', 1), card('c', 'todo', 2)]
    const insertIndex = getInsertionIndex({
      cards,
      activeId: 'c',
      targetColumnId: 'todo',
      overId: 'a',
      isBelowOverItem: false,
    })
    const result = moveVisibleCard(cards, 'c', 'todo', insertIndex)

    expect(getVisibleCardsForColumn(result.cards, 'todo').map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })

  it('moves a card to the end of the same column', () => {
    const cards = [card('a', 'todo', 0), card('b', 'todo', 1), card('c', 'todo', 2)]
    const insertIndex = getInsertionIndex({
      cards,
      activeId: 'a',
      targetColumnId: 'todo',
      overId: 'c',
      isBelowOverItem: true,
    })
    const result = moveVisibleCard(cards, 'a', 'todo', insertIndex)

    expect(getVisibleCardsForColumn(result.cards, 'todo').map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('moves between columns before or after a hovered card', () => {
    const cards = [
      card('a', 'todo', 0),
      card('b', 'doing', 0),
      card('c', 'doing', 1),
    ]

    const beforeIndex = getInsertionIndex({
      cards,
      activeId: 'a',
      targetColumnId: 'doing',
      overId: 'b',
      isBelowOverItem: false,
    })
    const before = moveVisibleCard(cards, 'a', 'doing', beforeIndex)
    expect(getVisibleCardsForColumn(before.cards, 'doing').map((c) => c.id)).toEqual(['a', 'b', 'c'])

    const afterIndex = getInsertionIndex({
      cards,
      activeId: 'a',
      targetColumnId: 'doing',
      overId: 'b',
      isBelowOverItem: true,
    })
    const after = moveVisibleCard(cards, 'a', 'doing', afterIndex)
    expect(getVisibleCardsForColumn(after.cards, 'doing').map((c) => c.id)).toEqual(['b', 'a', 'c'])
  })

  it('ignores archived cards when recalculating visible positions', () => {
    const cards = [
      card('a', 'todo', 0),
      card('archived', 'todo', 1, true),
      card('b', 'todo', 2),
      card('c', 'doing', 0),
    ]

    const result = moveVisibleCard(cards, 'a', 'doing', 1)

    expect(result.cards.find((c) => c.id === 'archived')).toMatchObject({
      columnId: 'todo',
      position: 1,
      archived: true,
    })
    expect(getVisibleCardsForColumn(result.cards, 'todo').map((c) => `${c.id}:${c.position}`)).toEqual(['b:0'])
    expect(getVisibleCardsForColumn(result.cards, 'doing').map((c) => `${c.id}:${c.position}`)).toEqual(['c:0', 'a:1'])
  })

  it('returns only changed updates', () => {
    const before = [card('a', 'todo', 0), card('b', 'todo', 1)]
    const after = [card('a', 'todo', 0), card('b', 'done', 0)]

    expect(getChangedReorderUpdates(before, after)).toEqual([
      { id: 'b', columnId: 'done', position: 0 },
    ])
  })

  it('sorts one column by priority while keeping same-priority order stable', () => {
    const cards = [
      card('none', 'todo', 0),
      card('high-a', 'todo', 1, false, 'high'),
      card('urgent', 'todo', 2, false, 'urgent'),
      card('low', 'todo', 3, false, 'low'),
      card('high-b', 'todo', 4, false, 'high'),
      card('other', 'doing', 0, false, 'urgent'),
      card('archived', 'todo', 5, true, 'urgent'),
    ]

    const result = sortVisibleCardsByPriority(cards, 'todo')

    expect(getVisibleCardsForColumn(result.cards, 'todo').map((c) => c.id)).toEqual([
      'urgent',
      'high-a',
      'high-b',
      'low',
      'none',
    ])
    expect(result.cards.find((c) => c.id === 'other')).toMatchObject({ columnId: 'doing', position: 0 })
    expect(result.cards.find((c) => c.id === 'archived')).toMatchObject({
      columnId: 'todo',
      position: 5,
      archived: true,
    })
  })
})
