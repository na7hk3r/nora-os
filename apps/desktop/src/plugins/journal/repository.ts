/**
 * Repositorios del plugin Journal sobre la capa Repository del core.
 */

import { defineRepository } from '@core/storage/Repository'
import type { JournalEntry, JournalPrompt } from './types'

interface JournalEntryRow extends Record<string, unknown> {
  id: string
  date: string
  mood: number | null
  prompt_id: string | null
  title: string
  content: string
  tags: string
  word_count: number
  pinned: number
  created_at: string
  updated_at: string
}

interface JournalPromptRow extends Record<string, unknown> {
  id: string
  text: string
  category: string
  builtin: number
  created_at: string
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : []
  } catch {
    return []
  }
}

export const journalEntriesRepo = defineRepository<JournalEntry, JournalEntryRow>({
  table: 'journal_entries',
  mapRow: (row) => ({
    id: row.id,
    date: row.date,
    mood: row.mood == null ? null : Number(row.mood),
    promptId: row.prompt_id ?? null,
    title: row.title ?? '',
    content: row.content ?? '',
    tags: parseTags(row.tags),
    wordCount: Number(row.word_count ?? 0),
    pinned: Boolean(row.pinned),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }),
  toRow: (entity) => {
    const row: Partial<JournalEntryRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.date !== undefined) row.date = entity.date
    if (entity.mood !== undefined) row.mood = entity.mood
    if (entity.promptId !== undefined) row.prompt_id = entity.promptId
    if (entity.title !== undefined) row.title = entity.title
    if (entity.content !== undefined) row.content = entity.content
    if (entity.tags !== undefined) row.tags = JSON.stringify(entity.tags)
    if (entity.wordCount !== undefined) row.word_count = entity.wordCount
    if (entity.pinned !== undefined) row.pinned = entity.pinned ? 1 : 0
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    if (entity.updatedAt !== undefined) row.updated_at = entity.updatedAt
    return row
  },
})

export const journalPromptsRepo = defineRepository<JournalPrompt, JournalPromptRow>({
  table: 'journal_prompts',
  mapRow: (row) => ({
    id: row.id,
    text: row.text,
    category: row.category ?? 'free',
    builtin: Boolean(row.builtin),
    createdAt: row.created_at,
  }),
  toRow: (entity) => {
    const row: Partial<JournalPromptRow> = {}
    if (entity.id !== undefined) row.id = entity.id
    if (entity.text !== undefined) row.text = entity.text
    if (entity.category !== undefined) row.category = entity.category
    if (entity.builtin !== undefined) row.builtin = entity.builtin ? 1 : 0
    if (entity.createdAt !== undefined) row.created_at = entity.createdAt
    return row
  },
})
