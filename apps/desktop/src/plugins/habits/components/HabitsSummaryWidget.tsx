import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Repeat, Flame } from 'lucide-react'
import { useHabitsStore } from '../store'
import { computeStats } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Widget compacto del Dashboard. Muestra cuántos hábitos cumpliste hoy
 * y la racha más alta vigente.
 */
export function HabitsSummaryWidget() {
  const navigate = useNavigate()
  const habits = useHabitsStore((s) => s.habits)
  const logs = useHabitsStore((s) => s.logs)

  const summary = useMemo(() => {
    const active = habits.filter((h) => !h.archived)
    if (active.length === 0) return null
    let completed = 0
    let topStreak = 0
    let topStreakName = ''
    for (const h of active) {
      const stats = computeStats(h, logs.filter((l) => l.habitId === h.id))
      if (stats.completedThisPeriod) completed += 1
      if (stats.streak > topStreak) {
        topStreak = stats.streak
        topStreakName = h.name
      }
    }
    return { total: active.length, completed, topStreak, topStreakName }
  }, [habits, logs])

  if (!summary) {
    return (
      <button
        type="button"
        onClick={() => navigate('/habits')}
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted hover:text-white"
      >
        {messages.empty.habitsAll}
      </button>
    )
  }

  const pct = Math.round((summary.completed / summary.total) * 100)

  return (
    <button
      type="button"
      onClick={() => navigate('/habits')}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 text-left shadow-xl transition-colors hover:border-accent/50"
      aria-label={`Hábitos: ${summary.completed} de ${summary.total} cumplidos hoy`}
    >
      <div className="flex items-center gap-2">
        <Repeat size={16} className="text-accent-light" aria-hidden="true" />
        <span className="text-caption uppercase tracking-eyebrow text-muted">Hábitos de hoy</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">
          {summary.completed}<span className="text-muted text-base">/{summary.total}</span>
        </p>
        <p className="text-xs text-muted">{pct}% del día</p>
      </div>
      {summary.topStreak >= 3 && (
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
          <Flame size={14} className="text-amber-300" aria-hidden="true" />
          <span className="truncate text-white">{summary.topStreakName}</span>
          <span className="ml-auto font-medium text-white">{summary.topStreak}d</span>
        </div>
      )}
    </button>
  )
}
