import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { KpiCards } from './KpiCards'
import { DEFAULT_FITNESS_SETTINGS } from '../settings'
import { useFitnessStore } from '../store'
import type { DailyEntry } from '../types'

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

describe('KpiCards', () => {
  beforeEach(() => {
    useFitnessStore.setState({
      entries: [
        entry({ date: '2026-05-01', weight: 80, cigarettes: 8, sleep: 7, breakfast: 1, lunch: 1 }),
        entry({ date: '2026-05-02', weight: 79.5, cigarettes: 5, sleep: 8, breakfast: 1, lunch: 1, snack: 1, dinner: 1 }),
      ],
      measurements: [],
    })
  })

  it('does not render cigarette KPIs by default', () => {
    render(<KpiCards settingsOverride={DEFAULT_FITNESS_SETTINGS} />)

    expect(screen.queryByText(/Cigarrillos/i)).not.toBeInTheDocument()
  })

  it('renders cigarette KPIs when cessation tracking is enabled', () => {
    render(
      <KpiCards
        settingsOverride={{
          ...DEFAULT_FITNESS_SETTINGS,
          smokingCessationEnabled: true,
        }}
      />,
    )

    expect(screen.getByText('Cigarrillos/dia')).toBeInTheDocument()
  })
})
