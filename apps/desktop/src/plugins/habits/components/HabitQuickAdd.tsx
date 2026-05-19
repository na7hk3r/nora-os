import { useState } from 'react'
import { Plus } from 'lucide-react'
import { createHabit } from '../operations'
import type { HabitKind, HabitPeriod } from '../types'
import { messages } from '@core/ui/messages'

/**
 * Form inline para crear un hábito en pocos campos. Sin modal.
 */
export function HabitQuickAdd({ onCreated }: { onCreated?: () => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<HabitKind>('positive')
  const [period, setPeriod] = useState<HabitPeriod>('daily')
  const [target, setTarget] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(messages.errors.habitNameInvalid)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await createHabit({ name: name.trim(), kind, period, target })
      setName('')
      setTarget(1)
      onCreated?.()
    } catch {
      setError(messages.errors.habitCreate)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={handleCreate}
      className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface-light/80 p-3"
      aria-label="Crear hábito"
    >
      <div className="min-w-[10rem] flex-1">
        <label htmlFor="habit-new-name" className="text-micro uppercase tracking-wider text-muted">Nombre</label>
        <input
          id="habit-new-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Leer 20 minutos"
          maxLength={60}
          className="block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor="habit-new-kind" className="text-micro uppercase tracking-wider text-muted">Tipo</label>
        <select
          id="habit-new-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as HabitKind)}
          className="block rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
        >
          <option value="positive">Hacer</option>
          <option value="negative">Evitar</option>
        </select>
      </div>
      <div>
        <label htmlFor="habit-new-period" className="text-micro uppercase tracking-wider text-muted">Período</label>
        <select
          id="habit-new-period"
          value={period}
          onChange={(e) => setPeriod(e.target.value as HabitPeriod)}
          className="block rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
        >
          <option value="daily">Diario</option>
          <option value="weekly">Semanal</option>
        </select>
      </div>
      <div>
        <label htmlFor="habit-new-target" className="text-micro uppercase tracking-wider text-muted">Meta</label>
        <input
          id="habit-new-target"
          type="number"
          min={1}
          max={99}
          value={target}
          onChange={(e) => setTarget(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          className="block w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/80 disabled:opacity-50"
      >
        <Plus size={14} aria-hidden="true" />
        Agregar
      </button>
      {error && <p className="basis-full text-xs text-rose-300" role="alert">{error}</p>}
    </form>
  )
}
