/**
 * Tipos del plugin Journal.
 *
 * Filosofía:
 *  - Una entrada por día (UNIQUE date). Si entrás dos veces, editás la misma.
 *  - Mood opcional 1..5. Tags opcionales. Prompt opcional para guiar.
 *  - Markdown plano (sin renderer pesado en v1).
 *  - Sin búsqueda fuzzy: solo LIKE simple sobre title/content/tags.
 */

export interface JournalEntry {
  id: string
  /** YYYY-MM-DD único. */
  date: string
  /** 1 (muy mal) … 5 (muy bien). null = sin registrar. */
  mood: number | null
  /** Prompt usado para esta entrada, si alguno. */
  promptId: string | null
  title: string
  content: string
  /** Lista de tags lower-case sin '#', separadas por coma. */
  tags: string[]
  wordCount: number
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface JournalPrompt {
  id: string
  text: string
  /** "morning", "evening", "gratitude", "reflection", "free" */
  category: string
  builtin: boolean
  createdAt: string
}
