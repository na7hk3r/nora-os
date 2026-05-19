import { useMemo, useState } from 'react'
import { Trash2, Archive, ArchiveRestore, Save } from 'lucide-react'
import { useHabitsStore } from '../store'
import { archiveHabit, deleteHabit, unarchiveHabit, updateHabit } from '../operations'
import { HabitQuickAdd } from '../components/HabitQuickAdd'
import { messages } from '@core/ui/messages'
import { useToast } from '@core/ui/components/ToastProvider'
import type { HabitDefinition, HabitKind, HabitPeriod } from '../types'

/**
 * Página de administración (CRUD) de hábitos.
 */
export function HabitsManagePage() {
  const habits = useHabitsStore((s) => s.habits)
  const { toast } = useToast()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return [...habits].sort((a, b) => {
      if (a.archived !== b.archived) return a.archived ? 1 : -1
      return a.name.localeCompare(b.name)
    })
  }, [habits])

  const handleDelete = async (h: HabitDefinition) => {
    await deleteHabit(h.id)
    setConfirmDeleteId(null)
    toast.info(`Hábito "${h.name}" borrado.`)
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <p className="text-caption uppercase tracking-eyebrow text-muted">Hábitos</p>
        <h1 className="text-2xl font-semibold text-white">Administrar</h1>
        <p className="text-xs text-muted">Editá, archivá o borrá hábitos. Los logs históricos se conservan al archivar.</p>
      </header>

      <HabitQuickAdd />

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">{messages.empty.habitsAll}</p>
      ) : (
        <ul className="space-y-2" role="list">
          {sorted.map((h) => (
            <li key={h.id}>
              <HabitEditRow
                habit={h}
                onArchive={() => archiveHabit(h.id)}
                onUnarchive={() => unarchiveHabit(h.id)}
                onAskDelete={() => setConfirmDeleteId(h.id)}
              />
              {confirmDeleteId === h.id && (
                <div className="mt-1 flex items-center justify-between gap-2 rounded-md border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-white" role="alertdialog">
                  <span>{messages.confirm.deleteHabit(h.name)}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-md border border-border px-2 py-1 hover:border-white">
                      {messages.actions.cancel}
                    </button>
                    <button type="button" onClick={() => handleDelete(h)} className="rounded-md bg-rose-500 px-2 py-1 text-white hover:bg-rose-400">
                      {messages.actions.delete}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface RowProps {
  habit: HabitDefinition
  onArchive: () => Promise<void>
  onUnarchive: () => Promise<void>
  onAskDelete: () => void
}

function HabitEditRow({ habit, onArchive, onUnarchive, onAskDelete }: RowProps) {
  const [name, setName] = useState(habit.name)
  const [kind, setKind] = useState<HabitKind>(habit.kind)
  const [period, setPeriod] = useState<HabitPeriod>(habit.period)
  const [target, setTarget] = useState(habit.target)
  const [color, setColor] = useState(habit.color ?? '')
  const [busy, setBusy] = useState(false)
  const dirty = name !== habit.name || kind !== habit.kind || period !== habit.period || target !== habit.target || (color || null) !== habit.color

  const save = async () => {
    setBusy(true)
    try {
      await updateHabit(habit.id, { name, kind, period, target, color: color.trim() || null })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`flex flex-wrap items-end gap-2 rounded-2xl border p-3 ${habit.archived ? 'border-border/60 bg-surface/40 opacity-70' : 'border-border bg-surface-light/80'}`}>
      <div className="min-w-[10rem] flex-1">
        <label className="text-micro uppercase tracking-wider text-muted" htmlFor={`name-${habit.id}`}>Nombre</label>
        <input
          id={`name-${habit.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="block w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="text-micro uppercase tracking-wider text-muted" htmlFor={`kind-${habit.id}`}>Tipo</label>
        <select id={`kind-${habit.id}`} value={kind} onChange={(e) => setKind(e.target.value as HabitKind)} className="block rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent">
          <option value="positive">Hacer</option>
          <option value="negative">Evitar</option>
        </select>
      </div>
      <div>
        <label className="text-micro uppercase tracking-wider text-muted" htmlFor={`period-${habit.id}`}>Período</label>
        <select id={`period-${habit.id}`} value={period} onChange={(e) => setPeriod(e.target.value as HabitPeriod)} className="block rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent">
          <option value="daily">Diario</option>
          <option value="weekly">Semanal</option>
        </select>
      </div>
      <div>
        <label className="text-micro uppercase tracking-wider text-muted" htmlFor={`target-${habit.id}`}>Meta</label>
        <input id={`target-${habit.id}`} type="number" min={1} max={99} value={target} onChange={(e) => setTarget(Math.max(1, Number.parseInt(e.target.value, 10) || 1))} className="block w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent" />
      </div>
      <div>
        <label className="text-micro uppercase tracking-wider text-muted" htmlFor={`color-${habit.id}`}>Color</label>
        <input id={`color-${habit.id}`} type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="#60a5fa" className="block w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent" />
      </div>
      <div className="flex items-end gap-1">
        {dirty && (
          <button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/80 disabled:opacity-50">
            <Save size={12} aria-hidden="true" /> Guardar
          </button>
        )}
        {habit.archived ? (
          <button type="button" onClick={onUnarchive} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-white hover:border-accent" aria-label={`Desarchivar ${habit.name}`}>
            <ArchiveRestore size={12} aria-hidden="true" /> Reactivar
          </button>
        ) : (
          <button type="button" onClick={onArchive} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs text-white hover:border-accent" aria-label={`Archivar ${habit.name}`}>
            <Archive size={12} aria-hidden="true" /> Archivar
          </button>
        )}
        <button type="button" onClick={onAskDelete} className="inline-flex items-center gap-1 rounded-md border border-rose-400/40 px-3 py-2 text-xs text-rose-200 hover:border-rose-400" aria-label={`Borrar ${habit.name}`}>
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
