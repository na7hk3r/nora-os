import { create } from 'zustand'
import type { JournalEntry, JournalPrompt } from './types'

interface JournalState {
  entries: JournalEntry[]
  prompts: JournalPrompt[]

  setEntries: (e: JournalEntry[]) => void
  setPrompts: (p: JournalPrompt[]) => void

  upsertEntry: (e: JournalEntry) => void
  removeEntry: (id: string) => void

  upsertPrompt: (p: JournalPrompt) => void
  removePrompt: (id: string) => void
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((i) => i.id === item.id)
  if (idx === -1) return [...list, item]
  const next = [...list]
  next[idx] = item
  return next
}

export const useJournalStore = create<JournalState>((set) => ({
  entries: [],
  prompts: [],

  setEntries: (entries) => set({ entries }),
  setPrompts: (prompts) => set({ prompts }),

  upsertEntry: (e) => set((s) => ({ entries: upsertById(s.entries, e) })),
  removeEntry: (id) => set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),

  upsertPrompt: (p) => set((s) => ({ prompts: upsertById(s.prompts, p) })),
  removePrompt: (id) => set((s) => ({ prompts: s.prompts.filter((x) => x.id !== id) })),
}))
