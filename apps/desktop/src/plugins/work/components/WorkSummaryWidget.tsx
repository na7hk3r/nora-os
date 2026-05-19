import { useWorkStore } from '../store'
import {
  isDoneColumn,
  isInProgressColumn,
  isTodoColumn,
  isBacklogColumn,
  getColumnIds,
} from '../utils/columnUtils'

function formatFocusDuration(durationMs: number) {
  const totalMinutes = Math.floor(durationMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function WorkSummaryWidget() {
  const { cards, columns, notes, links, focusSessions, currentFocusSession } = useWorkStore()

  const columnById = new Map(columns.map((col) => [col.id, col]))

  const doneColumnIds = getColumnIds(columns, isDoneColumn)
  const inProgressColumnIds = getColumnIds(columns, isInProgressColumn)
  const todoColumnIds = getColumnIds(columns, isTodoColumn)
  const backlogColumnIds = getColumnIds(columns, isBacklogColumn)

  const doneCount = cards.filter((card) => doneColumnIds.has(card.columnId)).length
  const inProgressCount = cards.filter((card) => inProgressColumnIds.has(card.columnId)).length
  const todoCount = cards.filter((card) => todoColumnIds.has(card.columnId)).length
  const backlogCount = cards.filter((card) => backlogColumnIds.has(card.columnId)).length
  const activeCount = cards.length - doneCount

  const completedPct = cards.length > 0 ? Math.round((doneCount / cards.length) * 100) : 0

  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const sessionsToday = focusSessions.filter((session) => session.startTime >= startOfDay.getTime())
  const focusTodayMs = sessionsToday.reduce((sum, session) => {
    const end = session.endTime ?? (session.id === currentFocusSession?.id ? now : session.startTime)
    return sum + Math.max(0, end - session.startTime)
  }, 0)

  const overdueCount = cards.filter((card) => {
    if (!card.dueDate || doneColumnIds.has(card.columnId)) return false
    return new Date(card.dueDate).getTime() < now
  }).length

  const byColumn = cards.reduce<Record<string, number>>((acc, card) => {
    const columnName = columnById.get(card.columnId)?.name ?? 'Otros'
    acc[columnName] = (acc[columnName] ?? 0) + 1
    return acc
  }, {})

  const topColumnEntries = Object.entries(byColumn)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-border bg-surface px-2 py-2 text-center">
          <p className="text-lg font-semibold tabular-nums">{activeCount}</p>
          <p className="text-micro text-muted uppercase tracking-wide">Activas</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-2 py-2 text-center">
          <p className="text-lg font-semibold tabular-nums">{inProgressCount}</p>
          <p className="text-micro text-muted uppercase tracking-wide">En progreso</p>
        </div>
        <div className="rounded-lg border border-border bg-surface px-2 py-2 text-center">
          <p className="text-lg font-semibold tabular-nums">{doneCount}</p>
          <p className="text-micro text-muted uppercase tracking-wide">Hechas</p>
        </div>
      </div>

      <div className="space-y-1.5 rounded-lg border border-border bg-surface px-3 py-2">
        <div className="flex items-center justify-between text-caption text-muted">
          <span>Backlog/Todo</span>
          <span className="tabular-nums">{backlogCount}/{todoCount}</span>
        </div>
        <div className="flex items-center justify-between text-caption text-muted">
          <span>Foco hoy</span>
          <span className="tabular-nums">{formatFocusDuration(focusTodayMs)} ({sessionsToday.length})</span>
        </div>
        <div className="flex items-center justify-between text-caption text-muted">
          <span>Vencidas</span>
          <span className={`tabular-nums ${overdueCount > 0 ? 'text-warning' : ''}`}>{overdueCount}</span>
        </div>
      </div>

      <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
          style={{ width: `${completedPct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-caption text-muted">
        <span>Avance tablero</span>
        <span className="tabular-nums">{completedPct}%</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topColumnEntries.map(([name, count]) => (
          <span key={name} className="rounded-full border border-border bg-surface px-2 py-0.5 text-micro text-muted">
            {name}: {count}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-caption text-muted">
        <span>Notas / Links</span>
        <span className="tabular-nums">{notes.length} / {links.length}</span>
      </div>
    </div>
  )
}
