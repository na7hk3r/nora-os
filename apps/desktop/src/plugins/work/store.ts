import { create } from 'zustand'
import type { Board, Column, Card, Note, Link, FocusSession, Project, ProjectLink, ProjectEntityType } from './types'

interface WorkState {
  boards: Board[]
  columns: Column[]
  cards: Card[]
  notes: Note[]
  links: Link[]
  focusSessions: FocusSession[]
  currentFocusSession: FocusSession | null
  projects: Project[]
  projectLinks: ProjectLink[]
  selectedProjectId: string | null

  setBoards: (boards: Board[]) => void
  setColumns: (columns: Column[]) => void
  setCards: (cards: Card[]) => void
  setNotes: (notes: Note[]) => void
  setLinks: (links: Link[]) => void
  setFocusSessions: (sessions: FocusSession[]) => void
  setProjects: (projects: Project[]) => void
  setProjectLinks: (links: ProjectLink[]) => void
  setSelectedProjectId: (id: string | null) => void

  addCard: (card: Card) => void
  updateCard: (id: string, updates: Partial<Card>) => void
  deleteCard: (id: string) => void
  moveCard: (cardId: string, toColumnId: string, position: number) => void
  reorderCards: (updates: Array<{ id: string; columnId: string; position: number }>) => void

  addNote: (note: Note) => void
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void

  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  addProjectLink: (link: ProjectLink) => void
  removeProjectLink: (projectId: string, entityType: ProjectEntityType, entityId: string) => void

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
  projects: [],
  projectLinks: [],
  selectedProjectId: null,

  setBoards: (boards) => set({ boards }),
  setColumns: (columns) => set({ columns }),
  setCards: (cards) => set({ cards }),
  setNotes: (notes) => set({ notes }),
  setLinks: (links) => set({ links }),
  setProjects: (projects) => set({ projects }),
  setProjectLinks: (projectLinks) => set({ projectLinks }),
  setSelectedProjectId: (selectedProjectId) => set({ selectedProjectId }),
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

  addProject: (project) =>
    set((s) => ({
      projects: s.projects.some((p) => p.id === project.id)
        ? s.projects.map((p) => (p.id === project.id ? project : p))
        : [...s.projects, project],
    })),

  updateProject: (id, updates) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      projectLinks: s.projectLinks.filter((l) => l.projectId !== id),
      selectedProjectId: s.selectedProjectId === id ? null : s.selectedProjectId,
    })),

  addProjectLink: (link) =>
    set((s) => ({
      projectLinks: s.projectLinks.some(
        (l) => l.projectId === link.projectId && l.entityType === link.entityType && l.entityId === link.entityId,
      )
        ? s.projectLinks
        : [...s.projectLinks, link],
    })),

  removeProjectLink: (projectId, entityType, entityId) =>
    set((s) => ({
      projectLinks: s.projectLinks.filter(
        (l) => !(l.projectId === projectId && l.entityType === entityType && l.entityId === entityId),
      ),
    })),

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
