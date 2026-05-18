import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { eventBus } from '@core/events/EventBus'
import { CORE_EVENTS } from '@core/events/events'
import {
  GlobalTagChip,
  GlobalTagPicker,
  type TagSelection,
} from '@core/ui/components/GlobalTagPicker'
import { useI18n } from '@core/i18n'
import { TAG_ENTITY_TYPES, tagsService } from '@core/services/tagsService'

type PlannerCategory = 'domestica' | 'recordatorio' | 'trabajo' | 'personal'
type PlannerComplexity = 'baja' | 'media' | 'alta'
type PlannerViewMode = 'month' | 'week'
type PlannerMobileView = 'day' | 'calendar'
type TaskFilterStatus = 'all' | 'pending' | 'completed'

interface PlannerTask {
  id: string
  title: string
  category: PlannerCategory
  complexity: PlannerComplexity
  date: string
  note?: string
  tags: string[]
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

function toMonthLabel(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
}

function toWeekdayLabel(day: number, locale: string): string {
  const date = new Date(2026, 3, 20 + day)
  return date.toLocaleDateString(locale, { weekday: 'short' })
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const day = (copy.getDay() + 6) % 7
  copy.setDate(copy.getDate() - day)
  return copy
}

function formatWeekRange(referenceDate: Date, locale: string): string {
  const start = startOfWeek(referenceDate)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const from = start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
  const to = end.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
  return `${from} - ${to}`
}

function toSelectedDateLabel(date: string, locale: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  })
}

function toSelectedDateLongLabel(date: string, locale: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function monthStartFromIso(date: string): Date {
  const parsed = new Date(`${date}T00:00:00`)
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
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
    tags: Array.isArray(task.tags) ? task.tags.map(String) : [],
    completed: Boolean(task.completed),
    createdAt: String(task.createdAt),
    rewardedAt: task.rewardedAt ? String(task.rewardedAt) : undefined,
  }
}

async function migratePlannerTaskTags(tasks: PlannerTask[]): Promise<{
  tasks: PlannerTask[]
  tagMap: Record<string, TagSelection[]>
}> {
  for (const task of tasks) {
    if (task.tags.length === 0) continue
    const existing = await tagsService.forEntity(TAG_ENTITY_TYPES.PLANNER_TASK, task.id)
    if (existing.length > 0) continue
    const tags = await Promise.all(task.tags.map((tag) => tagsService.ensure(tag)))
    await tagsService.setForEntity(
      TAG_ENTITY_TYPES.PLANNER_TASK,
      task.id,
      tags.map((tag) => tag.id),
    )
  }

  const tagMap = await tagsService.forEntities(
    TAG_ENTITY_TYPES.PLANNER_TASK,
    tasks.map((task) => task.id),
  )
  return {
    tagMap,
    tasks: tasks.map((task) => {
      const globalTags = tagMap[task.id] ?? []
      return globalTags.length > 0 ? { ...task, tags: globalTags.map((tag) => tag.name) } : task
    }),
  }
}

