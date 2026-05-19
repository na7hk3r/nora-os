import { create } from 'zustand'
import type { HabitDefinition, HabitLog } from './types'

interface HabitsState {
  habits: HabitDefinition[]
  logs: HabitLog[]

  setHabits: (h: HabitDefinition[]) => void
  setLogs: (l: HabitLog[]) => void

  upsertHabit: (h: HabitDefinition) => void
  removeHabit: (id: string) => void

  upsertLog: (l: HabitLog) => void
  removeLog: (id: string) => void
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((i) => i.id === item.id)
  if (idx === -1) return [...list, item]
  const next = [...list]
  next[idx] = item
  return next
}

export const useHabitsStore = create<HabitsState>((set) => ({
  habits: [],
  logs: [],

  setHabits: (habits) => set({ habits }),
  setLogs: (logs) => set({ logs }),

  upsertHabit: (h) => set((s) => ({ habits: upsertById(s.habits, h) })),
  removeHabit: (id) =>
    set((s) => ({
      habits: s.habits.filter((h) => h.id !== id),
      logs: s.logs.filter((l) => l.habitId !== id),
    })),

  upsertLog: (l) => set((s) => ({ logs: upsertById(s.logs, l) })),
  removeLog: (id) => set((s) => ({ logs: s.logs.filter((l) => l.id !== id) })),
}))
