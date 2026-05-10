import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Pause, Play, Square, TimerReset, X, XCircle } from 'lucide-react'
import {
  postWorkFocusCommand,
  WORK_FOCUS_CHANNEL,
  type WorkFocusMessage,
  type WorkFocusSnapshot,
} from '../focusSync'

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const EMPTY_SNAPSHOT: WorkFocusSnapshot = {
  active: false,
  sessionId: null,
  taskId: null,
  title: 'Sin foco activo',
  startedAt: null,
  paused: false,
  elapsedMs: 0,
  updatedAt: Date.now(),
}

export function WorkFocusMiniPage() {
  const [snapshot, setSnapshot] = useState<WorkFocusSnapshot>(EMPTY_SNAPSHOT)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const channel = new BroadcastChannel(WORK_FOCUS_CHANNEL)
    channel.onmessage = (event: MessageEvent<WorkFocusMessage>) => {
      const message = event.data
      if (message?.type === 'snapshot') setSnapshot(message.snapshot)
    }
    postWorkFocusCommand('request-snapshot')
    return () => channel.close()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  const elapsedMs = useMemo(() => {
    if (!snapshot.active || snapshot.paused) return snapshot.elapsedMs
    return snapshot.elapsedMs + Math.max(0, now - snapshot.updatedAt)
  }, [now, snapshot])

  const statusLabel = snapshot.active
    ? snapshot.paused
      ? 'Pausado'
      : 'En foco'
    : 'Disponible'

  const openWork = () => {
    postWorkFocusCommand('open-work')
    void window.workFocusWindow?.focusMain()
  }

  return (
    <main className="flex h-screen select-none overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(106,57,246,0.22),_rgba(17,17,17,0.98)_54%,_#08080b_100%)] p-2 text-white">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-surface/95 shadow-2xl shadow-black/40">
        <header className="[-webkit-app-region:drag] flex items-center justify-between gap-3 border-b border-border/70 bg-surface-light/75 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent/10 text-accent-light">
              <TimerReset size={15} aria-hidden />
            </span>
            <span className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-muted">Nora Focus</span>
          </div>
          <button
            type="button"
            onClick={() => void window.workFocusWindow?.close()}
            className="[-webkit-app-region:no-drag] rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-white"
            aria-label="Cerrar timer"
          >
            <X size={14} aria-hidden />
          </button>
        </header>

        <section className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3.5">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className={`text-caption uppercase tracking-[0.16em] ${snapshot.active && !snapshot.paused ? 'text-success' : snapshot.paused ? 'text-warning' : 'text-muted'}`}>
                {statusLabel}
              </p>
              {snapshot.startedAt && (
                <p className="shrink-0 text-micro text-muted">
                  {new Date(snapshot.startedAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
            <h1 className="mt-1.5 line-clamp-2 min-h-[2.4rem] text-sm font-semibold leading-snug text-white">
              {snapshot.title}
            </h1>
          </div>

          <div className="my-3.5 rounded-xl border border-border/80 bg-surface-light/55 px-4 py-3.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className={`text-[2.65rem] font-semibold leading-none tabular-nums ${snapshot.paused ? 'text-warning' : 'text-white'}`}>
              {formatDuration(elapsedMs)}
            </p>
            <div className="mx-auto mt-3 h-1 w-20 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full ${snapshot.paused ? 'bg-warning' : snapshot.active ? 'bg-success' : 'bg-accent'}`}
                style={{ width: snapshot.active ? '100%' : '38%' }}
              />
            </div>
          </div>

          <div className="mt-auto rounded-xl border border-border/70 bg-surface-light/45 p-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {!snapshot.active ? (
                <button
                  type="button"
                  onClick={() => postWorkFocusCommand('start-free')}
                  className="col-span-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-light transition-colors hover:bg-accent/20"
                >
                  <Play size={13} aria-hidden />
                  Start libre
                </button>
              ) : snapshot.paused ? (
                <button
                  type="button"
                  onClick={() => postWorkFocusCommand('resume')}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-medium text-accent-light transition-colors hover:bg-accent/20"
                >
                  <Play size={13} aria-hidden />
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => postWorkFocusCommand('pause')}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs font-medium text-warning transition-colors hover:bg-warning/20"
                >
                  <Pause size={13} aria-hidden />
                  Pause
                </button>
              )}

              {snapshot.active && (
                <button
                  type="button"
                  onClick={() => postWorkFocusCommand('stop')}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs font-medium text-success transition-colors hover:bg-success/20"
                >
                  <Square size={13} aria-hidden />
                  Stop
                </button>
              )}

              {snapshot.active && (
                <button
                  type="button"
                  onClick={() => postWorkFocusCommand('cancel')}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-medium text-danger transition-colors hover:bg-danger/20"
                >
                  <XCircle size={13} aria-hidden />
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={openWork}
                className={`${snapshot.active ? '' : 'col-span-2'} inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent/30 hover:text-white`}
              >
                <ExternalLink size={13} aria-hidden />
                Abrir Work
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
