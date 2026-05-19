import type { TimeEntry } from './types'

export function genId(prefix = 'tt'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function startOfTodayISO(now = new Date()): string {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function startOfWeekISO(now = new Date()): string {
  const d = new Date(now)
  const day = d.getDay() // 0=Sun
  // Treat Monday as start of week.
  const diff = (day + 6) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * Computes duration in seconds for an entry. If running (end=null), uses `now`.
 */
export function entryDurationSec(entry: Pick<TimeEntry, 'start' | 'end' | 'durationSec'>, now = new Date()): number {
  if (entry.end) return entry.durationSec
  const startMs = Date.parse(entry.start)
  if (Number.isNaN(startMs)) return 0
  return Math.max(0, Math.floor((now.getTime() - startMs) / 1000))
}

export function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function sumDurationSec(entries: TimeEntry[], fromISO: string, now = new Date()): number {
  const fromMs = Date.parse(fromISO)
  let total = 0
  for (const e of entries) {
    const startMs = Date.parse(e.start)
    if (Number.isNaN(startMs)) continue
    const parsedEnd = e.end ? Date.parse(e.end) : NaN
    const endMs = Number.isNaN(parsedEnd) ? now.getTime() : parsedEnd
    if (endMs <= fromMs) continue
    const slice = Math.max(0, Math.floor((endMs - Math.max(startMs, fromMs)) / 1000))
    total += slice
  }
  return total
}

const PALETTE = ['#22d3ee', '#a78bfa', '#f472b6', '#fb923c', '#34d399', '#fbbf24', '#60a5fa']

export function pickProjectColor(seed: number): string {
  return PALETTE[Math.abs(seed) % PALETTE.length]
}
