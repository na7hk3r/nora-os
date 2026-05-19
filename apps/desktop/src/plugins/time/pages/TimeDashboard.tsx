import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Square, Trash2, FolderKanban, Plus } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useI18n } from '@core/i18n'
import { useTimeStore } from '../store'
import {
  createManualEntry,
  deleteEntry,
  startEntry,
  stopEntry,
  updateEntry,
} from '../operations'
import {
  entryDurationSec,
  formatDuration,
  startOfTodayISO,
  startOfWeekISO,
  sumDurationSec,
} from '../utils'

export function TimeDashboard() {
  const { formatDateTime } = useI18n()
  const entries = useTimeStore((s) => s.entries)
  const projects = useTimeStore((s) => s.projects)
  const running = entries.find((e) => e.end === null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [running])
  void tick

  const now = new Date()
  const todaySec = sumDurationSec(entries, startOfTodayISO(now), now)
  const weekSec = sumDurationSec(entries, startOfWeekISO(now), now)
  const billableWeekSec = sumDurationSec(
    entries.filter((e) => e.billable),
    startOfWeekISO(now),
    now,
  )

  const recent = useMemo(() => entries.slice(0, 30), [entries])

  return (
    <div className="w-full space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <BrandIcon name="HourGlass" size={44} />
          <div>
            <h1 className="text-2xl font-bold">Tiempo</h1>
            <p className="text-sm text-muted">Time tracking manual y automático desde sesiones de Focus.</p>
          </div>
        </div>
        <Link
          to="/time/projects"
          className="flex items-center gap-2 rounded-lg border border-border bg-surface-light/60 px-3 py-2 text-sm hover:border-accent/40"
        >
          <FolderKanban size={14} /> Proyectos
        </Link>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hoy" value={formatDuration(todaySec)} />
        <StatCard label="Esta semana" value={formatDuration(weekSec)} />
        <StatCard label="Facturable (semana)" value={formatDuration(billableWeekSec)} />
      </div>

      {/* Running / Start controls */}
      <RunningPanel
        runningId={running?.id ?? null}
        runningSec={running ? entryDurationSec(running, now) : 0}
        runningProjectId={running?.projectId ?? null}
        projects={projects}
      />

      {/* Manual quick add */}
      <ManualEntryForm projects={projects} />

      {/* Recent entries */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Entradas recientes</h2>
        {recent.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 py-12 text-center text-muted">
            <BrandIcon name="HourGlass" size={48} tile={false} className="opacity-40" />
            <p className="text-sm">Aún no registraste tiempo.</p>
            <p className="text-xs">Iniciá una entrada arriba o completá una sesión de Focus.</p>
          </div>
        )}
        <div className="max-h-[420px] divide-y divide-border overflow-y-auto rounded-2xl border border-border bg-surface-light/40">
          {recent.map((entry) => {
            const project = projects.find((p) => p.id === entry.projectId)
            const isRunning = entry.end === null
            const dur = entryDurationSec(entry, now)
            return (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: project?.color ?? '#475569' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">
                    {project?.name ?? 'Sin proyecto'}
                    {entry.note && <span className="text-muted font-normal"> · {entry.note}</span>}
                  </div>
                  <div className="text-xs text-muted">
                    {formatDateTime(entry.start)}
                    {entry.source === 'focus' && ' · auto desde Focus'}
                    {entry.billable && ' · facturable'}
                  </div>
                </div>
                <span className={`tabular-nums text-sm ${isRunning ? 'text-emerald-300 font-semibold' : ''}`}>
                  {formatDuration(dur)}
                </span>
                {isRunning ? (
                  <button
                    onClick={() => void stopEntry(entry.id)}
                    className="rounded-md p-1.5 text-rose-300 hover:bg-rose-500/10"
                    title="Detener"
                  >
                    <Square size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => void updateEntry(entry.id, { billable: !entry.billable })}
                      className="rounded-md px-2 py-1 text-micro uppercase tracking-wider text-muted hover:text-white"
                    >
                      {entry.billable ? 'no fact.' : 'fact.'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta entrada?')) void deleteEntry(entry.id)
                      }}
                      className="rounded-md p-1.5 text-muted hover:text-rose-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[96px] rounded-2xl border border-border bg-surface-light/40 p-4">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  )
}

function RunningPanel({
  runningId,
  runningSec,
  runningProjectId,
  projects,
}: {
  runningId: string | null
  runningSec: number
  runningProjectId: string | null
  projects: ReturnType<typeof useTimeStore.getState>['projects']
}) {
  const [projectId, setProjectId] = useState<string | ''>('')
  const [billable, setBillable] = useState(false)
  const [note, setNote] = useState('')

  if (runningId) {
    const project = projects.find((p) => p.id === runningProjectId)
    return (
      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-emerald-200">En curso</p>
            <p className="text-3xl font-bold tabular-nums text-emerald-100">{formatDuration(runningSec)}</p>
            {project && <p className="text-sm text-emerald-200/80 mt-1">{project.name}</p>}
          </div>
          <button
            onClick={() => void stopEntry(runningId)}
            className="flex items-center gap-2 rounded-lg bg-rose-500/30 hover:bg-rose-500/40 px-4 py-2.5 text-sm font-medium text-rose-100 transition-colors"
          >
            <Square size={14} /> Detener
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-light/40 p-5 space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted">Iniciar entrada</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
        >
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
        />
        <button
          onClick={() => {
            void startEntry({ projectId: projectId || null, billable, note })
            setNote('')
          }}
          className="flex items-center gap-2 rounded-lg bg-emerald-500/90 hover:bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <Play size={14} /> Iniciar
        </button>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border bg-surface text-accent focus:ring-accent/40"
        />
        Marcar como facturable
      </label>
    </section>
  )
}

function ManualEntryForm({
  projects,
}: {
  projects: ReturnType<typeof useTimeStore.getState>['projects']
}) {
  const [projectId, setProjectId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [billable, setBillable] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    setError(null)
    try {
      const startISO = new Date(start).toISOString()
      const endISO = new Date(end).toISOString()
      void createManualEntry({
        projectId: projectId || null,
        start: startISO,
        end: endISO,
        billable,
        note,
      })
      setStart('')
      setEnd('')
      setNote('')
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar')
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-light/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted">Entrada manual</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] items-end">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
        >
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
        />
        <input
          type="datetime-local"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota"
          className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
        />
        <button
          onClick={submit}
          disabled={!start || !end}
          className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent/80 disabled:opacity-40 px-3 py-2 text-sm font-medium text-white transition-colors"
        >
          <Plus size={14} /> Agregar
        </button>
      </div>
      <label className="inline-flex items-center gap-2 text-xs text-muted cursor-pointer">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-border bg-surface text-accent focus:ring-accent/40"
        />
        Facturable
      </label>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </section>
  )
}
