import { useEffect, useMemo, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'
import type { EventLogEntry } from '@core/types'
import { eventBus } from '@core/events/EventBus'
import { useWorkStore } from '../store'
import {
  completeWorkFocusSession,
  completeWorkTask,
  getEffectiveDuration,
  interruptWorkFocusSession,
  pauseWorkFocusSession,
  resumeWorkFocusSession,
  startWorkFocusSession,
  stopWorkTask,
} from '../focus'
import { WORK_EVENTS } from '../events'
import { KanbanBoard } from '../components/KanbanBoard'
import { useFocusNudge } from '../components/useFocusNudge'
import { CheckCircle2, ClipboardList, ExternalLink, History, KanbanSquare, ListChecks, NotebookPen, Sparkles, TimerReset, Play, Pause, Square, XCircle } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useToast } from '@core/ui/components/ToastProvider'
import { useI18n } from '@core/i18n'

const WORK_ACTIVITY_EVENTS: Set<string> = new Set([
  WORK_EVENTS.TASK_CREATED,
  WORK_EVENTS.TASK_UPDATED,
  WORK_EVENTS.TASK_COMPLETED,
  WORK_EVENTS.TASK_DELETED,
  WORK_EVENTS.TASK_MOVED,
  WORK_EVENTS.TASK_STARTED,
  WORK_EVENTS.TASK_SWITCHED,
  WORK_EVENTS.FOCUS_STARTED,
  WORK_EVENTS.FOCUS_PAUSED,
  WORK_EVENTS.FOCUS_RESUMED,
  WORK_EVENTS.FOCUS_COMPLETED,
  WORK_EVENTS.FOCUS_INTERRUPTED,
  WORK_EVENTS.NOTE_CREATED,
])

const EVENT_LABELS: Record<string, string> = {
  [WORK_EVENTS.TASK_CREATED]: 'Nueva tarea creada',
  [WORK_EVENTS.TASK_UPDATED]: 'Tarea actualizada',
  [WORK_EVENTS.TASK_COMPLETED]: 'Tarea completada',
  [WORK_EVENTS.TASK_DELETED]: 'Tarea eliminada',
  [WORK_EVENTS.TASK_MOVED]: 'Tarea movida',
  [WORK_EVENTS.TASK_STARTED]: 'Tarea iniciada',
  [WORK_EVENTS.TASK_SWITCHED]: 'Cambio de tarea',
  [WORK_EVENTS.FOCUS_STARTED]: 'Foco iniciado',
  [WORK_EVENTS.FOCUS_PAUSED]: 'Foco pausado',
  [WORK_EVENTS.FOCUS_RESUMED]: 'Foco reanudado',
  [WORK_EVENTS.FOCUS_COMPLETED]: 'Foco completado',
  [WORK_EVENTS.FOCUS_INTERRUPTED]: 'Foco interrumpido',
  [WORK_EVENTS.NOTE_CREATED]: 'Nota creada',
}

const EVENT_ACCENT: Record<string, string> = {
  [WORK_EVENTS.TASK_CREATED]: 'text-sky-300',
  [WORK_EVENTS.TASK_UPDATED]: 'text-amber-300',
  [WORK_EVENTS.TASK_COMPLETED]: 'text-success',
  [WORK_EVENTS.TASK_DELETED]: 'text-danger',
  [WORK_EVENTS.TASK_MOVED]: 'text-sky-300',
  [WORK_EVENTS.TASK_STARTED]: 'text-accent-light',
  [WORK_EVENTS.TASK_SWITCHED]: 'text-amber-300',
  [WORK_EVENTS.FOCUS_STARTED]: 'text-accent-light',
  [WORK_EVENTS.FOCUS_PAUSED]: 'text-warning',
  [WORK_EVENTS.FOCUS_RESUMED]: 'text-accent-light',
  [WORK_EVENTS.FOCUS_COMPLETED]: 'text-success',
  [WORK_EVENTS.FOCUS_INTERRUPTED]: 'text-danger',
  [WORK_EVENTS.NOTE_CREATED]: 'text-purple-300',
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatRelative(timestamp: string) {
  const elapsedMs = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.max(1, Math.floor(elapsedMs / 60_000))
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

interface ActivityDetails {
  /** Texto principal: título de la entidad afectada (tarea/nota). */
  primary: string | null
  /** Subtexto: contexto adicional (ej. "→ Hecho", "12 min"). */
  secondary: string | null
}

interface ActivityContext {
  cardsById: Map<string, { title: string }>
  notesById: Map<string, { title: string }>
  columnsById: Map<string, { name: string }>
}

function safeParsePayload(raw: string): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatShortDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 1) return `${totalSeconds}s`
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remMin = minutes % 60
  return remMin === 0 ? `${hours}h` : `${hours}h ${remMin}m`
}