export function CorePlannerPage() {
  const { t, locale, compareText } = useI18n()
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
  const [draftTags, setDraftTags] = useState<TagSelection[]>([])
  const [taskTags, setTaskTags] = useState<Record<string, TagSelection[]>>({})
  const [statusFilter, setStatusFilter] = useState<TaskFilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | PlannerCategory>('all')
  const [tagFilter, setTagFilter] = useState<'all' | string>('all')
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)
  const [isCreateExpanded, setIsCreateExpanded] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<PlannerMobileView>('day')

  const saveTasks = (nextTasks: PlannerTask[]) => {
    setTasks(nextTasks)
    if (!window.storage) return
    void window.storage.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [
      STORAGE_KEY,
      JSON.stringify(nextTasks),
    ])
  }

  useEffect(() => {
    if (!window.storage) return

    void window.storage
      .query(`SELECT value FROM settings WHERE key = ? LIMIT 1`, [STORAGE_KEY])
      .then(async (rows) => {
        const list = rows as { value: string }[]
        const raw = list[0]?.value
        if (!raw) return
        const parsed = JSON.parse(raw) as unknown[]
        if (!Array.isArray(parsed)) return
        const normalized = parsed
          .map((item) => normalizeTask(item))
          .filter((item): item is PlannerTask => Boolean(item))
        const migrated = await migratePlannerTaskTags(normalized)
        setTaskTags(migrated.tagMap)
        setTasks(migrated.tasks)
        if (JSON.stringify(normalized) !== JSON.stringify(migrated.tasks)) {
          void window.storage.execute(
            `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
            [STORAGE_KEY, JSON.stringify(migrated.tasks)],
          )
        }
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

  const selectedDayTasks = useMemo(
    () => tasksByDate.get(selectedDate) ?? [],
    [tasksByDate, selectedDate],
  )
  const selectedDayCompleted = selectedDayTasks.filter((task) => task.completed).length
  const selectedDayPending = selectedDayTasks.length - selectedDayCompleted
  const selectedDayPendingXp = selectedDayTasks.reduce(
    (sum, task) => sum + (task.completed ? 0 : COMPLEXITY_XP[task.complexity]),
    0,
  )

  const selectedTasks = useMemo(() => {
    return [...selectedDayTasks]
      .filter((task) => {
        const statusOk =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && !task.completed) ||
          (statusFilter === 'completed' && task.completed)
        const categoryOk = categoryFilter === 'all' || task.category === categoryFilter
        const tags = taskTags[task.id] ?? []
        const tagOk = tagFilter === 'all' || tags.some((tag) => String(tag.id) === tagFilter)
        return statusOk && categoryOk && tagOk
      })
      .sort((a, b) => Number(a.completed) - Number(b.completed))
  }, [selectedDayTasks, statusFilter, categoryFilter, taskTags, tagFilter])

  const availableTags = useMemo(() => {
    const byId = new Map<number, TagSelection>()
    for (const tags of Object.values(taskTags)) {
      for (const tag of tags) byId.set(tag.id, tag)
    }
    return [...byId.values()].sort((a, b) => compareText(a.name, b.name))
  }, [compareText, taskTags])

  const weekCells = useMemo(() => {
    const start = startOfWeek(new Date(`${selectedDate}T00:00:00`))
    return Array.from({ length: 7 }).map((_, idx) => {
      const day = new Date(start)
      day.setDate(start.getDate() + idx)
      return day
    })
  }, [selectedDate])

  const selectedDateLabel = toSelectedDateLabel(selectedDate, locale)
  const selectedDateLongLabel = toSelectedDateLongLabel(selectedDate, locale)
  const calendarLabel =
    viewMode === 'month'
      ? toMonthLabel(viewMonth, locale)
      : formatWeekRange(new Date(`${selectedDate}T00:00:00`), locale)
  const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || tagFilter !== 'all'
  const categoryLabel = (value: PlannerCategory) => t.planner.categories[value] ?? CATEGORY_LABELS[value]
  const complexityText = (value: PlannerComplexity) => t.planner.complexity[value] ?? complexityLabel(value)

  const selectDate = (date: string) => {
    setSelectedDate(date)
    setTaskDate(date)
    setViewMonth(monthStartFromIso(date))
  }

  const submitTask = (event: FormEvent) => {
    event.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const tagNames = draftTags.map((tag) => tag.name)
    const newTask: PlannerTask = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      category,
      complexity,
      date: taskDate,
      note: note.trim() || undefined,
      tags: tagNames,
      completed: false,
      createdAt: new Date().toISOString(),
    }

    saveTasks([newTask, ...tasks])
    void tagsService.setForEntity(
      TAG_ENTITY_TYPES.PLANNER_TASK,
      newTask.id,
      draftTags.map((tag) => tag.id),
    )
    setTaskTags((prev) => ({ ...prev, [newTask.id]: draftTags }))
    setTitle('')
    setNote('')
    setDraftTags([])
    setComplexity('media')
    setSelectedDate(taskDate)
    setViewMonth(monthStartFromIso(taskDate))
    setIsCreateExpanded(false)
    setExpandedTaskId(null)
    setMobileView('day')
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
      addPoints(
        xpToGrant,
        `Mision core (${complexityText(completedTask.complexity)}): ${completedTask.title}`,
      )
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
    setExpandedTaskId((current) => (current === id ? null : current))
    setTaskTags((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    void tagsService.unlinkEntity(TAG_ENTITY_TYPES.PLANNER_TASK, id)
  }

  const updateTaskTags = (taskId: string, tags: TagSelection[]) => {
    const tagNames = tags.map((tag) => tag.name)
    const next = tasks.map((task) => (task.id === taskId ? { ...task, tags: tagNames } : task))
    setTaskTags((prev) => ({ ...prev, [taskId]: tags }))
    saveTasks(next)
    void tagsService.setForEntity(
      TAG_ENTITY_TYPES.PLANNER_TASK,
      taskId,
      tags.map((tag) => tag.id),
    )
  }

  const gotoMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  const gotoWeek = (delta: number) => {
    const base = new Date(`${selectedDate}T00:00:00`)
    base.setDate(base.getDate() + delta * 7)
    const next = toIsoDate(base)
    selectDate(next)
  }

  const gotoToday = () => {
    selectDate(today)
  }

  const moveTaskToDate = (taskId: string, date: string) => {
    const next = tasks.map((task) => (task.id === taskId ? { ...task, date } : task))
    saveTasks(next)
    selectDate(date)
    setMobileView('day')
  }

  const renderDayCell = (cellDate: string, dayLabel: number | string) => {
    const dayTasks = tasksByDate.get(cellDate) ?? []
    const doneCount = dayTasks.filter((task) => task.completed).length
    const isSelected = selectedDate === cellDate
    const isToday = today === cellDate
    const hasTasks = dayTasks.length > 0
    const allDone = hasTasks && doneCount === dayTasks.length
    const isPartial = hasTasks && doneCount > 0 && !allDone
    const statusClass = !hasTasks
      ? 'border-border/70 bg-surface/45 hover:bg-surface/70'
      : allDone
        ? 'border-success/35 bg-success/10'
        : isPartial
          ? 'border-warning/35 bg-warning/10'
          : 'border-accent/35 bg-accent/10'

    return (
      <button
        key={cellDate}
        type="button"
        onClick={() => selectDate(cellDate)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (!draggedTaskId) return
          moveTaskToDate(draggedTaskId, cellDate)
          setDraggedTaskId(null)
        }}
        className={`h-16 rounded-lg border p-1.5 text-left transition-all ${
          isSelected ? 'border-accent bg-accent/10' : statusClass
        } ${isToday ? 'ring-1 ring-accent/45' : ''}`}
        aria-label={`${toSelectedDateLongLabel(cellDate, locale)}: ${dayTasks.length} tareas, ${doneCount} completadas`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">{dayLabel}</span>
          {hasTasks && (
            <span
              className={`rounded-full px-1.5 py-0.5 text-micro font-semibold ${
                allDone
                  ? 'bg-success/20 text-success'
                  : doneCount > 0
                    ? 'bg-warning/20 text-warning'
                    : 'bg-accent/20 text-accent-light'
              }`}
            >
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
    <div className="space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-border bg-surface-light/90 px-4 py-3 shadow-lg md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
            <CalendarDays size={18} className="text-accent-light" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-eyebrow text-muted">Core Planner</p>
            <h1 className="truncate text-xl font-semibold text-white">Planner</h1>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium capitalize text-accent-light">
            {selectedDateLabel}
          </span>
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            {selectedDayPending} pendiente{selectedDayPending === 1 ? '' : 's'} /{' '}
            {selectedDayTasks.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setTaskDate(selectedDate)
              setIsCreateExpanded(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/85"
          >
            <Plus size={14} aria-hidden />
            Nueva tarea
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setMobileView('day')}
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            mobileView === 'day'
              ? 'border-accent/50 bg-accent/15 text-accent-light'
              : 'border-border bg-surface text-muted'
          }`}
        >
          Día
        </button>
        <button
          type="button"
          onClick={() => setMobileView('calendar')}
          className={`rounded-lg border px-3 py-2 text-xs font-medium ${
            mobileView === 'calendar'
              ? 'border-accent/50 bg-accent/15 text-accent-light'
              : 'border-border bg-surface text-muted'
          }`}
        >
          Calendario
        </button>
      </div>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <main className="order-2 min-w-0 space-y-4 xl:order-1">
          <article
            className={`${mobileView === 'day' ? 'hidden sm:block' : ''} rounded-xl border border-border bg-surface-light/90 p-4 shadow-lg`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Calendario</h2>
                <p className="text-sm font-medium capitalize text-accent-light">{calendarLabel}</p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === 'month') gotoMonth(-1)
                    else gotoWeek(-1)
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted hover:text-white"
                  aria-label={viewMode === 'month' ? 'Mes anterior' : 'Semana anterior'}
                >
                  <ChevronLeft size={16} aria-hidden />
                </button>

                <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode('month')}
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      viewMode === 'month' ? 'bg-accent text-white' : 'text-muted hover:text-white'
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('week')}
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      viewMode === 'week' ? 'bg-accent text-white' : 'text-muted hover:text-white'
                    }`}
                  >
                    Semana
                  </button>
                </div>

                <button
                  type="button"
                  onClick={gotoToday}
                  className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted hover:text-white"
                >
                  Hoy
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (viewMode === 'month') gotoMonth(1)
                    else gotoWeek(1)
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted hover:text-white"
                  aria-label={viewMode === 'month' ? 'Mes siguiente' : 'Semana siguiente'}
                >
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-caption uppercase tracking-wide text-muted">
              {Array.from({ length: 7 }).map((_, idx) => (
                <span key={idx}>{toWeekdayLabel(idx, locale)}</span>
              ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
              {viewMode === 'month'
                ? monthCells.map((cell, idx) => {
                    if (!cell) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="h-16 rounded-lg border border-transparent"
                        />
                      )
                    }
                    const cellDate = toIsoDate(
                      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), cell),
                    )
                    return renderDayCell(cellDate, cell)
                  })
                : weekCells.map((day) => renderDayCell(toIsoDate(day), day.getDate()))}
            </div>
          </article>

          <section
            className={`${mobileView === 'calendar' ? 'hidden sm:block' : ''} rounded-xl border border-border bg-surface-light/90 p-4 shadow-lg`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-caption uppercase tracking-eyebrow text-muted">Tareas del día</p>
                <h2 className="text-lg font-semibold capitalize text-white">
                  {selectedDateLongLabel}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Mostrando {selectedTasks.length} de {selectedDayTasks.length} tarea
                  {selectedDayTasks.length === 1 ? '' : 's'}.
                </p>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
                <GripVertical size={12} aria-hidden />
                Arrastra para reprogramar
              </span>
            </div>

            {selectedTasks.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border bg-surface/55 px-4 py-6 text-center text-sm text-muted">
                {selectedDayTasks.length === 0
                  ? 'No hay tareas para este día.'
                  : 'No hay tareas que coincidan con los filtros activos.'}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {selectedTasks.map((task) => {
                  const tags = taskTags[task.id] ?? []
                  const tagsExpanded = expandedTaskId === task.id

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className={`flex min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors ${
                        task.completed
                          ? 'border-success/30 bg-success/10'
                          : 'border-border bg-surface/70'
                      }`}
                    >
                      <span className="mt-1 shrink-0 text-muted/70" title="Arrastrar al calendario">
                        <GripVertical size={16} aria-hidden />
                      </span>

                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="mt-1 shrink-0 text-muted hover:text-white"
                        title={task.completed ? 'Marcar pendiente' : 'Marcar completada'}
                        aria-label={task.completed ? 'Marcar pendiente' : 'Marcar completada'}
                      >
                        <CheckCircle2
                          size={18}
                          className={task.completed ? 'text-success' : ''}
                          aria-hidden
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium ${task.completed ? 'text-success line-through' : 'text-white'}`}
                        >
                          {task.title}
                        </p>
                        {task.note && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted">{task.note}</p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-caption text-muted">
                          <button
                            type="button"
                            onClick={() =>
                              setCategoryFilter((current) =>
                                current === task.category ? 'all' : task.category,
                              )
                            }
                            className={`rounded-full border px-2 py-0.5 transition-colors hover:bg-surface-lighter ${CATEGORY_STYLES[task.category]} ${
                              categoryFilter === task.category ? 'ring-1 ring-white/30' : ''
                            }`}
                            title={`Filtrar categoria ${categoryLabel(task.category)}`}
                          >
                            {categoryLabel(task.category)}
                          </button>
                          <span
                            className={`rounded-full border px-2 py-0.5 ${COMPLEXITY_STYLES[task.complexity]}`}
                          >
                            {complexityText(task.complexity)} - +{COMPLEXITY_XP[task.complexity]}{' '}
                            XP
                          </span>
                          {tags.slice(0, 3).map((tag) => (
                            <GlobalTagChip
                              key={tag.id}
                              tag={tag}
                              selected={tagFilter === String(tag.id)}
                              onClick={() =>
                                setTagFilter((current) =>
                                  current === String(tag.id) ? 'all' : String(tag.id),
                                )
                              }
                              className="px-2 py-0.5"
                            />
                          ))}
                          {tags.length > 3 && (
                            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-muted">
                              +{tags.length - 3}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskId((current) => (current === task.id ? null : task.id))
                            }
                            className="rounded-full border border-border bg-surface px-2 py-0.5 text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                            aria-expanded={tagsExpanded}
                          >
                            {tagsExpanded ? 'Cerrar tags' : 'Tags'}
                          </button>
                        </div>

                        {tagsExpanded && (
                          <GlobalTagPicker
                            selected={tags}
                            onChange={(nextTags) => updateTaskTags(task.id, nextTags)}
                            label="Tags"
                            placeholder="Agregar tag"
                            className="mt-3"
                          />
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="mt-0.5 shrink-0 rounded-md border border-danger/30 bg-danger/10 p-1.5 text-danger hover:bg-danger/20"
                        title="Eliminar tarea"
                        aria-label="Eliminar tarea"
                      >
                        <Trash2 size={14} aria-hidden />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </main>

        <aside className="order-1 grid min-w-0 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,0.8fr)_minmax(14rem,0.8fr)] xl:order-2 xl:block xl:space-y-4">
          <article className="rounded-xl border border-border bg-surface-light/90 p-4 shadow-lg md:col-span-2 lg:col-span-1 xl:col-span-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-white">Crear tarea</h2>
                <p className="text-xs text-muted">
                  Rápido por defecto, detallado cuando haga falta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateExpanded((current) => !current)}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted hover:text-white"
                aria-expanded={isCreateExpanded}
              >
                {isCreateExpanded ? (
                  <ChevronUp size={13} aria-hidden />
                ) : (
                  <ChevronDown size={13} aria-hidden />
                )}
                Opciones
              </button>
            </div>

            <form onSubmit={submitTask} className="mt-3 space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-muted">Título</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: limpiar cocina"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                />
              </label>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <label className="block min-w-0 space-y-1">
                  <span className="text-xs text-muted">Fecha</span>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  />
                </label>
                <button
                  type="submit"
                  className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-accent/85"
                >
                  <Plus size={14} aria-hidden />
                  Agregar
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateExpanded((current) => !current)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white"
              >
                <span className="truncate">
                  {categoryLabel(category)} - {complexityText(complexity)} - +
                  {COMPLEXITY_XP[complexity]} XP
                </span>
                {isCreateExpanded ? (
                  <ChevronUp size={13} aria-hidden />
                ) : (
                  <ChevronDown size={13} aria-hidden />
                )}
              </button>

              {isCreateExpanded && (
                <div className="space-y-3 rounded-xl border border-border bg-surface/60 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <label className="block space-y-1">
                      <span className="text-xs text-muted">Categoría</span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as PlannerCategory)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      >
                        <option value="domestica">{categoryLabel('domestica')}</option>
                        <option value="recordatorio">{categoryLabel('recordatorio')}</option>
                        <option value="trabajo">{categoryLabel('trabajo')}</option>
                        <option value="personal">{categoryLabel('personal')}</option>
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs text-muted">Complejidad (XP)</span>
                      <select
                        value={complexity}
                        onChange={(e) => setComplexity(e.target.value as PlannerComplexity)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                      >
                        <option value="baja">{complexityText('baja')} (+5 XP)</option>
                        <option value="media">{complexityText('media')} (+10 XP)</option>
                        <option value="alta">{complexityText('alta')} (+16 XP)</option>
                      </select>
                    </label>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs text-muted">Nota (opcional)</span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Detalle o contexto"
                      className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                    />
                  </label>

                  <GlobalTagPicker
                    selected={draftTags}
                    onChange={setDraftTags}
                    label="Tags globales"
                    placeholder="Buscar o crear tag"
                  />
                </div>
              )}
            </form>
          </article>

          <article className="rounded-xl border border-border bg-surface-light/90 p-3 shadow-lg xl:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-caption uppercase tracking-eyebrow text-muted">
                  Día seleccionado
                </p>
                <h2 className="text-base font-semibold capitalize text-white">
                  {selectedDateLongLabel}
                </h2>
              </div>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted">
                {selectedDayTasks.length} total
              </span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5 xl:mt-3 xl:gap-2">
              <div className="rounded-lg border border-border bg-surface px-2 py-1.5 xl:px-3 xl:py-2">
                <p className="text-caption uppercase tracking-wide text-muted">Pend.</p>
                <p className="mt-0.5 text-lg font-semibold text-warning xl:mt-1 xl:text-xl">
                  {selectedDayPending}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-2 py-1.5 xl:px-3 xl:py-2">
                <p className="text-caption uppercase tracking-wide text-muted">Listas</p>
                <p className="mt-0.5 text-lg font-semibold text-success xl:mt-1 xl:text-xl">
                  {selectedDayCompleted}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface px-2 py-1.5 xl:px-3 xl:py-2">
                <p className="text-caption uppercase tracking-wide text-muted">XP</p>
                <p className="mt-0.5 text-lg font-semibold text-accent-light xl:mt-1 xl:text-xl">
                  {selectedDayPendingXp}
                </p>
              </div>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-lighter xl:mt-3 xl:h-2">
              <div
                className="h-full rounded-full bg-success transition-all"
                style={{
                  width:
                    selectedDayTasks.length > 0
                      ? `${Math.round((selectedDayCompleted / selectedDayTasks.length) * 100)}%`
                      : '0%',
                }}
              />
            </div>
          </article>

          <article
            className={`${mobileView === 'calendar' ? 'hidden sm:block' : ''} rounded-xl border border-border bg-surface-light/90 p-3 shadow-lg xl:p-4`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-white">Filtros</h2>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all')
                    setCategoryFilter('all')
                    setTagFilter('all')
                  }}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted hover:text-white"
                >
                  Limpiar
                </button>
              )}
            </div>

            <div className="mt-2 space-y-2 xl:mt-3 xl:space-y-3">
              <label className="block space-y-1">
                <span className="text-caption uppercase tracking-wide text-muted">Estado</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as TaskFilterStatus)}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs xl:px-3 xl:py-2"
                >
                  <option value="all">{t.common.all}</option>
                  <option value="pending">{t.common.pending}</option>
                  <option value="completed">{t.common.completed}</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-caption uppercase tracking-wide text-muted">Categoría</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as 'all' | PlannerCategory)}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs xl:px-3 xl:py-2"
                >
                  <option value="all">{t.common.all}</option>
                  <option value="domestica">{categoryLabel('domestica')}</option>
                  <option value="recordatorio">{categoryLabel('recordatorio')}</option>
                  <option value="trabajo">{categoryLabel('trabajo')}</option>
                  <option value="personal">{categoryLabel('personal')}</option>
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-caption uppercase tracking-wide text-muted">Tag</span>
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs xl:px-3 xl:py-2"
                >
                  <option value="all">{t.common.all}</option>
                  {availableTags.map((tag) => (
                    <option key={tag.id} value={String(tag.id)}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {availableTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 xl:mt-3">
                {availableTags.slice(0, 10).map((tag) => (
                  <GlobalTagChip
                    key={tag.id}
                    tag={tag}
                    selected={tagFilter === String(tag.id)}
                    onClick={() =>
                      setTagFilter((current) =>
                        current === String(tag.id) ? 'all' : String(tag.id),
                      )
                    }
                  />
                ))}
              </div>
            )}
          </article>
        </aside>
      </section>
    </div>
  )
}
