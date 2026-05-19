/**
 * Repositorios del plugin Knowledge sobre la capa Repository del core.
 */

import { defineRepository } from '@core/storage/Repository'
import type {
  KnowledgeFlashcard,
  KnowledgeHighlight,
  KnowledgeResource,
  KnowledgeReview,
  ResourceStatus,
  ResourceType,
} from './types'
import { parseTagsCsv, serializeTagsCsv } from './utils'

interface ResourceRow extends Record<string, unknown> {
  id: string
  type: string
  title: string
  author: string | null
  source_url: string | null
  status: string
  progress: number
  started_at: string | null
  finished_at: string | null
  tags: string | null
  notes: string | null
  created_at: string
}

interface HighlightRow extends Record<string, unknown> {
  id: string
  resource_id: string
  text: string
  page: number | null
  note: string | null
  tags: string | null
  created_at: string
}

interface FlashcardRow extends Record<string, unknown> {
  id: string
  resource_id: string | null
  deck: string
  front: string
  back: string
  ease: number
  interval: number
  repetitions: number
  next_review: string
  archived: number
  created_at: string
}

interface ReviewRow extends Record<string, unknown> {
  id: string
  flashcard_id: string
  reviewed_at: string
  quality: number
}

const RESOURCE_TYPES: ResourceType[] = ['book', 'course', 'paper', 'article', 'video']
const RESOURCE_STATUSES: ResourceStatus[] = ['queued', 'in_progress', 'finished', 'dropped']

export const knowledgeResourcesRepo = defineRepository<KnowledgeResource, ResourceRow>({
  table: 'knowledge_resources',
  mapRow: (row) => ({
    id: row.id,
    type: (RESOURCE_TYPES.includes(row.type as ResourceType) ? row.type : 'article') as ResourceType,
    title: row.title,
    author: row.author ?? null,
    sourceUrl: row.source_url ?? null,
    status: (RESOURCE_STATUSES.includes(row.status as ResourceStatus) ? row.status : 'queued') as ResourceStatus,
    progress: Math.max(0, Math.min(100, Number(row.progress ?? 0))),
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    tags: parseTagsCsv(row.tags),
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<ResourceRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.type !== undefined) row.type = entity.type
    if (entity.title !== undefined) row.title = entity.title
    if (entity.author !== undefined) row.author = entity.author
    if (entity.sourceUrl !== undefined) row.source_url = entity.sourceUrl
    if (entity.status !== undefined) row.status = entity.status
    if (entity.progress !== undefined) row.progress = entity.progress
    if (entity.startedAt !== undefined) row.started_at = entity.startedAt
    if (entity.finishedAt !== undefined) row.finished_at = entity.finishedAt
    if (entity.tags !== undefined) row.tags = serializeTagsCsv(entity.tags)
    if (entity.notes !== undefined) row.notes = entity.notes
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})

export const knowledgeHighlightsRepo = defineRepository<KnowledgeHighlight, HighlightRow>({
  table: 'knowledge_highlights',
  mapRow: (row) => ({
    id: row.id,
    resourceId: row.resource_id,
    text: row.text,
    page: row.page == null ? null : Number(row.page),
    note: row.note ?? null,
    tags: parseTagsCsv(row.tags),
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<HighlightRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.resourceId !== undefined) row.resource_id = entity.resourceId
    if (entity.text !== undefined) row.text = entity.text
    if (entity.page !== undefined) row.page = entity.page
    if (entity.note !== undefined) row.note = entity.note
    if (entity.tags !== undefined) row.tags = serializeTagsCsv(entity.tags)
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})

export const knowledgeFlashcardsRepo = defineRepository<KnowledgeFlashcard, FlashcardRow>({
  table: 'knowledge_flashcards',
  mapRow: (row) => ({
    id: row.id,
    resourceId: row.resource_id ?? null,
    deck: row.deck,
    front: row.front,
    back: row.back,
    ease: Number(row.ease ?? 2.5),
    interval: Number(row.interval ?? 0),
    repetitions: Number(row.repetitions ?? 0),
    nextReview: row.next_review,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<FlashcardRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.resourceId !== undefined) row.resource_id = entity.resourceId
    if (entity.deck !== undefined) row.deck = entity.deck
    if (entity.front !== undefined) row.front = entity.front
    if (entity.back !== undefined) row.back = entity.back
    if (entity.ease !== undefined) row.ease = entity.ease
    if (entity.interval !== undefined) row.interval = entity.interval
    if (entity.repetitions !== undefined) row.repetitions = entity.repetitions
    if (entity.nextReview !== undefined) row.next_review = entity.nextReview
    if (entity.archived !== undefined) row.archived = entity.archived ? 1 : 0
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})

export const knowledgeReviewsRepo = defineRepository<KnowledgeReview, ReviewRow>({
  table: 'knowledge_reviews',
  mapRow: (row) => ({
    id: row.id,
    flashcardId: row.flashcard_id,
    reviewedAt: row.reviewed_at,
    quality: Number(row.quality ?? 0),
  }),
  toRow: (entity) => {
    const row: Partial<ReviewRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.flashcardId !== undefined) row.flashcard_id = entity.flashcardId
    if (entity.reviewedAt !== undefined) row.reviewed_at = entity.reviewedAt
    if (entity.quality !== undefined) row.quality = entity.quality
    return row
  },
})
