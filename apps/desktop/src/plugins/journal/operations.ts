/**
 * Operaciones del plugin Journal (refactor sobre Repository layer).
 */

import { eventBus } from '@core/events/EventBus'
import { useJournalStore } from './store'
import { JOURNAL_EVENTS } from './events'
import { genId, todayISO, countWords } from './utils'
import { journalEntriesRepo, journalPromptsRepo } from './repository'
import type { JournalEntry, JournalPrompt } from './types'

export interface UpsertEntryInput {
  date?: string
  mood?: number | null
  promptId?: string | null
  title?: string
  content: string
  tags?: string[]
}

/**
 * Crea o actualiza la entrada del día. Una sola entrada por fecha.
 * Si ya existe para esa fecha, hace update.
 */
export async function upsertEntry(input: UpsertEntryInput): Promise<JournalEntry> {
  const date = input.date ?? todayISO()
  const content = input.content
  if (!content.trim()) throw new Error('content required')

  const existing = useJournalStore.getState().entries.find((e) => e.date === date)
  const now = new Date().toISOString()
  const tags = input.tags ?? existing?.tags ?? []
  const wordCount = countWords(content)
  const title = (input.title ?? existing?.title ?? '').trim()
  const mood = input.mood !== undefined ? input.mood : existing?.mood ?? null
  const promptId = input.promptId !== undefined ? input.promptId : existing?.promptId ?? null

  let entry: JournalEntry
  if (existing) {
    const updated = await journalEntriesRepo.update(existing.id, {
      mood,
      promptId,
      title,
      content,
      tags,
      wordCount,
      updatedAt: now,
    })
    entry = updated ?? { ...existing, mood, promptId, title, content, tags, wordCount, updatedAt: now }
    useJournalStore.getState().upsertEntry(entry)
    eventBus.emit(JOURNAL_EVENTS.ENTRY_UPDATED, { id: entry.id, date }, { source: 'journal', persist: true })
  } else {
    const draft: JournalEntry = {
      id: genId('jrn'),
      date,
      mood,
      promptId,
      title,
      content,
      tags,
      wordCount,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    entry = await journalEntriesRepo.create(draft)
    useJournalStore.getState().upsertEntry(entry)
    eventBus.emit(JOURNAL_EVENTS.ENTRY_CREATED, { id: entry.id, date }, { source: 'journal', persist: true })
  }

  if (mood != null) {
    eventBus.emit(JOURNAL_EVENTS.MOOD_LOGGED, { date, mood }, { source: 'journal', persist: true })
  }

  return entry
}

export async function deleteEntry(id: string): Promise<void> {
  const existing = useJournalStore.getState().entries.find((e) => e.id === id)
  if (!existing) return
  await journalEntriesRepo.delete(id)
  useJournalStore.getState().removeEntry(id)
  eventBus.emit(JOURNAL_EVENTS.ENTRY_DELETED, { id, date: existing.date }, { source: 'journal', persist: true })
}

export async function togglePin(id: string): Promise<void> {
  const existing = useJournalStore.getState().entries.find((e) => e.id === id)
  if (!existing) return
  const pinned = !existing.pinned
  const updated = await journalEntriesRepo.update(id, { pinned })
  useJournalStore.getState().upsertEntry(updated ?? { ...existing, pinned })
  eventBus.emit(JOURNAL_EVENTS.ENTRY_PINNED, { id, pinned }, { source: 'journal', persist: true })
}

export async function createPrompt(text: string, category = 'free'): Promise<JournalPrompt> {
  const draft: JournalPrompt = {
    id: genId('prm'),
    text: text.trim(),
    category,
    builtin: false,
    createdAt: new Date().toISOString(),
  }
  const prompt = await journalPromptsRepo.create(draft)
  useJournalStore.getState().upsertPrompt(prompt)
  return prompt
}

export async function deletePrompt(id: string): Promise<void> {
  const existing = useJournalStore.getState().prompts.find((p) => p.id === id)
  if (!existing || existing.builtin) return
  await journalPromptsRepo.delete(id)
  useJournalStore.getState().removePrompt(id)
}
