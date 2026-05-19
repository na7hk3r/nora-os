import { describe, expect, it, beforeEach } from 'vitest'
import { averageField, hasAnyMeasurementValue } from './utils'
import { useFitnessStore } from './store'
import type { DailyEntry, Measurement } from './types'

function entry(partial: Partial<DailyEntry>): DailyEntry {
  return {
    date: partial.date ?? '2026-05-01',
    dayName: partial.dayName ?? 'viernes',
    weight: partial.weight ?? null,
    breakfast: partial.breakfast ?? 0,
    lunch: partial.lunch ?? 0,
    snack: partial.snack ?? 0,
    dinner: partial.dinner ?? 0,
    workout: partial.workout ?? '',
    cigarettes: partial.cigarettes ?? 0,
    sleep: partial.sleep ?? null,
    notes: partial.notes ?? '',
  }
}

describe('fitness utils', () => {
  beforeEach(() => {
    useFitnessStore.setState({ entries: [], measurements: [] })
  })

  it('ignores null and zero sleep values in averages', () => {
    const entries = [
      entry({ date: '2026-05-01', sleep: null }),
      entry({ date: '2026-05-02', sleep: 0 }),
      entry({ date: '2026-05-03', sleep: 7 }),
      entry({ date: '2026-05-04', sleep: 8 }),
    ]

    expect(averageField(entries, 'sleep', 7)).toBe(7.5)
  })

  it('detects whether a measurement has at least one real value', () => {
    const empty: Measurement = {
      date: '2026-05-08',
      weight: null,
      armRelaxed: null,
      armFlexed: null,
      chest: null,
      waist: null,
      leg: null,
    }
    const filled = { ...empty, waist: 82 }

    expect(hasAnyMeasurementValue(empty)).toBe(false)
    expect(hasAnyMeasurementValue(filled)).toBe(true)
  })

  it('upserts measurements by date in the fitness store', () => {
    useFitnessStore.getState().addMeasurement({
      date: '2026-05-08',
      weight: 80,
      armRelaxed: null,
      armFlexed: null,
      chest: null,
      waist: 90,
      leg: null,
    })
    useFitnessStore.getState().addMeasurement({
      date: '2026-05-08',
      weight: 79.5,
      armRelaxed: null,
      armFlexed: null,
      chest: null,
      waist: 89,
      leg: null,
    })

    expect(useFitnessStore.getState().measurements).toEqual([
      expect.objectContaining({ date: '2026-05-08', weight: 79.5, waist: 89 }),
    ])
  })
})
