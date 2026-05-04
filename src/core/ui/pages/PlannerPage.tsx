import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { eventBus } from '@core/events/EventBus'
import { CORE_EVENTS } from '@core/events/events'

type PlannerCategory = 'domestica' | 'recordatorio' | 'trabajo' | 'personal'
type PlannerComplexity = 'baja' | 'media' | 'alta'
type PlannerViewMode = 'month' | 'week'
type TaskFilterStatus = 'all' | 'pending' | 'completed'

interface PlannerTask {
  id: string
  title: string
  category: PlannerCategory
  complexity: PlannerComplexity
  date: string
  note?: string
  completed: boolean
  createdAt: string
  rewardedAt?: string
}

const STORAGE_KEY = 'corePlannerTasksV1'

const COMPLEXITY_XP: Record<PlannerComplexity, number> = {
  baja: 5,
  media: 10,
  alta: 16,
}

const CATEGORY_LABELS: Record<PlannerCategory, string> = {
  domestica: 'Domestica',
  recordatorio: 'Recordatorio',
  trabajo: 'Trabajo',
  personal: 'Personal',
}

const CATEGORY_STYLES: Record<PlannerCategory, string> = {
  domestica: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  recordatorio: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  trabajo: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
  personal: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
}

const COMPLEXITY_STYLES: Record<PlannerComplexity, string> = {
  baja: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  media: 'bg-warning/15 text-warning border-warning/25',
  alta: 'bg-danger/15 text-danger border-danger/25',
}

function complexityLabel(complexity: PlannerComplexity): string {
  if (complexity === 'baja') return 'Baja'
  if (complexity === 'media') return 'Media'
  return 'Alta'
}

function toIsoDate(date: Date): string {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString().slice(0, 10)
}

function toMonthLabel(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })
}

function toWeekdayLabel(day: number): string {
  const date = new Date(2026, 3, 20 + day)
  return date.toLocaleDateString('es-ES', { weekday: 'short' })
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  return copy
}