function describeActivity(entry: EventLogEntry, ctx: ActivityContext): ActivityDetails {
  const payload = safeParsePayload(entry.payload)

  const taskId = asString(payload.taskId) ?? asString(payload.cardId) ?? asString(payload.id)
  const taskTitle =
    asString(payload.title) ?? (taskId ? ctx.cardsById.get(taskId)?.title ?? null : null)

  switch (entry.event_type) {
    case WORK_EVENTS.TASK_CREATED:
    case WORK_EVENTS.TASK_UPDATED:
    case WORK_EVENTS.TASK_DELETED:
    case WORK_EVENTS.TASK_STARTED:
      return { primary: taskTitle, secondary: null }

    case WORK_EVENTS.TASK_COMPLETED: {
      const colId = asString(payload.columnId)
      const colName = colId ? ctx.columnsById.get(colId)?.name ?? null : null
      return { primary: taskTitle, secondary: colName ? `→ ${colName}` : null }
    }

    case WORK_EVENTS.TASK_MOVED: {
      const fromId = asString(payload.fromColumn)
      const toId = asString(payload.toColumn)
      const fromName = fromId ? ctx.columnsById.get(fromId)?.name ?? null : null
      const toName = toId ? ctx.columnsById.get(toId)?.name ?? null : null
      const arrow = fromName && toName ? `${fromName} → ${toName}` : toName ? `→ ${toName}` : null
      return { primary: taskTitle, secondary: arrow }
    }

    case WORK_EVENTS.TASK_SWITCHED: {
      const fromId = asString(payload.fromTaskId)
      const toId = asString(payload.toTaskId)
      const fromTitle = fromId ? ctx.cardsById.get(fromId)?.title ?? null : null
      const toTitle = toId ? ctx.cardsById.get(toId)?.title ?? taskTitle : taskTitle
      const arrow = fromTitle && toTitle ? `${fromTitle} → ${toTitle}` : toTitle
      return { primary: arrow, secondary: null }
    }

    case WORK_EVENTS.FOCUS_STARTED:
    case WORK_EVENTS.FOCUS_PAUSED:
    case WORK_EVENTS.FOCUS_RESUMED:
      return { primary: taskTitle ?? 'Foco libre', secondary: null }

    case WORK_EVENTS.FOCUS_COMPLETED:
    case WORK_EVENTS.FOCUS_INTERRUPTED: {
      const duration = asNumber(payload.duration)
      return {
        primary: taskTitle ?? 'Foco libre',
        secondary: duration != null ? formatShortDuration(duration) : null,
      }
    }

    case WORK_EVENTS.NOTE_CREATED: {
      const noteId = asString(payload.id)
      const noteTitle =
        asString(payload.title) ?? (noteId ? ctx.notesById.get(noteId)?.title ?? null : null)
      return { primary: noteTitle ?? 'Nota sin título', secondary: null }
    }

    default:
      return { primary: taskTitle, secondary: null }
  }
}

