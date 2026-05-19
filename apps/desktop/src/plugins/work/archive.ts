import type { Card } from './types'

export interface ArchiveCompletedResult {
  cards: Card[]
  targetIds: string[]
  archivedAt: number
}

export function getCompletedArchiveTargets(cards: Card[], columnId: string): Card[] {
  return cards.filter((card) => card.columnId === columnId && !card.archived)
}

export function archiveCompletedCards(
  cards: Card[],
  columnId: string,
  archivedAt: number = Date.now(),
): ArchiveCompletedResult {
  const targets = getCompletedArchiveTargets(cards, columnId)
  const targetIds = new Set(targets.map((card) => card.id))

  return {
    targetIds: [...targetIds],
    archivedAt,
    cards: cards.map((card) => (
      targetIds.has(card.id) ? { ...card, archived: true, archivedAt } : card
    )),
  }
}

export function getNextActiveCardPosition(cards: Card[], columnId: string): number {
  return cards.filter((card) => card.columnId === columnId && !card.archived).length
}

export function restoreArchivedCard(
  cards: Card[],
  cardId: string,
  targetColumnId: string,
  position: number = getNextActiveCardPosition(cards, targetColumnId),
): Card[] {
  return cards.map((card) => (
    card.id === cardId
      ? { ...card, columnId: targetColumnId, position, archived: false, archivedAt: null }
      : card
  ))
}