function formatWeekRange(referenceDate: Date): string {
  const start = startOfWeek(referenceDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const from = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  const to = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${from} - ${to}`
}

function normalizeTask(raw: unknown): PlannerTask | null {
  if (!raw || typeof raw !== 'object') return null
  const task = raw as Partial<PlannerTask>
  if (!task.id || !task.title || !task.date || !task.createdAt || !task.category) return null

  const complexity: PlannerComplexity =
    task.complexity === 'baja' || task.complexity === 'alta' ? task.complexity : 'media'

  return {
    id: String(task.id),
    title: String(task.title),
    category: task.category,
    complexity,
    date: String(task.date),
    note: task.note ? String(task.note) : undefined,
    completed: Boolean(task.completed),
    createdAt: String(task.createdAt),
    rewardedAt: task.rewardedAt ? String(task.rewardedAt) : undefined,
  }
}

export function CorePlannerPage() {
  const today = toIsoDate(new Date())
  const addPoints = useGamificationStore((s) => s.addPoints)
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [viewMode, setViewMode] = useState<PlannerViewMode>('month')
  const [selectedDate, setSelectedDate] = useState(today)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<PlannerCategory>('domestica')
  const [complexity, setComplexity] = useState<PlannerComplexity>('media')
  const [taskDate, setTaskDate] = useState(today)
  const [note, setNote] = useState('')
  const [statusFilter, setStatusFilter] = useState<TaskFilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | PlannerCategory>('all')
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  const saveTasks = (nextTasks: PlannerTask[]) => {
    setTasks(nextTasks)
    if (!window.storage) return
    void window.storage.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [STORAGE_KEY, JSON.stringify(nextTasks)],
    )
  }

  useEffect(() => {
    if (!window.storage) return

    void window.storage
      .query(`SELECT value FROM settings WHERE key = ? LIMIT 1`, [STORAGE_KEY])
      .then((rows) => {
        const list = rows as { value: string }[]
        const raw = list[0]?.value
        if (!raw) return
        const parsed = JSON.parse(raw) as unknown[]
        if (!Array.isArray(parsed)) return
        const normalized = parsed
          .map((item) => normalizeTask(item))
          .filter((item): item is PlannerTask => Boolean(item))
        setTasks(normalized)
      })
      .catch(() => {})
  }, [])

  const monthCells = useMemo(() => {
    const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7

    const cells: Array<number | null> = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
    for (let day = 1; day <= daysInMonth; day++) cells.push(day)
    return cells
  }, [viewMonth])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, PlannerTask[]>()
    for (const task of tasks) {
      const bucket = map.get(task.date) ?? []
      bucket.push(task)
      map.set(task.date, bucket)
    }
    return map
  }, [tasks])

  const selectedTasks = useMemo(() => {
    const list = tasksByDate.get(selectedDate) ?? []
    return [...list]
      .filter((task) => {
        const statusOk =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && !task.completed) ||
          (statusFilter === 'completed' && task.completed)
        const categoryOk = categoryFilter === 'all' || task.category === categoryFilter
        return statusOk && categoryOk
      })
      .sort((a, b) => Number(a.completed) - Number(b.completed))
  }, [tasksByDate, selectedDate, statusFilter, categoryFilter])

  const weekCells = useMemo(() => {
    const start = startOfWeek(new Date(`${selectedDate}T00:00:00`))
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(start)
      day.setDate(start.getDate() + idx)
      return day
    })
  }, [selectedDate])

  const submitTask = (event: FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const newTask: PlannerTask = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      category,
      complexity,
      date: taskDate,
      note: note.trim() || undefined,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    saveTasks([newTask, ...tasks])
    setTitle('')
    setNote('')
    setComplexity('media')
    setSelectedDate(taskDate)
    setViewMonth(new Date(`${taskDate}T00:00:00`))
  }

  const toggleTask = (id: string) => {
    const target = tasks.find((task) => task.id === id)
    if (!target) return

    const willComplete = !target.completed
    const shouldReward = willComplete && !target.rewardedAt
    const xpToGrant = shouldReward ? COMPLEXITY_XP[target.complexity] : 0

    const completedTask: PlannerTask | null = shouldReward
      ? { ...target, completed: true, rewardedAt: new Date().toISOString() }
      : null

    const next = tasks.map((task): PlannerTask => {
      if (task.id !== id) return task
      if (completedTask) return completedTask
      return { ...task, completed: willComplete }
    })

    if (completedTask && xpToGrant > 0) {
      addPoints(xpToGrant, `Mision core (${complexityLabel(completedTask.complexity)}): ${completedTask.title}`)
      eventBus.emit(
        CORE_EVENTS.PLANNER_TASK_COMPLETED,
        {
          taskId: completedTask.id,
          title: completedTask.title,
          complexity: completedTask.complexity,
          xp: xpToGrant,
          date: completedTask.date,
        },
        { source: 'core', persist: true },
      )
    }

    saveTasks(next)
  }

  const removeTask = (id: string) => {
    const next = tasks.filter((task) => task.id !== id)
    saveTasks(next)
  }

  const gotoMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const gotoWeek = (delta: number) => {
    const base = new Date(`${selectedDate}T00:00:00`)
    base.setDate(base.getDate() + delta * 7)
    const next = toIsoDate(base)
    setSelectedDate(next)
    setTaskDate(next)
  }

  const moveTaskToDate = (taskId: string, date: string) => {
    const next = tasks.map((task) => (task.id === taskId ? { ...task, date } : task))
    saveTasks(next)
    setSelectedDate(date)
    setTaskDate(date)
  }

  const renderDayCell = (cellDate: string, dayLabel: number | string) => {
    const dayTasks = tasksByDate.get(cellDate) ?? []
    const doneCount = dayTasks.filter((task) => task.completed).length
    const isSelected = selectedDate === cellDate
    const isToday = today === cellDate
    const hasTasks = dayTasks.length > 0
    const allDone = hasTasks && doneCount === dayTasks.length

    return (
      <button
        key={cellDate}
        onClick={() => setSelectedDate(cellDate)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (!draggedTaskId) return
          moveTaskToDate(draggedTaskId, cellDate)
          setDraggedTaskId(null)
        }}
        className={`h-16 rounded-lg border p-1.5 text-left transition-all ${
          isSelected
            ? 'border-accent bg-accent/10'
            : 'border-border bg-surface/70 hover:bg-surface'
        } ${isToday ? 'ring-1 ring-accent/45' : ''}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">{dayLabel}</span>
          {hasTasks && (
            <span className={`rounded-full px-1.5 py-0.5 text-micro font-semibold ${
              allDone
                ? 'bg-success/20 text-success'
                : doneCount > 0
                  ? 'bg-warning/20 text-warning'
                  : 'bg-accent/20 text-accent-light'
            }`}>
              {dayTasks.length}
            </span>
          )}
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-surface-lighter">
          {hasTasks && (
            <div
              className={`h-1.5 rounded-full ${allDone ? 'bg-success' : doneCount > 0 ? 'bg-warning' : 'bg-accent'}`}
              style={{ width: `${(doneCount / dayTasks.length) * 100}%` }}
            />
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
        <p className="text-xs uppercase tracking-eyebrow text-muted">Core Planner</p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-white">
          <CalendarDays size={22} className="text-accent-light" />
          Agenda diaria y calendario
        </h1>
        <p className="mt-2 text-sm text-muted">
          Organiza tareas domesticas, recordatorios y pendientes diarios sin depender de plugins.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1.4fr]">
        <article className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
          <h2 className="text-lg font-semibold text-white">Nueva misión diaria</h2>
          <p className="mt-1 text-xs text-muted">Cada tarea del planner core es una misión del día.</p>

          <form onSubmit={submitTask} className="mt-4 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Título</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: limpiar cocina"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs text-muted">Categoría</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PlannerCategory)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="domestica">Domestica</option>
                  <option value="recordatorio">Recordatorio</option>
                  <option value="trabajo">Trabajo</option>
                  <option value="personal">Personal</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-muted">Complejidad (XP)</span>
                <select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value as PlannerComplexity)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="baja">Baja (+5 XP)</option>
                  <option value="media">Media (+10 XP)</option>
                  <option value="alta">Alta (+16 XP)</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-muted">Fecha</span>
                <input
                  type="date"
                  value={taskDate}
                  onChange={(e) => setTaskDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs text-muted">Nota (opcional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Detalle o contexto"
                className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/85"
            >
              <Plus size={14} />
              Agregar tarea
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">Calendario</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (viewMode === 'month') gotoMonth(-1)
                  else gotoWeek(-1)
                }}
                className="rounded-md border border-border bg-surface px-2 py-1 text-muted hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setViewMode((prev) => (prev === 'month' ? 'week' : 'month'))}
                className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-white"
              >
                {viewMode === 'month' ? 'Mes' : 'Semana'}
              </button>
              <button
                onClick={() => {
                  if (viewMode === 'month') gotoMonth(1)
                  else gotoWeek(1)
                }}
                className="rounded-md border border-border bg-surface px-2 py-1 text-muted hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <p className="mt-1 text-sm font-medium capitalize text-accent-light">
            {viewMode === 'month' ? toMonthLabel(viewMonth) : formatWeekRange(new Date(`${selectedDate}T00:00:00`))}
          </p>

          {viewMode === 'week' && (
            <div className="mt-2 flex gap-1">
              <button
                onClick={() => gotoWeek(-1)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-white"
              >
                Semana anterior
              </button>
              <button
                onClick={() => gotoWeek(1)}
                className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted hover:text-white"
              >
                Semana siguiente
              </button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-caption uppercase tracking-wide text-muted">
            {Array.from({ length: 7 }).map((_, idx) => (
              <span key={idx}>{toWeekdayLabel(idx)}</span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1">
            {viewMode === 'month'
              ? monthCells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} className="h-16 rounded-lg border border-transparent" />
                  }
                  const cellDate = toIsoDate(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), cell))
                  return renderDayCell(cellDate, cell)
                })
              : weekCells.map((day) => renderDayCell(toIsoDate(day), day.getDate()))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Tareas del {selectedDate}</h2>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
            {selectedTasks.length} tarea{selectedTasks.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-caption uppercase tracking-wide text-muted">Estado</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskFilterStatus)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendientes</option>
              <option value="completed">Completadas</option>
            </select>
          </label>

          <label className="space-y-1 sm:col-span-1 xl:col-span-2">
            <span className="text-caption uppercase tracking-wide text-muted">Categoría</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as 'all' | PlannerCategory)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            >
              <option value="all">Todas</option>
              <option value="domestica">Domestica</option>
              <option value="recordatorio">Recordatorio</option>
              <option value="trabajo">Trabajo</option>
              <option value="personal">Personal</option>
            </select>
          </label>

          <div className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] leading-tight text-muted flex items-center">
            Arrastra tareas al calendario para reprogramarlas
          </div>
        </div>

        {selectedTasks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No hay tareas para este día.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {selectedTasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setDraggedTaskId(task.id)}
                onDragEnd={() => setDraggedTaskId(null)}
                className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                  task.completed ? 'border-success/30 bg-success/10' : 'border-border bg-surface/70'
                }`}
              >
                <span className="mt-0.5 shrink-0 text-muted/70" title="Arrastrar al calendario">
                  <GripVertical size={16} />
                </span>

                <button
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 shrink-0 text-muted hover:text-white"
                  title={task.completed ? 'Marcar pendiente' : 'Marcar completada'}
                >
                  <CheckCircle2 size={18} className={task.completed ? 'text-success' : ''} />
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.completed ? 'text-success line-through' : 'text-white'}`}>
                    {task.title}
                  </p>
                  {task.note && <p className="mt-0.5 text-xs text-muted">{task.note}</p>}
                  <div className="mt-1.5 flex items-center gap-2 text-caption text-muted">
                    <span className={`rounded-full border px-2 py-0.5 ${CATEGORY_STYLES[task.category]}`}>
                      {CATEGORY_LABELS[task.category]}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 ${COMPLEXITY_STYLES[task.complexity]}`}>
                      {complexityLabel(task.complexity)} · +{COMPLEXITY_XP[task.complexity]} XP
                    </span>
                    <span>{new Date(`${task.date}T00:00:00`).toLocaleDateString('es-ES')}</span>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-accent-light">
                      Mision diaria
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => removeTask(task.id)}
                  className="shrink-0 rounded-md border border-danger/30 bg-danger/10 p-1.5 text-danger hover:bg-danger/20"
                  title="Eliminar tarea"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
