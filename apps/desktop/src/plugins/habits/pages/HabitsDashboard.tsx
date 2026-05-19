import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, History, Repeat } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useHabitsStore } from '../store'
import { HabitCard } from '../components/HabitCard'
import { HabitQuickAdd } from '../components/HabitQuickAdd'
import { computeStats } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Página principal del plugin Hábitos. Lista vertical de hábitos activos
 * con toggle rápido del día.
 */
export function HabitsDashboard() {
  const navigate = useNavigate()
  const habits = useHabitsStore((s) => s.habits)
  const logs = useHabitsStore((s) => s.logs)
  const [showAdd, setShowAdd] = useState(false)

  const active = useMemo(() => habits.filter((h) => !h.archived), [habits])

  const overall = useMemo(() => {
    let completed = 0
    for (const h of active) {
      const stats = computeStats(h, logs.filter((l) => l.habitId === h.id))
      if (stats.completedThisPeriod) completed += 1
    }
    return { completed, total: active.length }
  }, [active, logs])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <BrandIcon name="Fire" size={44} />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">Hábitos</p>
            <h1 className="text-2xl font-bold text-white">
              {active.length === 0 ? '—' : `${overall.completed}/${overall.total}`}
            </h1>
            <p className="text-xs text-muted">
              {active.length === 0 ? messages.empty.habitsAll : 'Cumplidos en el período actual'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <Repeat size={12} aria-hidden="true" />
            {showAdd ? 'Cerrar' : 'Nuevo hábito'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/habits/history')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <History size={12} aria-hidden="true" />
            Historial
          </button>
          <button
            type="button"
            onClick={() => navigate('/habits/manage')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <Settings size={12} aria-hidden="true" />
            Administrar
          </button>
        </div>
      </header>

      {showAdd && <HabitQuickAdd onCreated={() => setShowAdd(false)} />}

      {active.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 py-12 text-center text-muted">
          <BrandIcon name="Fire" size={48} tile={false} className="opacity-40" />
          <p className="text-sm">{messages.empty.habitsAll}</p>
          <p className="text-xs">Tocá “Nuevo hábito” para arrancar tu primera racha.</p>
        </div>
      ) : (
        <ul className="grid max-h-[520px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2" role="list" aria-label="Lista de hábitos">
          {active.map((h) => (
            <li key={h.id}>
              <HabitCard habit={h} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
