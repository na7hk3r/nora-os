/**
 * Tipos del plugin Knowledge (PKM ligero).
 *
 * Filosofía:
 *  - Resource = unidad de aprendizaje (libro, curso, paper, video, artículo).
 *  - Highlight = cita o nota anclada a un resource.
 *  - Flashcard = par pregunta/respuesta con scheduling SM-2.
 *  - Review = registro de cada repaso con calidad 0..5.
 */

export type ResourceType = 'book' | 'course' | 'paper' | 'article' | 'video'
export type ResourceStatus = 'queued' | 'in_progress' | 'finished' | 'dropped'

export interface KnowledgeResource {
  id: string
  type: ResourceType
  title: string
  author: string | null
  sourceUrl: string | null
  status: ResourceStatus
  /** Progreso 0..100 (manual o derivado). */
  progress: number
  startedAt: string | null
  finishedAt: string | null
  tags: string[]
  notes: string | null
  createdAt: string
}

export interface KnowledgeHighlight {
  id: string
  resourceId: string
  text: string
  page: number | null
  note: string | null
  tags: string[]
  createdAt: string
}

export interface KnowledgeFlashcard {
  id: string
  resourceId: string | null
  deck: string
  front: string
  back: string
  /** Factor de facilidad (SM-2). Inicial 2.5. */
  ease: number
  /** Intervalo en días hasta el próximo review. */
  interval: number
  /** Repeticiones consecutivas correctas. */
  repetitions: number
  /** Próxima fecha de review (ISO YYYY-MM-DD). */
  nextReview: string
  archived: boolean
  createdAt: string
}

export interface KnowledgeReview {
  id: string
  flashcardId: string
  /** ISO datetime. */
  reviewedAt: string
  /** Calidad 0..5 (SM-2). 0..2 = fail, 3..5 = pass. */
  quality: number
}

export interface KnowledgeStats {
  totalResources: number
  inProgress: number
  finishedThisMonth: number
  totalHighlights: number
  flashcardsDue: number
  flashcardsMastered: number
  reviewStreak: number
}
