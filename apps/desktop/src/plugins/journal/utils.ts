import type { JournalEntry } from './types'

export function genId(prefix = 'jrn'): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return formatLocalDate(new Date())
}

const WORD_RE = /\S+/g

export function countWords(text: string): number {
  if (!text) return 0
  const matches = text.match(WORD_RE)
  return matches ? matches.length : 0
}

/** Normaliza un input de tags ("foco, lectura ; #salud") a array lowercase sin '#'. */
export function parseTagsInput(input: string): string[] {
  if (!input) return []
  return Array.from(
    new Set(
      input
        .split(/[,;\n]/)
        .map((t) => t.trim().replace(/^#/, '').toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32),
    ),
  )
}

export function tagsToString(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(' ')
}

/** Devuelve true si la entrada matchea la query (case-insensitive). */
export function matchesQuery(entry: JournalEntry, query: string): boolean {
  if (!query.trim()) return true
  const q = query.trim().toLowerCase()
  if (entry.title.toLowerCase().includes(q)) return true
  if (entry.content.toLowerCase().includes(q)) return true
  if (entry.tags.some((t) => t.includes(q))) return true
  return false
}

export function moodLabel(mood: number | null): string {
  switch (mood) {
    case 1: return 'Muy mal'
    case 2: return 'Mal'
    case 3: return 'Normal'
    case 4: return 'Bien'
    case 5: return 'Muy bien'
    default: return 'Sin registrar'
  }
}

export function moodEmoji(mood: number | null): string {
  // Decisión de UI: no usar emojis en la app por convención de tono.
  // Devolvemos un símbolo neutral textual.
  switch (mood) {
    case 1: return '— —'
    case 2: return '—'
    case 3: return '•'
    case 4: return '+'
    case 5: return '++'
    default: return '·'
  }
}
