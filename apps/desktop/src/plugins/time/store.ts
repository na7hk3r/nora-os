import { create } from 'zustand'
import type { TimeEntry, TimeProject } from './types'

interface TimeState {
  projects: TimeProject[]
  entries: TimeEntry[]
  setProjects: (rows: TimeProject[]) => void
  setEntries: (rows: TimeEntry[]) => void
  upsertProject: (project: TimeProject) => void
  removeProject: (id: string) => void
  upsertEntry: (entry: TimeEntry) => void
  removeEntry: (id: string) => void
  /** Returns the current running entry (end == null), or undefined. */
  runningEntry: () => TimeEntry | undefined
}

export const useTimeStore = create<TimeState>((set, get) => ({
  projects: [],
  entries: [],
  setProjects: (rows) => set({ projects: rows }),
  setEntries: (rows) => set({ entries: rows }),
  upsertProject: (project) =>
    set((state) => {
      const idx = state.projects.findIndex((p) => p.id === project.id)
      if (idx === -1) return { projects: [...state.projects, project] }
      const next = state.projects.slice()
      next[idx] = project
      return { projects: next }
    }),
  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      // Detach entries from this project but keep them.
      entries: state.entries.map((e) => (e.projectId === id ? { ...e, projectId: null } : e)),
    })),
  upsertEntry: (entry) =>
    set((state) => {
      const idx = state.entries.findIndex((e) => e.id === entry.id)
      if (idx === -1) return { entries: [entry, ...state.entries] }
      const next = state.entries.slice()
      next[idx] = entry
      return { entries: next }
    }),
  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  runningEntry: () => get().entries.find((e) => e.end === null),
}))
