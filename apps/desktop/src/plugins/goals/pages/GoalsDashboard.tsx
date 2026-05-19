import { useMemo, useState } from 'react'
import { Plus, Target, Trash2, TrendingUp, TrendingDown, Layers, Archive, CheckCircle2 } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useGoalsStore } from '../store'
import { computeGoalProgress, computeKRProgress, currentQuarter, formatPeriod, metricIdOf } from '../utils'
import {
  createGoal,
  createKeyResult,
  deleteGoal,
  archiveGoal,
  deleteKeyResult,
  setKRValue,
} from '../operations'
import type { Goal, GoalPeriod, KeyResultDirection } from '../types'

const PERIOD_OPTIONS: Array<{ value: GoalPeriod; label: string }> = [
  { value: 'q1', label: 'Q1' },
  { value: 'q2', label: 'Q2' },
  { value: 'q3', label: 'Q3' },
  { value: 'q4', label: 'Q4' },
  { value: 'year', label: 'Año' },
]

/**
 * Página principal del plugin Goals. Lista los objetivos, muestra avance
 * agregado y permite crear OKRs nuevos + actualizar KRs manuales.
 */
export function GoalsDashboard() {
  const goals = useGoalsStore((s) => s.goals)
  const keyResults = useGoalsStore((s) => s.keyResults)

  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState<'current' | 'all' | 'completed'>('current')

  const visible = useMemo(() => {
    const year = new Date().getFullYear()
    const period = currentQuarter()
    if (filter === 'completed') return goals.filter((g) => g.status === 'completed')
    if (filter === 'all') return goals.filter((g) => g.status !== 'archived')
    return goals.filter(
      (g) => g.status === 'active' && g.year === year && (g.period === period || g.period === 'year'),
    )
  }, [goals, filter])

  const overall = useMemo(() => {
    if (visible.length === 0) return { avg: 0, total: 0 }
    let sum = 0
    for (const g of visible) sum += computeGoalProgress(g, keyResults).percent
    return { avg: Math.round(sum / visible.length), total: visible.length }
  }, [visible, keyResults])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <BrandIcon name="TreasureMap" size={44} />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">Objetivos / OKRs</p>
            <h1 className="text-2xl font-bold text-white">
              {overall.total === 0 ? '—' : `${overall.avg}%`}
            </h1>
            <p className="text-xs text-muted">
              {overall.total === 0
                ? 'Definí tu primer objetivo del trimestre'
                : `Avance promedio · ${overall.total} objetivo${overall.total === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(['current', 'all', 'completed'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 ${
                filter === f
                  ? 'border-accent/50 bg-surface text-white'
                  : 'border-border bg-surface text-muted hover:text-white'
              }`}
            >
              {f === 'current' ? 'Actuales' : f === 'all' ? 'Todos' : 'Cumplidos'}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <Plus size={12} aria-hidden="true" />
            {showAdd ? 'Cerrar' : 'Nuevo objetivo'}
          </button>
        </div>
      </header>

      {showAdd && <NewGoalForm onCreated={() => setShowAdd(false)} />}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 py-12 text-center text-muted">
          <BrandIcon name="TreasureMap" size={48} tile={false} className="opacity-40" />
          <p className="text-sm">Sin objetivos en este filtro.</p>
          <p className="text-xs">Definí tu primer objetivo del trimestre con “Nuevo objetivo”.</p>
        </div>
      ) : (
        <ul className="max-h-[560px] space-y-3 overflow-y-auto pr-1" role="list" aria-label="Lista de objetivos">
          {visible.map((g) => (
            <li key={g.id}>
              <GoalCard goal={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Form: nuevo objetivo ────────────────────────────────────────────

function NewGoalForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [period, setPeriod] = useState<GoalPeriod>(currentQuarter())
  const [year, setYear] = useState(new Date().getFullYear())
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || submitting) return
    setSubmitting(true)
    try {
      await createGoal({ title, description, period, year })
      setTitle('')
      setDescription('')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-surface-light/80 p-4 shadow-xl"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="md:col-span-3 text-xs">
          <span className="mb-1 block text-muted">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
            placeholder="Ej: Lanzar v2 del producto"
            required
          />
        </label>
        <label className="text-xs md:col-span-3">
          <span className="mb-1 block text-muted">Descripción (opcional)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
            rows={2}
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Período</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as GoalPeriod)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Año</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white"
          />
        </label>
        <div className="flex items-end justify-end">
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="rounded-full border border-accent/40 bg-accent/10 px-4 py-2 text-xs text-white hover:border-accent/70 disabled:opacity-50"
          >
            Crear objetivo
          </button>
        </div>
      </div>
    </form>
  )
}

// ─── Goal card ───────────────────────────────────────────────────────

function GoalCard({ goal }: { goal: Goal }) {
  const keyResults = useGoalsStore((s) => s.keyResults)
  const krs = useMemo(() => keyResults.filter((k) => k.goalId === goal.id), [keyResults, goal.id])
  const progress = computeGoalProgress(goal, keyResults)
  const [showAddKR, setShowAddKR] = useState(false)

  return (
    <article className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-accent-light" aria-hidden="true" />
            <h2 className="truncate text-base font-semibold text-white">{goal.title}</h2>
            {goal.status === 'completed' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-micro uppercase tracking-wide text-success">
                <CheckCircle2 size={10} aria-hidden="true" /> cumplido
              </span>
            )}
          </div>
          <p className="text-caption text-muted">{formatPeriod(goal.period, goal.year)}</p>
          {goal.description && (
            <p className="mt-1 text-xs text-muted">{goal.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowAddKR((v) => !v)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-caption text-white hover:border-accent/50"
            title="Agregar Key Result"
          >
            <Plus size={12} aria-hidden="true" />
          </button>
          {goal.status !== 'archived' && (
            <button
              type="button"
              onClick={() => { void archiveGoal(goal.id) }}
              className="rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted hover:text-white"
              title="Archivar"
            >
              <Archive size={12} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Eliminar "${goal.title}" y todos sus KRs?`)) {
                void deleteGoal(goal.id)
              }
            }}
            className="rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted hover:text-danger"
            title="Eliminar"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mt-3">
        <div className="flex items-center justify-between text-caption text-muted">
          <span>Avance</span>
          <span className="font-semibold text-white">{progress.percent}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-accent"
            style={{ width: `${Math.min(100, progress.percent)}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      {showAddKR && <NewKRForm goalId={goal.id} onCreated={() => setShowAddKR(false)} />}

      {krs.length > 0 ? (
        <ul className="mt-4 space-y-2" role="list" aria-label="Key Results">
          {krs.map((k) => (
            <li key={k.id}>
              <KRRow krId={k.id} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted">Sin Key Results todavía.</p>
      )}
    </article>
  )
}

// ─── KR row ──────────────────────────────────────────────────────────

function KRRow({ krId }: { krId: string }) {
  const kr = useGoalsStore((s) => s.keyResults.find((k) => k.id === krId))
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!kr) return null
  const progress = computeKRProgress(kr)
  const metricId = metricIdOf(kr.source)
  const isManual = kr.source === 'manual'
  const DirectionIcon = kr.direction === 'increase' ? TrendingUp : TrendingDown

  async function commit() {
    const value = Number(draft)
    if (Number.isFinite(value) && kr) {
      await setKRValue(kr.id, value)
    }
    setEditing(false)
    setDraft('')
  }

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        <DirectionIcon size={14} className={progress.done ? 'text-success' : 'text-muted'} aria-hidden="true" />
        <span className="truncate text-sm text-white">{kr.name}</span>
        <span className="ml-auto text-xs font-semibold text-white">{progress.percent}%</span>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Eliminar KR "${kr.name}"?`)) void deleteKeyResult(kr.id)
          }}
          className="text-muted hover:text-danger"
          title="Eliminar"
        >
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-light">
        <div
          className={`h-full ${progress.done ? 'bg-success' : 'bg-accent'}`}
          style={{ width: `${Math.min(100, progress.percent)}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-caption text-muted">
        <span>
          {isManual ? 'Manual' : (
            <span className="inline-flex items-center gap-1">
              <Layers size={10} aria-hidden="true" /> {metricId}
            </span>
          )}
          {' · '}
          {kr.currentValue}
          {kr.unit ? ` ${kr.unit}` : ''} / {kr.targetValue}
          {kr.unit ? ` ${kr.unit}` : ''}
        </span>
        {isManual && (
          editing ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                type="number"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') void commit(); if (e.key === 'Escape') { setEditing(false); setDraft('') } }}
                className="w-20 rounded border border-border bg-surface-light px-1.5 py-0.5 text-xs text-white"
              />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => { setDraft(String(kr.currentValue)); setEditing(true) }}
              className="text-accent-light hover:underline"
            >
              Actualizar
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ─── Form: nuevo KR ──────────────────────────────────────────────────

function NewKRForm({ goalId, onCreated }: { goalId: string; onCreated: () => void }) {
  const [name, setName] = useState('')
  const [sourceType, setSourceType] = useState<'manual' | 'metric'>('manual')
  const [metric, setMetric] = useState('work.focus_hours')
  const [direction, setDirection] = useState<KeyResultDirection>('increase')
  const [baseline, setBaseline] = useState(0)
  const [target, setTarget] = useState(100)
  const [unit, setUnit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const SUGGESTED_METRICS = [
    'work.focus_hours',
    'work.tasks_completed',
    'habits.top_streak',
    'habits.completion_rate_30d',
    'finance.savings',
    'fitness.weight',
  ]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await createKeyResult({
        goalId,
        name,
        source: sourceType === 'manual' ? 'manual' : (`metric:${metric}` as const),
        baseline,
        targetValue: target,
        unit: unit || null,
        direction,
      })
      setName('')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="text-xs md:col-span-2">
          <span className="mb-1 block text-muted">Nombre del Key Result</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
            placeholder="Ej: Sumar 80h de foco"
            required
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Origen</span>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as 'manual' | 'metric')}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
          >
            <option value="manual">Manual</option>
            <option value="metric">Métrica de plugin</option>
          </select>
        </label>
        {sourceType === 'metric' && (
          <label className="text-xs">
            <span className="mb-1 block text-muted">Métrica</span>
            <input
              list="goals-metric-suggestions"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
              placeholder="plugin.metric_id"
            />
            <datalist id="goals-metric-suggestions">
              {SUGGESTED_METRICS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </label>
        )}
        <label className="text-xs">
          <span className="mb-1 block text-muted">Dirección</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as KeyResultDirection)}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
          >
            <option value="increase">Aumentar ↑</option>
            <option value="decrease">Reducir ↓</option>
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Baseline</span>
          <input
            type="number"
            value={baseline}
            onChange={(e) => setBaseline(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Target</span>
          <input
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-muted">Unidad (opcional)</span>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm text-white"
            placeholder="hs, $, kg…"
          />
        </label>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs text-white hover:border-accent/70 disabled:opacity-50"
        >
          Agregar KR
        </button>
      </div>
    </form>
  )
}
