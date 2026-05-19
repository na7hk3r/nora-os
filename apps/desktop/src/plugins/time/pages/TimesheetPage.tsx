import { useMemo } from 'react'
import { useTimeStore } from '../store'
import { formatDuration, startOfWeekISO } from '../utils'
import type { TimeEntry } from '../types'

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function TimesheetPage() {
  const entries = useTimeStore((s) => s.entries)
  const projects = useTimeStore((s) => s.projects)

  const grid = useMemo(() => buildWeekGrid(entries), [entries])

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold">Timesheet semanal</h1>
        <p className="text-sm text-muted">Horas por proyecto y día (semana actual, lunes a domingo).</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface-light/40">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="text-left px-4 py-3">Proyecto</th>
              {DAY_LABELS.map((d) => (
                <th key={d} className="text-right px-3 py-3 tabular-nums">{d}</th>
              ))}
              <th className="text-right px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grid.rows.map((row) => {
              const project = projects.find((p) => p.id === row.projectId)
              const total = row.perDay.reduce((a, b) => a + b, 0)
              return (
                <tr key={row.projectId ?? 'none'}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: project?.color ?? '#475569' }}
                      />
                      <span>{project?.name ?? 'Sin proyecto'}</span>
                    </div>
                  </td>
                  {row.perDay.map((sec, i) => (
                    <td key={i} className="text-right px-3 py-2.5 tabular-nums text-muted">
                      {sec > 0 ? formatDuration(sec) : '—'}
                    </td>
                  ))}
                  <td className="text-right px-4 py-2.5 tabular-nums font-semibold">{formatDuration(total)}</td>
                </tr>
              )
            })}
            {grid.rows.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted px-4 py-8">
                  Sin entradas esta semana.
                </td>
              </tr>
            )}
          </tbody>
          {grid.rows.length > 0 && (
            <tfoot className="border-t border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                <td className="px-4 py-3">Total día</td>
                {grid.totalsPerDay.map((sec, i) => (
                  <td key={i} className="text-right px-3 py-3 tabular-nums text-white">
                    {sec > 0 ? formatDuration(sec) : '—'}
                  </td>
                ))}
                <td className="text-right px-4 py-3 tabular-nums text-white font-bold">
                  {formatDuration(grid.totalsPerDay.reduce((a, b) => a + b, 0))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

interface WeekGrid {
  rows: { projectId: string | null; perDay: number[] }[]
  totalsPerDay: number[]
}

function buildWeekGrid(entries: TimeEntry[]): WeekGrid {
  const now = new Date()
  const weekStartMs = Date.parse(startOfWeekISO(now))
  const dayMs = 24 * 60 * 60 * 1000
  const buckets = new Map<string, number[]>()
  const totalsPerDay = new Array<number>(7).fill(0)

  for (const entry of entries) {
    const startMs = Date.parse(entry.start)
    const endMs = entry.end ? Date.parse(entry.end) : Date.now()
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue

    for (let i = 0; i < 7; i++) {
      const dayStart = weekStartMs + i * dayMs
      const dayEnd = dayStart + dayMs
      const overlap = Math.max(0, Math.min(endMs, dayEnd) - Math.max(startMs, dayStart))
      if (overlap === 0) continue
      const sec = Math.floor(overlap / 1000)
      const key = entry.projectId ?? '__none__'
      if (!buckets.has(key)) buckets.set(key, new Array<number>(7).fill(0))
      buckets.get(key)![i] += sec
      totalsPerDay[i] += sec
    }
  }

  const rows = Array.from(buckets.entries()).map(([key, perDay]) => ({
    projectId: key === '__none__' ? null : key,
    perDay,
  }))
  rows.sort((a, b) => b.perDay.reduce((x, y) => x + y, 0) - a.perDay.reduce((x, y) => x + y, 0))

  return { rows, totalsPerDay }
}
