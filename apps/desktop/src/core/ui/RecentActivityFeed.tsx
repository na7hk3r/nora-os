import { useEffect, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'
import { eventBus } from '@core/events/EventBus'
import { useCoreStore } from '@core/state/coreStore'
import type { EventLogEntry } from '@core/types'
import { Bell, BriefcaseBusiness, Dumbbell, Inbox } from 'lucide-react'
import { CORE_EVENTS } from '@core/events/events'
import { loadFitnessSettings } from '@plugins/fitness/settings'

type ActivitySourceFilter = 'all' | 'fitness' | 'work' | 'core'
type ActivityTimeFilter = 'all' | '24h'

const SOURCE_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  fitness: Dumbbell,
  work: BriefcaseBusiness,
}

/** Trunca una cadena para que no rompa el layout del feed. */
function trim(s: unknown, max = 40): string {
  const v = typeof s === 'string' ? s.trim() : ''
  if (!v) return ''
  return v.length > max ? `${v.slice(0, max - 1)}…` : v
}

/** Formatea minutos como "45 min" o "1h 20m". */
function formatMinutes(min: number): string {
  if (!Number.isFinite(min) || min <= 0) return '<1 min'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function readMinutes(p: Record<string, unknown>): number | null {
  if (typeof p.durationMin === 'number') return p.durationMin
  if (typeof p.duration === 'number') return Math.round(p.duration / 60_000)
  return null
}

const PLUGIN_NAMES: Record<string, string> = {
  fitness: 'Fitness',
  work: 'Work',
}

/**
 * Construye la descripción visible para una entrada del feed a partir del
 * payload persistido del evento. Los emisores de cada plugin enriquecen los
 * payloads con datos descriptivos (título de tarea, nombre de columna,
 * duración) en el momento de emitir, garantizando integridad histórica:
 * lo que se muestra aquí es lo que ocurrió, aunque la entidad ya no exista.
 */
const EVENT_LABELS: Record<string, (payload: Record<string, unknown>) => string> = {
  // Fitness
  WEIGHT_RECORDED: (p) => `Registraste peso${p.weight ? `: ${p.weight} kg` : ''}`,
  FITNESS_WEIGHT_RECORDED: (p) => `Registraste peso${p.weight ? `: ${p.weight} kg` : ''}`,
  DAILY_ENTRY_SAVED: (p) => {
    const meals = ['breakfast', 'lunch', 'snack', 'dinner'].filter((m) => p[m] === 1).length
    const parts: string[] = []
    if (p.weight) parts.push(`${p.weight} kg`)
    if (meals) parts.push(`${meals} comida${meals > 1 ? 's' : ''}`)
    if (p.workout && p.workout !== 'R') parts.push(`entreno ${p.workout}`)
    if (typeof p.cigarettes === 'number' && p.cigarettes > 0) parts.push(`${p.cigarettes} cig.`)
    return parts.length
      ? `Entrada diaria · ${parts.join(' · ')}`
      : 'Guardaste entrada diaria'
  },
  FITNESS_DAILY_ENTRY_SAVED: (p) => EVENT_LABELS.DAILY_ENTRY_SAVED(p),
  MEAL_LOGGED: (p) => `Registraste comida${p.type ? ` (${p.type})` : ''}`,
  FITNESS_MEAL_LOGGED: (p) => `Registraste comida${p.type ? ` (${p.type})` : ''}`,
  WORKOUT_COMPLETED: (p) =>
    `Completaste entrenamiento${p.type && p.type !== 'R' ? ` ${p.type}` : ''}`,
  FITNESS_WORKOUT_COMPLETED: (p) =>
    `Completaste entrenamiento${p.type && p.type !== 'R' ? ` ${p.type}` : ''}`,
  MEASUREMENT_SAVED: (p) =>
    `Guardaste medidas corporales${p.weight ? ` · ${p.weight} kg` : ''}`,
  FITNESS_MEASUREMENT_SAVED: (p) =>
    `Guardaste medidas corporales${p.weight ? ` · ${p.weight} kg` : ''}`,

  // Work · tareas
  TASK_CREATED: (p) => `Creaste tarea${p.title ? `: "${trim(p.title)}"` : ''}`,
  WORK_TASK_CREATED: (p) => `Creaste tarea${p.title ? `: "${trim(p.title)}"` : ''}`,
  TASK_COMPLETED: (p) => {
    const title = trim(p.title)
    const col = trim(p.columnName, 20)
    return title
      ? `Completaste "${title}"${col ? ` → ${col}` : ''}`
      : 'Completaste una tarea'
  },
  WORK_TASK_COMPLETED: (p) => EVENT_LABELS.TASK_COMPLETED(p),
  TASK_MOVED: (p) => {
    const title = trim(p.cardTitle)
    const from = trim(p.fromColumnName, 20)
    const to = trim(p.toColumnName, 20)
    if (title && from && to) return `Moviste "${title}": ${from} → ${to}`
    if (title) return `Moviste "${title}"`
    if (from && to) return `Moviste tarea: ${from} → ${to}`
    return 'Moviste una tarea'
  },
  WORK_TASK_MOVED: (p) => EVENT_LABELS.TASK_MOVED(p),
  WORK_TASK_UPDATED: (p) =>
    p.title ? `Editaste tarea: "${trim(p.title)}"` : 'Actualizaste una tarea',
  WORK_TASK_DELETED: (p) =>
    p.title ? `Eliminaste tarea: "${trim(p.title)}"` : 'Eliminaste una tarea',

  // Work · foco
  WORK_FOCUS_STARTED: (p) =>
    p.taskTitle ? `Iniciaste foco en "${trim(p.taskTitle)}"` : 'Iniciaste sesión de foco',
  FOCUS_STARTED: (p) => EVENT_LABELS.WORK_FOCUS_STARTED(p),
  WORK_FOCUS_PAUSED: (p) =>
    p.taskTitle ? `Pausaste foco en "${trim(p.taskTitle)}"` : 'Pausaste sesión de foco',
  WORK_FOCUS_RESUMED: (p) =>
    p.taskTitle ? `Reanudaste foco en "${trim(p.taskTitle)}"` : 'Reanudaste sesión de foco',
  WORK_FOCUS_COMPLETED: (p) => {
    const min = readMinutes(p)
    const title = trim(p.taskTitle)
    const dur = min !== null ? ` (${formatMinutes(min)})` : ''
    return title
      ? `Sesión de foco completada · "${title}"${dur}`
      : `Sesión de foco completada${dur}`
  },
  FOCUS_COMPLETED: (p) => EVENT_LABELS.WORK_FOCUS_COMPLETED(p),
  WORK_FOCUS_INTERRUPTED: (p) => {
    const min = readMinutes(p)
    const title = trim(p.taskTitle)
    const dur = min !== null ? ` (${formatMinutes(min)})` : ''
    return title
      ? `Foco interrumpido · "${title}"${dur}`
      : `Sesión de foco interrumpida${dur}`
  },
  FOCUS_INTERRUPTED: (p) => EVENT_LABELS.WORK_FOCUS_INTERRUPTED(p),

  // Work · notas
  NOTE_CREATED: (p) => `Creaste nota${p.title ? `: "${trim(p.title)}"` : ''}`,
  WORK_NOTE_CREATED: (p) => `Creaste nota${p.title ? `: "${trim(p.title)}"` : ''}`,

  // Core
  CORE_PROFILE_UPDATED: (p) =>
    p.name ? `Actualizaste perfil: ${trim(p.name, 24)}` : 'Actualizaste tu perfil',
  CORE_SETTINGS_UPDATED: (p) =>
    p.theme ? `Guardaste preferencias · tema ${trim(p.theme, 16)}` : 'Guardaste preferencias',
  CORE_PLUGIN_ACTIVATED: (p) => {
    const id = String(p.pluginId ?? '')
    return `Activaste plugin: ${PLUGIN_NAMES[id] || id || '—'}`
  },
  CORE_PLUGIN_DEACTIVATED: (p) => {
    const id = String(p.pluginId ?? '')
    return `Desactivaste plugin: ${PLUGIN_NAMES[id] || id || '—'}`
  },
}

function humanizeEvent(entry: EventLogEntry, showSmoking: boolean): string {
  try {
    let payload = JSON.parse(entry.payload || '{}') as Record<string, unknown>
    if (!showSmoking && (entry.event_type === 'DAILY_ENTRY_SAVED' || entry.event_type === 'FITNESS_DAILY_ENTRY_SAVED')) {
      payload = { ...payload, cigarettes: undefined }
    }
    const fn = EVENT_LABELS[entry.event_type]
    if (fn) return fn(payload)
  } catch {
    // ignore parse error
  }
  return entry.event_type.replace(/_/g, ' ').toLowerCase()
}

function relativeTime(isoStr: string): string {
  const ms = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

export function RecentActivityFeed({ compact = false, maxItems }: { compact?: boolean; maxItems?: number } = {}) {
  const [events, setEvents] = useState<EventLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceFilter, setSourceFilter] = useState<ActivitySourceFilter>('all')
  const [timeFilter, setTimeFilter] = useState<ActivityTimeFilter>('all')
  const [showSmoking, setShowSmoking] = useState(false)
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const limit = maxItems ?? (compact ? 3 : 5)

  const load = () => {
    storageAPI
      .getRecentEvents(20)
      .then((data) => {
        setEvents(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    void loadFitnessSettings()
      .then((settings) => setShowSmoking(settings.smokingCessationEnabled))
      .catch(() => setShowSmoking(false))
    load()

    // Refresh feed when new events are emitted
    const delayedLoad = () => setTimeout(load, 60)

    const unsubs: Array<() => void> = []

    // Subscribe to core events (always available)
    unsubs.push(
      eventBus.on(CORE_EVENTS.PROFILE_UPDATED, delayedLoad),
      eventBus.on(CORE_EVENTS.SETTINGS_UPDATED, delayedLoad),
      eventBus.on(CORE_EVENTS.PLUGIN_ACTIVATED, delayedLoad),
      eventBus.on(CORE_EVENTS.PLUGIN_DEACTIVATED, delayedLoad),
    )

    // Subscribe to fitness events only if plugin is active
    if (activePlugins.includes('fitness')) {
      unsubs.push(
        eventBus.on('FITNESS_WEIGHT_RECORDED', delayedLoad),
        eventBus.on('FITNESS_DAILY_ENTRY_SAVED', delayedLoad),
        eventBus.on('FITNESS_MEAL_LOGGED', delayedLoad),
        eventBus.on('FITNESS_WORKOUT_COMPLETED', delayedLoad),
        eventBus.on('FITNESS_MEASUREMENT_SAVED', delayedLoad),
        // Backward compatibility for old event names
        eventBus.on('WEIGHT_RECORDED', delayedLoad),
        eventBus.on('DAILY_ENTRY_SAVED', delayedLoad),
        eventBus.on('MEAL_LOGGED', delayedLoad),
        eventBus.on('WORKOUT_COMPLETED', delayedLoad),
        eventBus.on('MEASUREMENT_SAVED', delayedLoad),
      )
    }

    // Subscribe to work events only if plugin is active
    if (activePlugins.includes('work')) {
      unsubs.push(
        eventBus.on('WORK_TASK_CREATED', delayedLoad),
        eventBus.on('WORK_TASK_COMPLETED', delayedLoad),
        eventBus.on('WORK_TASK_MOVED', delayedLoad),
        eventBus.on('WORK_NOTE_CREATED', delayedLoad),
        eventBus.on('WORK_TASK_UPDATED', delayedLoad),
        eventBus.on('WORK_TASK_DELETED', delayedLoad),
        eventBus.on('WORK_FOCUS_STARTED', delayedLoad),
        eventBus.on('WORK_FOCUS_PAUSED', delayedLoad),
        eventBus.on('WORK_FOCUS_RESUMED', delayedLoad),
        eventBus.on('WORK_FOCUS_COMPLETED', delayedLoad),
        eventBus.on('WORK_FOCUS_INTERRUPTED', delayedLoad),
        // Backward compatibility for old event names
        eventBus.on('TASK_CREATED', delayedLoad),
        eventBus.on('TASK_COMPLETED', delayedLoad),
        eventBus.on('TASK_MOVED', delayedLoad),
        eventBus.on('NOTE_CREATED', delayedLoad),
        eventBus.on('TASK_UPDATED', delayedLoad),
        eventBus.on('TASK_DELETED', delayedLoad),
        eventBus.on('FOCUS_STARTED', delayedLoad),
        eventBus.on('FOCUS_COMPLETED', delayedLoad),
        eventBus.on('FOCUS_INTERRUPTED', delayedLoad),
      )
    }

    return () => unsubs.forEach((unsub) => unsub())
  }, [activePlugins])

  const filteredEvents = events
    .filter((entry) => {
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false

      if (timeFilter === '24h') {
        const elapsedMs = Date.now() - new Date(entry.created_at).getTime()
        if (elapsedMs > 86_400_000) return false
      }

      return true
    })
    .slice(0, limit)

  return (
    <div className="flex flex-col">
      {!compact && (
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'fitness', label: 'Fitness' },
          { id: 'work', label: 'Work' },
          { id: 'core', label: 'Core' },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSourceFilter(opt.id as ActivitySourceFilter)}
            className={`rounded-full border px-2 py-0.5 text-micro transition-colors ${
              sourceFilter === opt.id
                ? 'border-accent/60 bg-accent/20 text-accent-light'
                : 'border-border bg-surface text-muted hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}

        <button
          onClick={() => setTimeFilter((prev) => (prev === 'all' ? '24h' : 'all'))}
          className={`ml-auto rounded-full border px-2 py-0.5 text-micro transition-colors ${
            timeFilter === '24h'
              ? 'border-accent/60 bg-accent/20 text-accent-light'
              : 'border-border bg-surface text-muted hover:text-white'
          }`}
        >
          {timeFilter === '24h' ? 'Últimas 24h' : 'Todo el historial'}
        </button>
      </div>
      )}

      {loading ? (
        <div className="flex-1 space-y-2" role="status" aria-label="Cargando actividad">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 animate-pulse rounded-md bg-surface-lighter/40" />
          ))}
          <span className="sr-only">Cargando actividad reciente…</span>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
          <Inbox size={28} className="text-muted/70" />
          <p className="text-xs text-muted">Cuando registres algo va a aparecer acá.</p>
          <p className="text-caption text-muted/70">Empezá con una nota, una tarea o un hábito.</p>
        </div>
      ) : (
        <ul className="flex-1 space-y-2 pr-1">
          {filteredEvents.map((entry) => (
            <li key={entry.id} className="flex items-start gap-2.5 animate-fade-in">
              <span className="text-base leading-none mt-0.5 text-muted/80">
                {(() => {
                  const Icon = SOURCE_ICON[entry.source]
                  return Icon ? <Icon size={14} /> : <Bell size={14} />
                })()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-snug truncate">
                  {humanizeEvent(entry, showSmoking)}
                </p>
                <p className="text-micro text-muted mt-0.5">{relativeTime(entry.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
