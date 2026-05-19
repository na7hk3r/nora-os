import { create } from 'zustand'
import type { Board, Column, Card, Note, Link, FocusSession } from './types'

interface WorkState {
  boards: Board[]
  columns: Column[]
  cards: Card[]
  notes: Note[]
  links: Link[]
  focusSessions: FocusSession[]
  currentFocusSession: FocusSession | null

  setBoards: (boards: Board[]) => void
  setColumns: (columns: Column[]) => void
  setCards: (cards: Card[]) => void
  setNotes: (notes: Note[]) => void
  setLinks: (links: Link[]) => void
  setFocusSessions: (sessions: FocusSession[]) => void

  addCard: (card: Card) => void
  updateCard: (id: string, updates: Partial<Card>) => void
  deleteCard: (id: string) => void
  moveCard: (cardId: string, toColumnId: string, position: number) => void
  reorderCards: (updates: Array<{ id: string; columnId: string; position: number }>) => void

  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void

  startFocusSession: (session: FocusSession) => void
  finishFocusSession: (id: string, updates: Partial<FocusSession>) => void
}

export const useWorkStore = create<WorkState>((set) => ({
  boards: [],
  columns: [],
  cards: [],
  notes: [],
  links: [],
  focusSessions: [],
  currentFocusSession: null,

  setBoards: (boards) => set({ boards }),
  setColumns: (columns) => set({ columns }),
  setCards: (cards) => set({ cards }),
  setNotes: (notes) => set({ notes }),
  setLinks: (links) => set({ links }),
  setFocusSessions: (focusSessions) => {
    // Una sesión se considera "activa" mientras no tenga endTime, incluso si
    // está pausada (pausedAt presente). Al cargar, tomamos la más reciente.
    const activeSessions = focusSessions
      .filter((session) => !session.endTime)
      .sort((a, b) => b.startTime - a.startTime)

    set({
      focusSessions,
      currentFocusSession: activeSessions[0] ?? null,
    })
  },

  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),

  updateCard: (id, updates) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  deleteCard: (id) => set((s) => ({ cards: s.cards.filter((c) => c.id !== id) })),

  moveCard: (cardId, toColumnId, position) =>
    set((s) => ({
      cards: s.cards.map((c) =>
        c.id === cardId ? { ...c, columnId: toColumnId, position } : c,
      ),
    })),

  reorderCards: (updates) =>
    set((s) => {
      if (!updates.length) return s
      const map = new Map(updates.map((u) => [u.id, u]))
      return {
        cards: s.cards.map((c) => {
          const patch = map.get(c.id)
          return patch ? { ...c, columnId: patch.columnId, position: patch.position } : c
        }),
      }
    }),

  addNote: (note) => set((s) => ({ notes: [...s.notes, note] })),

  updateNote: (id, updates) =>
    set((s) => ({
      notes: s.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),

  deleteNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),

  startFocusSession: (session) =>
    set((s) => ({
      focusSessions: [session, ...s.focusSessions.filter((entry) => entry.id !== session.id)],
      currentFocusSession: session,
    })),

  finishFocusSession: (id, updates) =>
    set((s) => ({
      focusSessions: s.focusSessions.map((session) =>
        session.id === id ? { ...session, ...updates } : session,
      ),
      currentFocusSession: s.currentFocusSession?.id === id
        ? null
        : s.currentFocusSession,
    })),
}))