export function WorkDashboard() {
  const { boards, columns, cards, notes, focusSessions, currentFocusSession } = useWorkStore()
  const { toast } = useToast()
  const { formatDate } = useI18n()
  useFocusNudge()
  const [now, setNow] = useState(Date.now())
  const [recentEvents, setRecentEvents] = useState<EventLogEntry[]>([])
  const [openingFocusWindow, setOpeningFocusWindow] = useState(false)
  // Objetivo de Pomodoro en minutos (persistido en localStorage).
  const [pomodoroGoalMin, setPomodoroGoalMin] = useState<number>(() => {
    if (typeof window === 'undefined') return 25
    const raw = window.localStorage.getItem('work.pomodoroGoalMin')
    const n = raw ? Number.parseInt(raw, 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : 25
  })
  // Horas de jornada laboral configuradas en el Control Center (pluginSettings:work).
  const [workdayHours, setWorkdayHours] = useState<number>(8)
  // Evita notificar varias veces por la misma sesión.
  const [notifiedSessionId, setNotifiedSessionId] = useState<string | null>(null)
  const totalCards = cards.length
  const totalNotes = notes.length

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('work.pomodoroGoalMin', String(pomodoroGoalMin))
  }, [pomodoroGoalMin])

  // Lee la jornada laboral desde settings (pluginSettings:work) y se mantiene viva
  // ante cambios disparados desde el Control Center via storage event.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!window.storage) return
      try {
        const rows = await window.storage.query(
          `SELECT value FROM settings WHERE key = ? LIMIT 1`,
          ['pluginSettings:work'],
        )
        const value = (rows as Array<{ value: string }> | undefined)?.[0]?.value
        if (!value || cancelled) return
        const parsed = JSON.parse(value) as { workdayHours?: number }
        if (typeof parsed.workdayHours === 'number' && parsed.workdayHours > 0) {
          setWorkdayHours(parsed.workdayHours)
        }
      } catch {
        // settings no disponible — mantener default.
      }
    }
    void load()
    const handler = () => { void load() }
    window.addEventListener('focus', handler)
    return () => {
      cancelled = true
      window.removeEventListener('focus', handler)
    }
  }, [])

  // Solicitar permiso de notificación una única vez.
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!currentFocusSession || currentFocusSession.pausedAt) return undefined

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [currentFocusSession])

  useEffect(() => {
    const loadRecentEvents = () => {
      storageAPI
        .getRecentEvents(40)
        .then((events) => {
          setRecentEvents(
            events.filter((entry) => entry.source === 'work' || WORK_ACTIVITY_EVENTS.has(entry.event_type)).slice(0, 5),
          )
        })
        .catch(() => {})
    }

    loadRecentEvents()

    const unsubscribes = Array.from(WORK_ACTIVITY_EVENTS).map((eventName) =>
      eventBus.on(eventName, loadRecentEvents),
    )

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const currentTask = currentFocusSession
    ? cards.find((card) => card.id === currentFocusSession.taskId) ?? null
    : null

  const todayMetrics = useMemo(() => {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const sessionsToday = focusSessions.filter((session) => session.startTime >= startOfDay.getTime())
    const totalFocusMs = sessionsToday.reduce((sum, session) => {
      return sum + getEffectiveDuration(session, now)
    }, 0)
    const completedSessions = sessionsToday.filter((session) => session.endTime && !session.interrupted).length
    const efficiency = sessionsToday.length === 0 ? 0 : Math.round((completedSessions / sessionsToday.length) * 100)

    return {
      sessionsToday,
      totalFocusMs,
      efficiency,
    }
  }, [focusSessions, now])

  const activeTasks = useMemo(() => {
    const inProgressColumnIds = new Set(
      columns.filter((column) => /progreso|progress/i.test(column.name) || column.id === 'col-progress').map((column) => column.id),
    )

    return cards
      .filter((card) => inProgressColumnIds.has(card.columnId))
      .sort((a, b) => a.position - b.position)
      .slice(0, 5)
  }, [cards, columns])

  // Indices para resolver títulos referenciados desde el feed de actividad.
  const activityContext = useMemo<ActivityContext>(() => ({
    cardsById: new Map(cards.map((c) => [c.id, { title: c.title }])),
    notesById: new Map(notes.map((n) => [n.id, { title: n.title }])),
    columnsById: new Map(columns.map((c) => [c.id, { name: c.name }])),
  }), [cards, notes, columns])

  const isPaused = Boolean(currentFocusSession?.pausedAt)
  const currentDuration = currentFocusSession ? getEffectiveDuration(currentFocusSession, now) : 0
  const pomodoroGoalMs = pomodoroGoalMin * 60_000
  const pomodoroProgress = pomodoroGoalMs > 0 ? Math.min(1, currentDuration / pomodoroGoalMs) : 0
  const remainingMs = Math.max(0, pomodoroGoalMs - currentDuration)

  const openFocusMiniWindow = async () => {
    if (openingFocusWindow) return
    setOpeningFocusWindow(true)
    try {
      const bridge = (window as typeof window & { workFocusWindow?: Window['workFocusWindow'] }).workFocusWindow
      if (bridge?.open) {
        await bridge.open()
        return
      }

      const popup = window.open(
        `${window.location.origin}${window.location.pathname}#/work/focus-mini`,
        'nora-work-focus',
        'width=376,height=342,resizable=yes,alwaysRaised=yes',
      )
      if (popup) {
        toast.info('Abrí el timer en una ventana separada.')
        return
      }

      toast.error('La mini ventana todavía no está disponible. Cerrá y volvé a abrir Nora OS para cargar el puente de foco.')
    } catch (err) {
      console.error('[WorkDashboard] failed to open focus mini window', err)
      toast.error('No pude abrir el timer flotante. Cerrá y volvé a abrir Nora OS para cargar el puente de foco.')
    } finally {
      setOpeningFocusWindow(false)
    }
  }

  // Dispara notificación + auto-complete cuando se alcanza el objetivo.
  useEffect(() => {
    if (!currentFocusSession || isPaused) return
    if (pomodoroGoalMs <= 0) return
    if (currentDuration < pomodoroGoalMs) return
    if (notifiedSessionId === currentFocusSession.id) return

    setNotifiedSessionId(currentFocusSession.id)
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const title = currentTask?.title ?? 'Foco libre'
        new Notification('Pomodoro completado 🎯', {
          body: `${pomodoroGoalMin} min logrados en "${title}". ¡Buen trabajo!`,
          silent: false,
        })
      }
    } catch {
      // Notifications bloqueadas en Electron — ignorar silenciosamente.
    }
    void completeWorkFocusSession()
  }, [currentFocusSession, currentDuration, pomodoroGoalMs, pomodoroGoalMin, isPaused, notifiedSessionId, currentTask])

  return (
    <div className="plugin-shell plugin-shell-work space-y-6">
      <section className="plugin-panel rounded-2xl p-5 border-l-4 border-l-accent/70 shadow-[inset_1px_0_0_0_rgba(249,115,22,0.18)]">
        <div className="workspace-pane-flex-col flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <BrandIcon name="LaptopShell" size={40} className="shrink-0 mt-1" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-accent-light flex items-center gap-2"><Sparkles size={12} /> Now Panel</p>
              <h2 className="mt-2 line-clamp-2 break-words text-2xl font-semibold text-white">
                {currentTask?.title ?? (currentFocusSession ? 'Foco libre en curso' : 'Sin foco activo')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                {!currentFocusSession
                  ? 'Elegí una tarea desde el tablero o iniciá una sesión libre para activar el motor de ejecución.'
                  : isPaused
                    ? 'Sesión pausada. Reanudá para seguir sumando tiempo efectivo.'
                    : `Corriendo desde ${formatDate(new Date(currentFocusSession.startTime), { hour: '2-digit', minute: '2-digit' })}.`}
              </p>
            </div>
          </div>

          <div className="workspace-pane-full-width flex min-w-0 flex-col items-start gap-3 rounded-2xl border border-border/70 bg-surface px-4 py-3 lg:min-w-[320px]">
            <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-eyebrow text-muted">
              <span className="flex min-w-0 items-center gap-2">
                <TimerReset size={14} />
                Tiempo efectivo {isPaused && <span className="text-warning">(pausado)</span>}
              </span>
              <label className="flex items-center gap-1 normal-case tracking-normal text-caption">
                Meta
                <select
                  value={pomodoroGoalMin}
                  onChange={(e) => setPomodoroGoalMin(Number.parseInt(e.target.value, 10))}
                  className="rounded bg-surface-light border border-border px-1 py-0.5 text-xs text-white focus:border-accent/60 focus:outline-none"
                >
                  <option value={15}>15m</option>
                  <option value={25}>25m</option>
                  <option value={45}>45m</option>
                  <option value={60}>60m</option>
                  <option value={90}>90m</option>
                </select>
              </label>
            </div>
            <p className={`text-3xl font-semibold tabular-nums ${isPaused ? 'text-warning' : 'text-white'}`}>
              {formatDuration(currentDuration)}
            </p>
            {currentFocusSession && (
              <div className="w-full">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-light">
                  <div
                    className={`h-full transition-all duration-500 ${
                      pomodoroProgress >= 1 ? 'bg-success' : 'bg-accent'
                    }`}
                    style={{ width: `${pomodoroProgress * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-micro text-muted">
                  {pomodoroProgress >= 1
                    ? `✓ Meta alcanzada (${pomodoroGoalMin}m)`
                    : `Faltan ${formatDuration(remainingMs)} para la meta`}
                </p>
              </div>
            )}
            {(() => {
              const requiredSessions = Math.max(
                1,
                Math.ceil((workdayHours * 60) / Math.max(1, pomodoroGoalMin)),
              )
              const completedToday = todayMetrics.sessionsToday.filter(
                (s) => s.endTime && !s.interrupted,
              ).length
              return (
                <p
                  className="text-micro text-muted"
                  title={`Jornada de ${workdayHours} h \u00f7 ${pomodoroGoalMin} min por sesi\u00f3n`}
                >
                  Sesiones de jornada:{' '}
                  <span
                    className={`font-semibold tabular-nums ${
                      completedToday >= requiredSessions ? 'text-success' : 'text-accent-light'
                    }`}
                  >
                    {completedToday}/{requiredSessions}
                  </span>
                </p>
              )
            })()}
            <div className="flex flex-wrap gap-2">
              {!currentFocusSession && (
                <button
                  onClick={() => startWorkFocusSession(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-3 py-2 text-sm text-accent-light transition-colors hover:bg-accent/10"
                >
                  <Play size={14} />
                  Start
                </button>
              )}
              {currentFocusSession && isPaused && (
                <button
                  onClick={() => resumeWorkFocusSession()}
                  className="inline-flex items-center gap-2 rounded-xl border border-accent/30 px-3 py-2 text-sm text-accent-light transition-colors hover:bg-accent/10"
                >
                  <Play size={14} />
                  Resume
                </button>
              )}
              {currentFocusSession && !isPaused && (
                <button
                  onClick={() => pauseWorkFocusSession()}
                  className="inline-flex items-center gap-2 rounded-xl border border-warning/30 px-3 py-2 text-sm text-warning transition-colors hover:bg-warning/10"
                >
                  <Pause size={14} />
                  Pause
                </button>
              )}
              <button
                onClick={() => { void openFocusMiniWindow() }}
                title="Abrir el timer en una mini ventana flotante"
                disabled={openingFocusWindow}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/35 hover:bg-surface-light hover:text-white disabled:cursor-wait disabled:opacity-60"
              >
                <ExternalLink size={14} />
                {openingFocusWindow ? 'Abriendo...' : 'Fijar timer'}
              </button>
              <button
                onClick={() => {
                  const taskId = currentFocusSession?.taskId ?? null
                  if (taskId) {
                    void completeWorkTask(taskId)
                  } else {
                    void completeWorkFocusSession()
                  }
                }}
                disabled={!currentFocusSession}
                title="Finalizar y mover la tarea a Completada"
                className="inline-flex items-center gap-2 rounded-xl border border-success/30 px-3 py-2 text-sm text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Square size={14} />
                Stop
              </button>
              <button
                onClick={() => interruptWorkFocusSession()}
                disabled={!currentFocusSession}
                title="Abandonar sesión (cuenta como interrumpida)"
                className="inline-flex items-center gap-2 rounded-xl border border-danger/30 px-3 py-2 text-sm text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={14} />
                Cancel
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="workspace-auto-grid-sm gap-4">
        <div className="plugin-panel min-h-[96px] p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ClipboardList size={14} />
            Tableros
          </p>
          <p className="text-2xl font-bold">{boards.length}</p>
        </div>
        <div className="plugin-panel min-h-[96px] p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <ListChecks size={14} />
            Tareas
          </p>
          <p className="text-2xl font-bold">{totalCards}</p>
        </div>
        <div className="plugin-panel min-h-[96px] p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <NotebookPen size={14} />
            Notas
          </p>
          <p className="text-2xl font-bold">{totalNotes}</p>
        </div>
        <div className="plugin-panel min-h-[96px] p-4">
          <p className="text-xs text-muted mb-1 flex items-center gap-1.5">
            <TimerReset size={14} />
            Foco hoy
          </p>
          <p className="text-2xl font-bold">{formatDuration(todayMetrics.totalFocusMs)}</p>
          <p className="mt-1 text-xs text-muted">{todayMetrics.sessionsToday.length} sesiones, {todayMetrics.efficiency}% eficiencia</p>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2 border-l-4 border-l-sky-400/60 pl-3">
          <KanbanSquare size={14} className="text-sky-300" />
          <h3 className="text-lg font-semibold">Tablero principal</h3>
          <span className="text-micro uppercase tracking-eyebrow text-sky-300/70">Kanban</span>
        </div>
        <KanbanBoard />
      </div>

      <div className="workspace-auto-grid-lg min-w-0 items-stretch gap-6">
        <section className="plugin-panel flex h-[420px] min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl p-5 border-l-4 border-l-success/70 shadow-[inset_1px_0_0_0_rgba(34,197,94,0.18)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-eyebrow text-success flex items-center gap-2"><ListChecks size={12} /> Active Tasks</p>
              <h3 className="mt-1 text-lg font-semibold text-white">Tareas en progreso</h3>
            </div>
            <span className="rounded-full bg-success/10 border border-success/20 px-2 py-1 text-xs text-success">{activeTasks.length}</span>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {activeTasks.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted">
                No hay tareas en progreso. Iniciá una desde el tablero para activar el flujo.
              </div>
            )}

            {activeTasks.map((card) => {
              const isFocused = currentFocusSession?.taskId === card.id
              const isFocusedPaused = isFocused && Boolean(currentFocusSession?.pausedAt)
              const sessionElapsed = isFocused && currentFocusSession
                ? getEffectiveDuration(currentFocusSession, now)
                : 0
              const stateLabel = isFocusedPaused
                ? 'Pausada'
                : isFocused
                  ? 'En foco'
                  : 'En progreso'
              const stateClass = isFocusedPaused
                ? 'border-warning/30 bg-warning/10 text-warning'
                : isFocused
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-border bg-surface text-muted'
              const cardClass = isFocusedPaused
                ? 'border-warning/40 bg-warning/5'
                : isFocused
                  ? 'border-success/40 bg-success/5'
                  : 'border-border bg-surface'

              return (
                <div key={card.id} className={`min-h-[76px] rounded-xl border px-4 py-3 transition-colors ${cardClass}`}>
                  <div className="workspace-pane-flex-col flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="line-clamp-2 min-w-0 break-words text-sm font-medium text-white">{card.title}</p>
                        <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-micro uppercase tracking-wide ${stateClass}`}>
                          {isFocusedPaused ? <Pause size={10} /> : isFocused ? <Play size={10} /> : <ListChecks size={10} />}
                          {stateLabel}
                          {isFocused && (
                            <span className="tabular-nums normal-case tracking-normal">· {formatDuration(sessionElapsed)}</span>
                          )}
                        </span>
                      </div>
                      {card.description && <p className="mt-1 text-xs text-muted line-clamp-2">{card.description}</p>}
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5">
                      <button
                        onClick={() => completeWorkTask(card.id)}
                        title="Completar tarea (mueve a Hecho y detiene el foco)"
                        className="inline-flex items-center gap-1 rounded-full border border-success/30 px-2.5 py-1 text-xs text-success transition-colors hover:bg-success/10"
                      >
                        <CheckCircle2 size={12} />
                        Completar
                      </button>
                      {!isFocused && (
                        <button
                          onClick={() => startWorkFocusSession(card.id)}
                          title="Iniciar foco en esta tarea"
                          className="inline-flex items-center gap-1 rounded-full border border-accent/30 px-3 py-1 text-xs text-accent-light transition-colors hover:bg-accent/10"
                        >
                          <Play size={12} />
                          Focus
                        </button>
                      )}
                      {isFocused && isFocusedPaused && (
                        <button
                          onClick={() => resumeWorkFocusSession()}
                          title="Reanudar foco"
                          className="inline-flex items-center gap-1 rounded-full border border-accent/30 px-3 py-1 text-xs text-accent-light transition-colors hover:bg-accent/10"
                        >
                          <Play size={12} />
                          Reanudar
                        </button>
                      )}
                      {isFocused && !isFocusedPaused && (
                        <button
                          onClick={() => pauseWorkFocusSession()}
                          title="Pausar foco"
                          className="inline-flex items-center gap-1 rounded-full border border-warning/30 px-3 py-1 text-xs text-warning transition-colors hover:bg-warning/10"
                        >
                          <Pause size={12} />
                          Pausa
                        </button>
                      )}
                      {isFocused && (
                        <button
                          onClick={() => stopWorkTask(card.id)}
                          title="Detener foco y mover la tarea a Completada"
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-red-400/40 hover:text-red-300"
                        >
                          <Square size={12} />
                          Stop
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="plugin-panel flex h-[420px] min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl p-5 border-l-4 border-l-purple-400/60 shadow-[inset_1px_0_0_0_rgba(168,85,247,0.18)]">
          <p className="text-xs uppercase tracking-eyebrow text-purple-300 flex items-center gap-2"><History size={12} /> Recent Work Activity</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Actividad reciente</h3>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {recentEvents.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-sm text-muted">
                Todavía no hay actividad registrada para work.
              </div>
            )}

            {recentEvents.map((entry) => {
              const details = describeActivity(entry, activityContext)
              const accent = EVENT_ACCENT[entry.event_type] ?? 'text-muted'
              return (
                <div key={entry.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-micro uppercase tracking-eyebrow ${accent}`}>
                        {EVENT_LABELS[entry.event_type] ?? entry.event_type}
                      </p>
                      {details.primary && (
                        <p className="mt-0.5 truncate text-sm font-medium text-white" title={details.primary}>
                          {details.primary}
                        </p>
                      )}
                      {details.secondary && (
                        <p className="mt-0.5 truncate text-xs text-muted" title={details.secondary}>
                          {details.secondary}
                        </p>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-xs text-muted">{formatRelative(entry.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
