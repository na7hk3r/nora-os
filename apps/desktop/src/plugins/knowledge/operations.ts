/**
 * Operaciones del plugin Knowledge.
 *  - Persisten en SQLite via repositorios tipados.
 *  - Actualizan el store Zustand.
 *  - Emiten eventos vía eventBus (con persist=true).
 */

import { eventBus } from '@core/events/EventBus'
import { useKnowledgeStore } from './store'
import { KNOWLEDGE_EVENTS } from './events'
import {
  knowledgeFlashcardsRepo,
  knowledgeHighlightsRepo,
  knowledgeResourcesRepo,
  knowledgeReviewsRepo,
} from './repository'
import type {
  KnowledgeFlashcard,
  KnowledgeHighlight,
  KnowledgeResource,
  ResourceStatus,
  ResourceType,
} from './types'
import { addDays, applySm2ToFlashcard, formatLocalDate, genId, todayISO } from './utils'

// ─── Resources ────────────────────────────────────────────────────────

export interface CreateResourceInput {
  type: ResourceType
  title: string
  author?: string | null
  sourceUrl?: string | null
  tags?: string[]
  notes?: string | null
}

export async function createResource(input: CreateResourceInput): Promise<KnowledgeResource> {
  const title = input.title.trim()
  if (!title) throw new Error('resource title required')
  const draft: KnowledgeResource = {
    id: genId('res'),
    type: input.type,
    title,
    author: input.author?.trim() || null,
    sourceUrl: input.sourceUrl?.trim() || null,
    status: 'queued',
    progress: 0,
    startedAt: null,
    finishedAt: null,
    tags: input.tags ?? [],
    notes: input.notes?.trim() || null,
    createdAt: new Date().toISOString(),
  }
  const created = await knowledgeResourcesRepo.create(draft)
  useKnowledgeStore.getState().upsertResource(created)
  eventBus.emit(
    KNOWLEDGE_EVENTS.RESOURCE_CREATED,
    { id: created.id, type: created.type, title: created.title },
    { source: 'knowledge', persist: true },
  )
  return created
}

export async function updateResource(
  id: string,
  patch: Partial<Pick<KnowledgeResource, 'title' | 'author' | 'sourceUrl' | 'tags' | 'notes' | 'progress' | 'type'>>,
): Promise<void> {
  const existing = useKnowledgeStore.getState().resources.find((r) => r.id === id)
  if (!existing) return
  const next: Partial<KnowledgeResource> = { ...patch }
  if (patch.progress != null) {
    next.progress = Math.max(0, Math.min(100, Math.round(patch.progress)))
  }
  if (patch.title != null) {
    next.title = patch.title.trim() || existing.title
  }
  const updated = await knowledgeResourcesRepo.update(id, next)
  if (updated) useKnowledgeStore.getState().upsertResource(updated)
  eventBus.emit(
    KNOWLEDGE_EVENTS.RESOURCE_UPDATED,
    { id },
    { source: 'knowledge', persist: true },
  )
}

export async function setResourceStatus(id: string, status: ResourceStatus): Promise<void> {
  const existing = useKnowledgeStore.getState().resources.find((r) => r.id === id)
  if (!existing) return
  const patch: Partial<KnowledgeResource> = { status }
  const now = new Date().toISOString()
  if (status === 'in_progress' && !existing.startedAt) {
    patch.startedAt = now
  }
  if (status === 'finished') {
    patch.finishedAt = now
    patch.progress = 100
  }
  const updated = await knowledgeResourcesRepo.update(id, patch)
  if (updated) useKnowledgeStore.getState().upsertResource(updated)

  if (status === 'in_progress' && !existing.startedAt) {
    eventBus.emit(KNOWLEDGE_EVENTS.RESOURCE_STARTED, { id }, { source: 'knowledge', persist: true })
  }
  if (status === 'finished') {
    eventBus.emit(
      KNOWLEDGE_EVENTS.RESOURCE_FINISHED,
      { id, type: existing.type, title: existing.title },
      { source: 'knowledge', persist: true },
    )
  }
  eventBus.emit(KNOWLEDGE_EVENTS.RESOURCE_UPDATED, { id }, { source: 'knowledge', persist: true })
}

export async function deleteResource(id: string): Promise<void> {
  const flashcardIds = useKnowledgeStore
    .getState()
    .flashcards.filter((f) => f.resourceId === id)
    .map((f) => f.id)
  if (flashcardIds.length > 0) {
    await knowledgeReviewsRepo
      .deleteWhere([{ column: 'flashcard_id', op: 'IN', value: flashcardIds }])
      .catch(() => 0)
  }
  await knowledgeFlashcardsRepo
    .deleteWhere([{ column: 'resource_id', op: '=', value: id }])
    .catch(() => 0)
  await knowledgeHighlightsRepo
    .deleteWhere([{ column: 'resource_id', op: '=', value: id }])
    .catch(() => 0)
  await knowledgeResourcesRepo.delete(id)
  useKnowledgeStore.getState().removeResource(id)
  eventBus.emit(KNOWLEDGE_EVENTS.RESOURCE_DELETED, { id }, { source: 'knowledge', persist: true })
}

// ─── Highlights ───────────────────────────────────────────────────────

