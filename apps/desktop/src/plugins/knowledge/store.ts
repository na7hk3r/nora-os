import { create } from 'zustand'
import type {
  KnowledgeFlashcard,
  KnowledgeHighlight,
  KnowledgeResource,
  KnowledgeReview,
} from './types'

interface KnowledgeState {
  resources: KnowledgeResource[]
  highlights: KnowledgeHighlight[]
  flashcards: KnowledgeFlashcard[]
  reviews: KnowledgeReview[]

  setResources: (r: KnowledgeResource[]) => void
  setHighlights: (h: KnowledgeHighlight[]) => void
  setFlashcards: (f: KnowledgeFlashcard[]) => void
  setReviews: (r: KnowledgeReview[]) => void

  upsertResource: (r: KnowledgeResource) => void
  removeResource: (id: string) => void

  upsertHighlight: (h: KnowledgeHighlight) => void
  removeHighlight: (id: string) => void

  upsertFlashcard: (f: KnowledgeFlashcard) => void
  removeFlashcard: (id: string) => void

  pushReview: (r: KnowledgeReview) => void
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((i) => i.id === item.id)
  if (idx === -1) return [...list, item]
  const next = [...list]
  next[idx] = item
  return next
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  resources: [],
  highlights: [],
  flashcards: [],
  reviews: [],

  setResources: (resources) => set({ resources }),
  setHighlights: (highlights) => set({ highlights }),
  setFlashcards: (flashcards) => set({ flashcards }),
  setReviews: (reviews) => set({ reviews }),

  upsertResource: (r) => set((s) => ({ resources: upsertById(s.resources, r) })),
  removeResource: (id) =>
    set((s) => ({
      resources: s.resources.filter((r) => r.id !== id),
      highlights: s.highlights.filter((h) => h.resourceId !== id),
      flashcards: s.flashcards.filter((f) => f.resourceId !== id),
    })),

  upsertHighlight: (h) => set((s) => ({ highlights: upsertById(s.highlights, h) })),
  removeHighlight: (id) =>
    set((s) => ({ highlights: s.highlights.filter((h) => h.id !== id) })),

  upsertFlashcard: (f) => set((s) => ({ flashcards: upsertById(s.flashcards, f) })),
  removeFlashcard: (id) =>
    set((s) => ({
      flashcards: s.flashcards.filter((f) => f.id !== id),
      reviews: s.reviews.filter((r) => r.flashcardId !== id),
    })),

  pushReview: (r) => set((s) => ({ reviews: [...s.reviews, r] })),
}))
