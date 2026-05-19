import { create } from 'zustand'
import type { DailyEntry, Measurement } from './types'

interface FitnessState {
  entries: DailyEntry[]
  measurements: Measurement[]
  setEntries: (entries: DailyEntry[]) => void
  setMeasurements: (measurements: Measurement[]) => void
  addEntry: (entry: DailyEntry) => void
  updateEntry: (date: string, entry: DailyEntry) => void
  addMeasurement: (measurement: Measurement) => void
}

export const useFitnessStore = create<FitnessState>((set) => ({
  entries: [],
  measurements: [],

  setEntries: (entries) => set({ entries }),
  setMeasurements: (measurements) => set({ measurements }),

  addEntry: (entry) =>
    set((state) => ({
      entries: [...state.entries, entry].sort((a, b) => a.date.localeCompare(b.date)),
    })),

  updateEntry: (date, entry) =>
    set((state) => ({
      entries: state.entries
        .map((e) => (e.date === date ? entry : e))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })),

  addMeasurement: (measurement) =>
    set((state) => ({
      measurements: [
        ...state.measurements.filter((item) => item.date !== measurement.date),
        measurement,
      ].sort((a, b) => a.date.localeCompare(b.date)),
    })),
}))