export interface CreateHighlightInput {
  resourceId: string
  text: string
  page?: number | null
  note?: string | null
  tags?: string[]
}

export async function createHighlight(input: CreateHighlightInput): Promise<KnowledgeHighlight> {
  const text = input.text.trim()
  if (!text) throw new Error('highlight text required')
  const exists = useKnowledgeStore.getState().resources.find((r) => r.id === input.resourceId)
  if (!exists) throw new Error('resource not found')
  const draft: KnowledgeHighlight = {
    id: genId('hl'),
    resourceId: input.resourceId,
    text,
    page: input.page ?? null,
    note: input.note?.trim() || null,
    tags: input.tags ?? [],
    createdAt: new Date().toISOString(),
  }
  const created = await knowledgeHighlightsRepo.create(draft)
  useKnowledgeStore.getState().upsertHighlight(created)
  eventBus.emit(
    KNOWLEDGE_EVENTS.HIGHLIGHT_ADDED,
    { id: created.id, resourceId: created.resourceId, text: created.text, resourceTitle: exists.title },
    { source: 'knowledge', persist: true },
  )
  return created
}

export async function deleteHighlight(id: string): Promise<void> {
  await knowledgeHighlightsRepo.delete(id)
  useKnowledgeStore.getState().removeHighlight(id)
  eventBus.emit(KNOWLEDGE_EVENTS.HIGHLIGHT_DELETED, { id }, { source: 'knowledge', persist: true })
}

/** Marca un highlight como "promovido a tarea" — solo evento informativo. */
export function emitHighlightPromotedToTask(highlightId: string, resourceId: string): void {
  eventBus.emit(
    KNOWLEDGE_EVENTS.HIGHLIGHT_PROMOTED_TO_TASK,
    { id: highlightId, resourceId },
    { source: 'knowledge', persist: true },
  )
}

// ─── Flashcards ───────────────────────────────────────────────────────

export interface CreateFlashcardInput {
  front: string
  back: string
  deck?: string
  resourceId?: string | null
}

export async function createFlashcard(input: CreateFlashcardInput): Promise<KnowledgeFlashcard> {
  const front = input.front.trim()
  const back = input.back.trim()
  if (!front || !back) throw new Error('flashcard front+back required')
  const draft: KnowledgeFlashcard = {
    id: genId('fc'),
    resourceId: input.resourceId ?? null,
    deck: (input.deck ?? 'general').trim() || 'general',
    front,
    back,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: todayISO(),
    archived: false,
    createdAt: new Date().toISOString(),
  }
  const created = await knowledgeFlashcardsRepo.create(draft)
  useKnowledgeStore.getState().upsertFlashcard(created)
  eventBus.emit(
    KNOWLEDGE_EVENTS.FLASHCARD_CREATED,
    { id: created.id, deck: created.deck },
    { source: 'knowledge', persist: true },
  )
  return created
}

export async function deleteFlashcard(id: string): Promise<void> {
  await knowledgeReviewsRepo
    .deleteWhere([{ column: 'flashcard_id', op: '=', value: id }])
    .catch(() => 0)
  await knowledgeFlashcardsRepo.delete(id)
  useKnowledgeStore.getState().removeFlashcard(id)
  eventBus.emit(KNOWLEDGE_EVENTS.FLASHCARD_DELETED, { id }, { source: 'knowledge', persist: true })
}

/**
 * Aplica SM-2, persiste el patch y registra el review.
 * `quality` es 0..5.
 */
export async function reviewFlashcard(id: string, quality: number): Promise<KnowledgeFlashcard | undefined> {
  const card = useKnowledgeStore.getState().flashcards.find((f) => f.id === id)
  if (!card) return undefined
  const patch = applySm2ToFlashcard(card, quality)
  const updated = await knowledgeFlashcardsRepo.update(id, patch)
  if (updated) useKnowledgeStore.getState().upsertFlashcard(updated)

  const review = await knowledgeReviewsRepo.create({
    id: genId('rv'),
    flashcardId: id,
    reviewedAt: new Date().toISOString(),
    quality: Math.max(0, Math.min(5, Math.floor(quality))),
  })
  useKnowledgeStore.getState().pushReview(review)

  eventBus.emit(
    KNOWLEDGE_EVENTS.FLASHCARD_REVIEWED,
    { id, quality, nextReview: patch.nextReview },
    { source: 'knowledge', persist: true },
  )
  return updated
}

// ─── Study session (informativo) ──────────────────────────────────────

export function emitStudySessionStarted(resourceId: string | null): void {
  eventBus.emit(
    KNOWLEDGE_EVENTS.STUDY_SESSION_STARTED,
    { resourceId, at: new Date().toISOString() },
    { source: 'knowledge', persist: true },
  )
}

export function emitStudySessionFinished(resourceId: string | null, durationMinutes: number): void {
  eventBus.emit(
    KNOWLEDGE_EVENTS.STUDY_SESSION_FINISHED,
    {
      resourceId,
      at: new Date().toISOString(),
      durationMinutes: Math.max(0, Math.round(durationMinutes)),
    },
    { source: 'knowledge', persist: true },
  )
}

// Re-export para tests
export { addDays, formatLocalDate }
