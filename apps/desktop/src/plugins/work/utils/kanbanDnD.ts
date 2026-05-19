import type { Card } from '../types'

export interface ReorderUpdate {
  id: string
  columnId: string
  position: number
}

const PRIORITY_ORDER: Record<NonNullable<Card['priority']>, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function priorityRank(priority: Card['priority'] | undefined): number {
  return priority ? PRIORITY_ORDER[priority] : 4
}

export function getVisibleCardsForColumn(cards: Card[], columnId: string): Card[] {
  return cards
    .filter((card) => card.columnId === columnId && !card.archived)
    .sort((a, b) => a.position - b.position)
}

export function isColumnId(columnIds: string[], id: string | number): boolean {
  return columnIds.includes(String(id))
}

export function getColumnIdForTarget(
  cards: Card[],
  columnIds: string[],
  targetId: string | number | null | undefined,
): string | null {
  if (targetId == null) return null
  const id = String(targetId)
  if (isColumnId(columnIds, id)) return id
  return cards.find((card) => card.id === id && !card.archived)?.columnId ?? null
}

export function getInsertionIndex({
  cards,
  activeId,
  targetColumnId,
  overId,
  isBelowOverItem = false,
}: {
  cards: Card[]
  activeId: string
  targetColumnId: string
  overId: string | number | null | undefined
  isBelowOverItem?: boolean
}): number {
  const targetCards = getVisibleCardsForColumn(cards, targetColumnId)
  const overKey = overId == null ? null : String(overId)

  if (!overKey || overKey === targetColumnId) {
    return targetCards.filter((card) => card.id !== activeId).length
  }

  if (overKey === activeId) {
    const currentIndex = targetCards.findIndex((card) => card.id === activeId)
    return currentIndex >= 0 ? currentIndex : targetCards.length
  }

  const targetWithoutActive = targetCards.filter((card) => card.id !== activeId)
  const overIndex = targetWithoutActive.findIndex((card) => card.id === overKey)
  if (overIndex < 0) return targetWithoutActive.length

  return overIndex + (isBelowOverItem ? 1 : 0)
}

export function getChangedReorderUpdates(before: Card[], after: Card[]): ReorderUpdate[] {
  const beforeById = new Map(before.map((card) => [card.id, card]))

  return after.reduce<ReorderUpdate[]>((updates, card) => {
    const previous = beforeById.get(card.id)
    if (!previous) return updates
    if (previous.columnId !== card.columnId || previous.position !== card.position) {
      updates.push({ id: card.id, columnId: card.columnId, position: card.position })
    }
    return updates
  }, [])
}

export function sortVisibleCardsByPriority(
  cards: Card[],
  columnId: string,
): {
  cards: Card[]
  updates: ReorderUpdate[]
} {
  const sortedColumnCards = getVisibleCardsForColumn(cards, columnId)
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => {
      const priorityDelta = priorityRank(a.card.priority) - priorityRank(b.card.priority)
      if (priorityDelta !== 0) return priorityDelta
      return a.originalIndex - b.originalIndex
    })

  const updatesById = new Map<string, ReorderUpdate>()
  sortedColumnCards.forEach(({ card }, position) => {
    updatesById.set(card.id, { id: card.id, columnId, position })
  })

  const nextCards = cards.map((card) => {
    const update = updatesById.get(card.id)
    return update ? { ...card, position: update.position } : card
  })

  return {
    cards: nextCards,
    updates: getChangedReorderUpdates(cards, nextCards),
  }
}

export function moveVisibleCard(
  cards: Card[],
  activeId: string,
  targetColumnId: string,
  insertIndex: number,
): {
  cards: Card[]
  updates: ReorderUpdate[]
  sourceColumnId: string | null
  targetColumnId: string
} {
  const activeCard = cards.find((card) => card.id === activeId && !card.archived)
  if (!activeCard) {
    return { cards, updates: [], sourceColumnId: null, targetColumnId }
  }

  const sourceColumnId = activeCard.columnId
  const targetCards = getVisibleCardsForColumn(cards, targetColumnId).filter(
    (card) => card.id !== activeId,
  )
  const boundedIndex = Math.max(0, Math.min(insertIndex, targetCards.length))
  const nextTargetOrder = [
    ...targetCards.slice(0, boundedIndex),
    activeCard,
    ...targetCards.slice(boundedIndex),
  ]

  const updatesById = new Map<string, ReorderUpdate>()

  if (sourceColumnId !== targetColumnId) {
    getVisibleCardsForColumn(cards, sourceColumnId)
      .filter((card) => card.id !== activeId)
      .forEach((card, position) => {
        updatesById.set(card.id, { id: card.id, columnId: sourceColumnId, position })
      })
  }

  nextTargetOrder.forEach((card, position) => {
    updatesById.set(card.id, { id: card.id, columnId: targetColumnId, position })
  })

  const nextCards = cards.map((card) => {
    const update = updatesById.get(card.id)
    return update ? { ...card, columnId: update.columnId, position: update.position } : card
  })

  return {
    cards: nextCards,
    updates: getChangedReorderUpdates(cards, nextCards),
    sourceColumnId,
    targetColumnId,
  }
}
