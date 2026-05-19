import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Play, Square } from 'lucide-react'
import { useTimeStore } from '../store'
import { entryDurationSec, formatDuration, startOfTodayISO, sumDurationSec } from '../utils'
import { startEntry, stopEntry } from '../operations'

export function TimeSummaryWidget() {
  const entries = useTimeStore((s) => s.entries)
  const projects = useTimeStore((s) => s.projects)
  const running = entries.find((e) => e.end === null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [running])

  const now = new Date()
  const todaySec = sumDurationSec(entries, startOfTodayISO(now), now)
  const runningSec = running ? entryDurationSec(running, now) : 0
  // tick is referenced to keep effect alive without pulling lint warnings.
  void tick

  const runningProject = running ? projects.find((p) => p.id === running.projectId) : null

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface-light/40 p-4">
      <Link to="/time" className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted hover:text-white">
        <Clock size={14} /> Tiempo
      </Link>

      <div className="space-y-1">
        <div className="text-2xl font-bold tabular-nums">{formatDuration(todaySec)}</div>
        <p className="text-xs text-muted">trackeado hoy</p>
      </div>

      {running ? (
        <button
          onClick={() => void stopEntry(running.id)}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 px-3 py-2 text-xs font-medium text-rose-100 transition-colors"
        >
          <Square size={12} />
          Detener · {formatDuration(runningSec)}
          {runningProject && <span className="text-rose-200/70">· {runningProject.name}</span>}
        </button>
      ) : (
        <button
          onClick={() => void startEntry({})}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-100 transition-colors"
        >
          <Play size={12} /> Iniciar entrada
        </button>
      )}
    </div>
  )
}
