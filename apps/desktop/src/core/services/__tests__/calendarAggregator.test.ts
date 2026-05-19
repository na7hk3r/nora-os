import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock storageAPI before importing the aggregator
vi.mock('@core/storage/StorageAPI', () => {
  const tables = new Set(['fitness_daily_entries', 'work_cards', 'work_columns', 'work_focus_sessions', 'settings'])
  return {
    storageAPI: {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes("FROM sqlite_master")) {
          const name = (params?.[0] as string) ?? ''
          return tables.has(name) ? [{ name }] : []
        }
        if (sql.includes('FROM settings')) {
          return [{ value: JSON.stringify([
            { id: 'p1', title: 'Comprar pan', date: '2025-01-15', completed: false },
            { id: 'p2', title: 'Llamar', date: '2025-01-20', completed: true },
          ]) }]
        }
        if (sql.includes('FROM work_cards')) {
          return [{ id: 'c1', title: 'Entrega', due_date: '2025-01-18', archived: 0, column_id: 'col1' }]
        }
        if (sql.includes('FROM fitness_daily_entries')) {
          return [{ date: '2025-01-16', weight: 80, workout: 'piernas' }]
        }
        if (sql.includes('FROM work_focus_sessions')) {
          return [{ id: 'f1', start_time: new Date('2025-01-17T09:00:00Z').getTime(), end_time: Date.now(), duration: 25 * 60_000 }]
        }
        return []
      }),
      execute: vi.fn(),
    },
  }
})

import { calendarAggregator } from '../calendarAggregator'

describe('calendarAggregator', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('aggregates events from all sources within range', async () => {
    const events = await calendarAggregator.getRange('2025-01-01', '2025-01-31')
    const sources = new Set(events.map((e) => e.source))
    expect(sources.has('planner')).toBe(true)
    expect(sources.has('work')).toBe(true)
    expect(sources.has('fitness')).toBe(true)
    expect(sources.has('focus')).toBe(true)
    // Sorted by date asc
    const dates = events.map((e) => e.date)
    expect([...dates]).toEqual([...dates].sort())
  })

  it('respects sources filter', async () => {
    const events = await calendarAggregator.getRange('2025-01-01', '2025-01-31', ['planner'])
    expect(events.every((e) => e.source === 'planner')).toBe(true)
  })

  it('excludes events outside the range', async () => {
    const events = await calendarAggregator.getRange('2025-02-01', '2025-02-28')
    expect(events).toHaveLength(0)
  })
})
