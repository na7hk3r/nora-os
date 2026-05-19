import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Flag } from 'lucide-react'
import { useGoalsStore } from '../store'
import { computeGoalProgress, currentQuarter, formatPeriod } from '../utils'

/**
 * Widget compacto del Dashboard. Muestra el avance promedio de los OKRs
 * activos del trimestre actual y un acceso a la página completa.
 */
export function GoalsSummaryWidget() {
  const navigate = useNavigate()
  const goals = useGoalsStore((s) => s.goals)
  const keyResults = useGoalsStore((s) => s.keyResults)

  const summary = useMemo(() => {
    const year = new Date().getFullYear()
    const period = currentQuarter()
    const active = goals.filter(
      (g) => g.status === 'active' && g.year === year && (g.period === period || g.period === 'year'),
    )
    if (active.length === 0) return null

    let sumPct = 0
    let topPct = -1
    let topTitle = ''
    for (const g of active) {
      const p = computeGoalProgress(g, keyResults)
      sumPct += p.percent
      if (p.percent > topPct) {
        topPct = p.percent
        topTitle = g.title
      }
    }
    return {
      total: active.length,
      avgPct: Math.round(sumPct / active.length),
      topTitle,
      topPct,
      label: formatPeriod(period, year),
    }
  }, [goals, keyResults])

  if (!summary) {
    return (
      <button
        type="button"
        onClick={() => navigate('/goals')}
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted hover:text-white"
      >
        Definí tu primer objetivo del trimestre
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/goals')}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 text-left shadow-xl transition-colors hover:border-accent/50"
      aria-label={`Objetivos: ${summary.avgPct}% promedio`}
    >
      <div className="flex items-center gap-2">
        <Target size={16} className="text-accent-light" aria-hidden="true" />
        <span className="text-caption uppercase tracking-eyebrow text-muted">Objetivos · {summary.label}</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">
          {summary.avgPct}<span className="text-muted text-base">%</span>
        </p>
        <p className="text-xs text-muted">{summary.total} activo{summary.total === 1 ? '' : 's'}</p>
      </div>
      {summary.topTitle && (
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
          <Flag size={14} className="text-amber-300" aria-hidden="true" />
          <span className="truncate text-white">{summary.topTitle}</span>
          <span className="ml-auto font-medium text-white">{summary.topPct}%</span>
        </div>
      )}
    </button>
  )
}
