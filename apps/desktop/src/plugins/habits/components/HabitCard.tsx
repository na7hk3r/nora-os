import { useMemo, useState } from 'react'
import { Flame, Check, Plus } from 'lucide-react'
import { useHabitsStore } from '../store'
import { toggleTodayLog, logHabit } from '../operations'
import { computeStats, fallbackColor, todayISO } from '../utils'
import type { HabitDefinition } from '../types'

interface Props {
  habit: HabitDefinition
}

/**
 * Tarjeta de hábito con toggle rápido del día.
 *  - Para target=1: click cumple/descumple el día.
 *  - Para target>1: click acumula +1; muestra contador progreso.
 */
export function HabitCard({ habit }: Props) {
  const logs = useHabitsStore((s) => s.logs)
  const [busy, setBusy] = useState(false)

  const habitLogs = useMemo(() => logs.filter((l) => l.habitId === habit.id), [logs, habit.id])
  const stats = useMemo(() => computeStats(habit, habitLogs), [habit, habitLogs])
  const todayLog = useMemo(() => habitLogs.find((l) => l.date === todayISO()), [habitLogs])
  const color = habit.color ?? fallbackColor(habit.name)

  const handleClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (habit.target === 1) {
        await toggleTodayLog(habit.id)
      } else {
        await logHabit({ habitId: habit.id, count: 1 })
      }
    } finally {
      setBusy(false)
    }
  }

  const completed = stats.completedThisPeriod
  const negativeViolation = habit.kind === 'negative' && (todayLog?.count ?? 0) > 0

  const ariaLabel = habit.kind === 'negative'
    ? `${habit.name}. Hoy: ${todayLog?.count ?? 0}. Marcar ocurrencia.`
    : `${habit.name}. ${completed ? 'Cumplido hoy' : 'No cumplido hoy'}. Tocar para registrar.`

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={completed}
      aria-label={ariaLabel}
      className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
        completed
          ? 'border-success/40 bg-success/10'
          : negativeViolation
          ? 'border-rose-400/40 bg-rose-500/5'
          : 'border-border bg-surface-light/80 hover:border-accent/50'
      } disabled:opacity-50`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
          completed ? 'text-white' : 'text-white/70'
        }`}
        style={{ backgroundColor: completed ? color : `${color}33`, border: `1px solid ${color}66` }}
        aria-hidden="true"
      >
        {completed ? <Check size={18} /> : habit.target > 1 ? `${todayLog?.count ?? 0}/${habit.target}` : <Plus size={18} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{habit.name}</p>
        <p className="text-caption text-muted">
          {habit.period === 'daily' ? 'Diario' : 'Semanal'}
          {habit.target > 1 && ` · meta ${habit.target}`}
          {habit.kind === 'negative' && ' · evitar'}
        </p>
      </div>
      {stats.streak >= 3 && (
        <span className="flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-amber-200" aria-label={`Racha de ${stats.streak} días`}>
          <Flame size={12} aria-hidden="true" />
          <span>{stats.streak}</span>
        </span>
      )}
    </button>
  )
}
