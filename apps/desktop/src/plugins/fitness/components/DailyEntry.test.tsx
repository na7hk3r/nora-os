import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DailyEntry } from './DailyEntry'
import { DEFAULT_FITNESS_SETTINGS, FITNESS_SETTINGS_KEY } from '../settings'
import { useFitnessStore } from '../store'

describe('DailyEntry', () => {
  let query: ReturnType<typeof vi.fn>
  let execute: ReturnType<typeof vi.fn>

  beforeEach(() => {
    useFitnessStore.setState({ entries: [], measurements: [] })
    query = vi.fn().mockResolvedValue([])
    execute = vi.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
    Object.assign(window.storage, { query, execute })
  })

  it('hides cigarette input by default', async () => {
    render(<DailyEntry />)

    await waitFor(() => expect(query).toHaveBeenCalled())
    expect(screen.queryByLabelText('Cigarrillos')).not.toBeInTheDocument()
  })

  it('shows cigarette input only when cessation tracking is enabled', async () => {
    query.mockResolvedValue([
      {
        key: FITNESS_SETTINGS_KEY,
        value: JSON.stringify({
          ...DEFAULT_FITNESS_SETTINGS,
          smokingCessationEnabled: true,
        }),
      },
    ])

    render(<DailyEntry />)

    expect(await screen.findByLabelText('Cigarrillos')).toBeInTheDocument()
  })
})
