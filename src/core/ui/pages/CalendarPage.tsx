import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { calendarAggregator, type CalendarEvent, type CalendarSource } from '@core/services/calendarAggregator'
import { useI18n } from '@core/i18n'

const SOURCE_COLOR: Record<CalendarSource, string> = {
  planner: 'bg-accent/20 text-accent-light border-accent/40',
  work: 'bg-purple-500/20 text-purple-200 border-purple-400/40',
  fitness: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
  focus: 'bg-amber-500/20 text-amber-200 border-amber-400/40',
}

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function daysInMonth(d: Date): number { return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() }
function fmtIso(d: Date): string { return d.toISOString().slice(0, 10) }

function buildGrid(month: Date): { date: Date; iso: string; inMonth: boolean }[] {
  const start = startOfMonth(month)
  const startWeekday = (start.getDay() + 6) % 7 // Lunes=0
  const total = daysInMonth(month)
  const cells: { date: Date; iso: string; inMonth: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), -startWeekday + 1 + i)
    cells.push({ date: d, iso: fmtIso(d), inMonth: false })
  }
  for (let i = 1; i <= total; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), i)
    cells.push({ date: d, iso: fmtIso(d), inMonth: true })
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date
    const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
    cells.push({ date: d, iso: fmtIso(d), inMonth: false })
  }
  return cells
}

export function CalendarPage() {
  const { t, language, formatDate } = useI18n()
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [sourcesFilter, setSourcesFilter] = useState<Record<CalendarSource, boolean>>({
    planner: true, work: true, fitness: true, focus: true,
  })
  const navigate = useNavigate()
  const sourceLabel: Record<CalendarSource, string> = {
    planner: t.routes['core-planner'] ?? 'Planner',
    work: t.plugins.meta.work?.name ?? 'Work',
    fitness: t.plugins.meta.fitness?.name ?? 'Fitness',
    focus: language === 'en' ? 'Focus' : 'Foco',
  }

  const grid = useMemo(() => buildGrid(cursor), [cursor])
  const from = grid[0].iso
  const to = grid[grid.length - 1].iso

  useEffect(() => {
    const sources = (Object.keys(sourcesFilter) as CalendarSource[]).filter((s) => sourcesFilter[s])
    void calendarAggregator.getRange(from, to, sources).then(setEvents).catch(() => setEvents([]))
  }, [from, to, sourcesFilter])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      const arr = map.get(e.date) ?? []
      arr.push(e)
      map.set(e.date, arr)
    }
    return map
  }, [events])

  const todayIso = fmtIso(new Date())
  const monthLabel = formatDate(cursor, { month: 'long', year: 'numeric' })
  const weekdays = useMemo(
    () => Array.from({ length: 7 }, (_, day) => formatDate(new Date(2026, 3, 20 + day), { weekday: 'short' })),
    [formatDate],
  )

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={20} className="text-accent-light" />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">
              {language === 'en' ? 'Unified calendar' : 'Calendario unificado'}
            </p>
            <h1 className="text-xl font-semibold capitalize">{monthLabel}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCursor((c) => addMonths(c, -1))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-white"
            aria-label={language === 'en' ? 'Previous month' : 'Mes anterior'}
          ><ChevronLeft size={14} /></button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-white"
          >{t.common.today}</button>
          <button
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-white"
            aria-label={language === 'en' ? 'Next month' : 'Mes siguiente'}
          ><ChevronRight size={14} /></button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(Object.keys(sourcesFilter) as CalendarSource[]).map((s) => (
            <label key={s} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1 text-xs">
              <input
                type="checkbox"
                checked={sourcesFilter[s]}
                onChange={(e) => setSourcesFilter((prev) => ({ ...prev, [s]: e.target.checked }))}
                className="h-3 w-3 accent-accent"
              />
              <span className={`rounded px-1.5 py-0.5 ${SOURCE_COLOR[s]}`}>{sourceLabel[s]}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 text-micro uppercase tracking-wider text-muted">
          {weekdays.map((d) => (
            <div key={d} className="px-1 py-1 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell) => {
            const dayEvents = eventsByDay.get(cell.iso) ?? []
            const isToday = cell.iso === todayIso
            return (
              <div
                key={cell.iso}
                className={`min-h-[88px] rounded-lg border p-1.5 text-caption transition-colors ${
                  cell.inMonth ? 'border-border bg-surface' : 'border-border/40 bg-surface/30 opacity-50'
                } ${isToday ? 'ring-1 ring-accent' : ''}`}
              >
                <div className={`mb-1 flex items-center justify-between text-micro ${isToday ? 'text-accent-light' : 'text-muted'}`}>
                  <span>{cell.date.getDate()}</span>
                  {dayEvents.length > 0 && <span>{dayEvents.length}</span>}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => e.ctaPath && navigate(e.ctaPath)}
                      className={`block w-full truncate rounded border px-1.5 py-0.5 text-left text-micro ${SOURCE_COLOR[e.source]}`}
                      title={`${sourceLabel[e.source]}: ${e.title}`}
                    >
                      {e.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-micro text-muted">+{dayEvents.length - 3}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
