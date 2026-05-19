import { create } from 'zustand'
import type { Goal, KeyResult, GoalMilestone } from './types'

interface GoalsState {
  goals: Goal[]
  keyResults: KeyResult[]
  milestones: GoalMilestone[]

  setGoals: (g: Goal[]) => void
  setKeyResults: (k: KeyResult[]) => void
  setMilestones: (m: GoalMilestone[]) => void

  upsertGoal: (g: Goal) => void
  removeGoal: (id: string) => void

  upsertKeyResult: (k: KeyResult) => void
  removeKeyResult: (id: string) => void

  upsertMilestone: (m: GoalMilestone) => void
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((i) => i.id === item.id)
  if (idx === -1) return [...list, item]
  const next = [...list]
  next[idx] = item
  return next
}

export const useGoalsStore = create<GoalsState>((set) => ({
  goals: [],
  keyResults: [],
  milestones: [],

  setGoals: (goals) => set({ goals }),
  setKeyResults: (keyResults) => set({ keyResults }),
  setMilestones: (milestones) => set({ milestones }),

  upsertGoal: (g) => set((s) => ({ goals: upsertById(s.goals, g) })),
  removeGoal: (id) =>
    set((s) => ({
      goals: s.goals.filter((g) => g.id !== id),
      keyResults: s.keyResults.filter((k) => k.goalId !== id),
      milestones: s.milestones.filter((m) =>
        s.keyResults.find((k) => k.id === m.krId && k.goalId === id) ? false : true,
      ),
    })),

  upsertKeyResult: (k) => set((s) => ({ keyResults: upsertById(s.keyResults, k) })),
  removeKeyResult: (id) =>
    set((s) => ({
      keyResults: s.keyResults.filter((k) => k.id !== id),
      milestones: s.milestones.filter((m) => m.krId !== id),
    })),

  upsertMilestone: (m) => set((s) => ({ milestones: upsertById(s.milestones, m) })),
}))
