import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  CircleAlert,
  Eraser,
  Flame,
  Gauge,
  ListChecks,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { getXpMultiplierForStreak } from '@core/gamification/gamificationUtils'
import { useCoreStore } from '@core/state/coreStore'
import { useToast } from './components/ToastProvider'
import { useWorkStore } from '@plugins/work/store'
import { usePlannerTasksToday, type PlannerTaskTodayItem } from './hooks/usePlannerTasksToday'
import {
  getColumnIds,
  isDoneColumn,
  isInProgressColumn,
} from '@plugins/work/utils/columnUtils'
import {
  formatDueDate,
  isDueDateOverdue,
  isDueDateToday,
} from '@core/utils/dateUtils'
import type { Card, Column } from '@plugins/work/types'
import { useI18n } from '@core/i18n'

type Difficulty = 'alta' | 'media' | 'baja'
type FocusTaskSource = 'work' | 'planner'

interface FocusTask {
  id: string
  title: string
  source: FocusTaskSource
  path: string
  difficulty: Difficulty
  isPrimary: boolean
  isOverdue: boolean
  isDueToday: boolean
  meta: string
}

const COLLAPSED_KEY = 'dashboard:todayFocusCollapsed:v1'

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  alta: 'border-danger/35 bg-danger/10 text-danger',
  media: 'border-warning/35 bg-warning/10 text-warning',
  baja: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
}

function getInitialCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(COLLAPSED_KEY) === '1'
}

function setPersistedCollapsed(value: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
  } catch {
    // ignore storage failures
  }
}

function buildFocusTasks({
  cards,
  columns,
  plannerTasks,
  includeWork,
}: {
  cards: Card[]
  columns: Column[]
  plannerTasks: PlannerTaskTodayItem[]
  includeWork: boolean
}): FocusTask[] {
  const doneIds = getColumnIds(columns, isDoneColumn)
  const inProgressIds = getColumnIds(columns, isInProgressColumn)
  const workTasks = includeWork
    ? cards
      .filter((card) => !card.archived && !doneIds.has(card.columnId))
      .map((card) => toWorkFocusTask(card, inProgressIds))
      .sort(compareFocusTasks)
      .slice(0, 8)
    : []

  const planner = plannerTasks.map(toPlannerFocusTask)

  return [...workTasks, ...planner].sort(compareFocusTasks)
}

function toWorkFocusTask(card: Card, inProgressIds: Set<string>): FocusTask {
  const overdue = isDueDateOverdue(card.dueDate)
  const dueToday = isDueDateToday(card.dueDate)
  const inProgress = inProgressIds.has(card.columnId)
  const checklistSize = card.checklist?.length ?? 0
  const estimate = card.estimateMinutes ?? 0

  const difficulty: Difficulty =
    card.priority === 'urgent' ||
    card.priority === 'high' ||
    overdue ||
    estimate >= 90 ||
    checklistSize >= 8
      ? 'alta'
      : card.priority === 'medium' || dueToday || inProgress || estimate >= 45 || checklistSize >= 4
        ? 'media'
        : 'baja'

  return {
    id: `work:${card.id}`,
    title: card.title,
    source: 'work',
    path: '/work',
    difficulty,
    isPrimary: difficulty === 'alta' || dueToday || overdue || inProgress,
    isOverdue: overdue,
    isDueToday: dueToday,
    meta: buildWorkMeta(card, inProgress),
  }
}

function toPlannerFocusTask(task: PlannerTaskTodayItem): FocusTask {
  const difficulty = task.complexity
  return {
    id: `planner:${task.id}`,
    title: task.title,
    source: 'planner',
    path: '/planner',
    difficulty,
    isPrimary: difficulty === 'alta' || task.isOverdue,
    isOverdue: task.isOverdue,
    isDueToday: !task.isOverdue,
    meta: task.isOverdue ? 'Atrasada' : 'Hoy',
  }
}

function buildWorkMeta(card: Card, inProgress: boolean): string {
  if (isDueDateOverdue(card.dueDate)) return 'Atrasada'
  if (isDueDateToday(card.dueDate)) return 'Vence hoy'
  if (inProgress) return 'En progreso'
  const due = formatDueDate(card.dueDate)
  if (due) return due
  if (card.estimateMinutes && card.estimateMinutes > 0) return `${card.estimateMinutes} min`
  return 'Pendiente'
}

function compareFocusTasks(a: FocusTask, b: FocusTask): number {
  if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
  if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
  if (a.isDueToday !== b.isDueToday) return a.isDueToday ? -1 : 1
  const rank: Record<Difficulty, number> = { alta: 0, media: 1, baja: 2 }
  const difficultyDelta = rank[a.difficulty] - rank[b.difficulty]
  if (difficultyDelta !== 0) return difficultyDelta
  return a.title.localeCompare(b.title)
}

/**
 * Vista "que hago hoy": combina tareas Work + Planner y misiones XP.
 * Se puede colapsar a un resumen denso para reducir altura del Dashboard.
 */
export function TodayFocus() {
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  const dailyMissions = useGamificationStore((s) => s.dailyMissions)
  const missionsCompletedDate = useGamificationStore((s) => s.missionsCompletedDate)
  const sweptMissionIds = useGamificationStore((s) => s.sweptMissionIds)
  const sweepCompletedMissions = useGamificationStore((s) => s.sweepCompletedMissions)
  const restoreSweptMissions = useGamificationStore((s) => s.restoreSweptMissions)
  const streak = useGamificationStore((s) => s.streak)

  const activePlugins = useCoreStore((s) => s.activePlugins)
  const isWorkActive = activePlugins.includes('work')
  const { cards, columns } = useWorkStore()
  const plannerTasks = usePlannerTasksToday(8)

  const focusTasks = useMemo(
    () => buildFocusTasks({ cards, columns, plannerTasks, includeWork: isWorkActive }),
    [cards, columns, plannerTasks, isWorkActive],
  )
  const primaryTasks = focusTasks.filter((task) => task.isPrimary)
  const secondaryTasks = focusTasks.filter((task) => !task.isPrimary)

  const visibleMissions = useMemo(() => {
    const swept = new Set(sweptMissionIds)
    return dailyMissions.filter((mission) => !(mission.completed && swept.has(mission.id)))
  }, [dailyMissions, sweptMissionIds])

  const hasMissions = visibleMissions.length > 0
  const hasFocusTasks = focusTasks.length > 0
  if (!hasMissions && !hasFocusTasks) return null

  const pendingMissions = dailyMissions.filter((m) => !m.completed).length
  const allMissionsCompleted = hasMissions && pendingMissions === 0
  const completedVisibleMissions = visibleMissions.filter((mission) => mission.completed).length
  const earnedXp = dailyMissions.filter((m) => m.completed).reduce((sum, m) => sum + m.xp, 0)
  const baseXp = dailyMissions.reduce((sum, m) => sum + m.xp, 0)
  const bonusXp = 15 + (streak >= 7 ? 5 : 0)
  const totalXp = baseXp + bonusXp
  const multiplier = getXpMultiplierForStreak(streak)
  const hasMultiplier = multiplier > 1
  const overdueCount = focusTasks.filter((task) => task.isOverdue).length
  const dueTodayCount = focusTasks.filter((task) => task.isDueToday).length
  const topTask = primaryTasks[0] ?? secondaryTasks[0]

  const clearCompletedMissions = () => {
    sweepCompletedMissions()
    toast.undo({
      message: 'Misiones completadas ocultas del dashboard.',
      undoLabel: 'Mostrar',
      onUndo: restoreSweptMissions,
    })
  }

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      setPersistedCollapsed(next)
      return next
    })
  }

  return (
    <section className={`min-w-0 rounded-2xl border border-border bg-surface-light/90 shadow-lg ${collapsed ? 'p-4' : 'p-5'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface">
            <Sun size={16} className="text-accent-light" />
          </span>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-eyebrow text-muted">Hoy</p>
            <h3 className="text-lg font-semibold text-white">Tu foco del dia</h3>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          {hasMissions && hasMultiplier && (
            <span className="hidden items-center gap-1 rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-caption font-semibold text-accent-light sm:inline-flex">
              <Zap size={11} />
              x{multiplier.toFixed(2)} XP
            </span>
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-caption font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
            title={collapsed ? 'Expandir foco del dia' : 'Colapsar foco del dia'}
          >
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            {collapsed ? 'Expandir' : 'Compactar'}
          </button>
        </div>
      </div>

      {collapsed ? (
        <CollapsedFocus
          topTask={topTask}
          primaryCount={primaryTasks.length}
          secondaryCount={secondaryTasks.length}
          pendingMissions={pendingMissions}
          earnedXp={earnedXp}
          totalXp={totalXp}
          onOpenTask={(path) => navigate(path)}
        />
      ) : (
        <>
          {hasFocusTasks && (
            <div className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-caption uppercase tracking-eyebrow text-muted">Misiones de accion</p>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
                  {overdueCount > 0 && (
                    <StatusBadge tone="danger" icon={<CircleAlert size={11} />}>
                      {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                    </StatusBadge>
                  )}
                  {dueTodayCount > 0 && (
                    <StatusBadge tone="warning" icon={<CalendarClock size={11} />}>
                      {dueTodayCount} hoy
                    </StatusBadge>
                  )}
                </div>
              </div>

              <TaskGroup
                title="Misiones principales"
                icon={<Flame size={14} />}
                empty="Sin misiones principales. Deja despejado lo importante."
                tasks={primaryTasks}
                onOpen={(task) => navigate(task.path)}
              />
              <TaskGroup
                title="Misiones secundarias"
                icon={<ListChecks size={14} />}
                empty="Sin secundarias por ahora."
                tasks={secondaryTasks}
                onOpen={(task) => navigate(task.path)}
              />
            </div>
          )}

          {hasFocusTasks && hasMissions && <div className="my-4 border-t border-border/60" />}

          {hasMissions && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-caption uppercase tracking-eyebrow text-muted">Misiones XP</p>
                <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <span className="text-caption text-muted">
                    <span className="font-semibold text-accent-light">{earnedXp}</span> / {totalXp} XP
                  </span>
                  {pendingMissions > 0 ? (
                    <span className="rounded-full border border-warning/35 bg-warning/15 px-2 py-0.5 text-caption font-semibold text-warning">
                      Pendiente
                    </span>
                  ) : (
                    <span className="rounded-full border border-success/35 bg-success/15 px-2 py-0.5 text-caption font-semibold text-success">
                      OK Completas
                    </span>
                  )}
                  {completedVisibleMissions > 0 && (
                    <button
                      type="button"
                      onClick={clearCompletedMissions}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-caption font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                      title="Ocultar misiones completadas de hoy"
                    >
                      <Eraser size={11} />
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {visibleMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className={`flex min-w-0 items-start justify-between gap-3 rounded-xl border px-3 py-2 transition-all ${
                      mission.completed
                        ? 'border-success/35 bg-success/10'
                        : 'border-border bg-surface/70'
                    }`}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                      {mission.completed ? (
                        <CheckCircle2 size={16} className="shrink-0 text-success" />
                      ) : (
                        <Circle size={14} className="shrink-0 text-muted" />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-medium text-white">
                          {t.gamification.missions[mission.id]?.title ?? mission.title}
                        </p>
                        <p className="line-clamp-2 text-xs text-muted">
                          {t.gamification.missions[mission.id]?.description ?? mission.description}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${
                        mission.completed ? 'bg-success/15 text-success' : 'bg-accent/15 text-accent-light'
                      }`}
                    >
                      +{mission.xp} XP
                    </span>
                  </div>
                ))}
              </div>

              {allMissionsCompleted && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-success/30 bg-success/12 px-3 py-2 text-sm text-success animate-fade-in">
                  <Sparkles size={14} className="mt-0.5 shrink-0" />
                  <span>Dia completo - +{bonusXp} XP bonus{missionsCompletedDate ? ' aplicado' : ' pendiente'}</span>
                </div>
              )}

              {!allMissionsCompleted && pendingMissions === 1 && (
                <p className="mt-2 text-center text-xs text-muted">Queda 1 mision. Casi.</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function CollapsedFocus({
  topTask,
  primaryCount,
  secondaryCount,
  pendingMissions,
  earnedXp,
  totalXp,
  onOpenTask,
}: {
  topTask: FocusTask | undefined
  primaryCount: number
  secondaryCount: number
  pendingMissions: number
  earnedXp: number
  totalXp: number
  onOpenTask: (path: string) => void
}) {
  const { language } = useI18n()
  const xpPct = totalXp > 0 ? Math.min(100, Math.round((earnedXp / totalXp) * 100)) : 0

  return (
    <div className="today-focus-summary-grid mt-3 gap-3">
      <button
        type="button"
        onClick={() => topTask && onOpenTask(topTask.path)}
        disabled={!topTask}
        className="flex min-h-[76px] min-w-0 items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-left transition-colors hover:border-accent/50 disabled:cursor-default disabled:opacity-70"
      >
        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-1.5 text-caption uppercase tracking-wider text-accent-light">
            <Flame size={12} className="shrink-0" />
            Siguiente mejor accion
          </p>
          <p className="mt-1 line-clamp-2 break-words text-sm font-semibold text-white">
            {topTask?.title ?? (language === 'en' ? 'Nothing urgent for now' : 'Nada urgente por ahora')}
          </p>
          <p className="mt-0.5 break-words text-caption text-muted">
            {topTask ? `${sourceLabel(topTask.source)} - ${DIFFICULTY_LABEL[topTask.difficulty]}` : 'Tu foco esta limpio'}
          </p>
        </div>
        {topTask && <ArrowRight size={15} className="mt-1 shrink-0 text-accent-light" />}
      </button>

      <div className="workspace-auto-grid-sm gap-2">
        <Metric label="Principales" value={primaryCount} tone="text-danger" />
        <Metric label="Secundarias" value={secondaryCount} tone="text-emerald-300" />
      </div>

      <div className="min-w-0 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-muted">
            <Gauge size={12} />
            Pulso XP
          </p>
          <span className="text-caption font-semibold text-accent-light">{earnedXp}/{totalXp || 0}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-lighter">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${xpPct}%` }} />
        </div>
        <p className="mt-2 text-caption text-muted">
          {language === 'en'
            ? `${pendingMissions} pending XP mission${pendingMissions === 1 ? '' : 's'}`
            : `${pendingMissions} misiones XP pendientes`}
        </p>
      </div>
    </div>
  )
}

function TaskGroup({
  title,
  icon,
  empty,
  tasks,
  onOpen,
}: {
  title: string
  icon: React.ReactNode
  empty: string
  tasks: FocusTask[]
  onOpen: (task: FocusTask) => void
}) {
  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-2 text-caption uppercase tracking-eyebrow text-muted">
        {icon}
        <span>{title}</span>
        <span className="rounded-full border border-border bg-surface px-1.5 py-0.5 text-micro">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface/55 px-3 py-2.5 text-sm text-muted">{empty}</div>
      ) : (
        <div className="today-focus-task-grid gap-2">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onOpen(task)}
              className="flex w-full min-w-0 flex-col items-stretch gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-left transition-all hover:border-accent/40 hover:bg-surface"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${sourceStyle(task.source)}`}>
                    {sourceLabel(task.source)}
                  </span>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DIFFICULTY_STYLE[task.difficulty]}`}>
                    {DIFFICULTY_LABEL[task.difficulty]}
                  </span>
                </div>
                <p className="line-clamp-2 break-words text-sm font-medium text-white">{task.title}</p>
              </div>
              <div className="flex min-w-0 items-center justify-between gap-1.5">
                <span
                  className={`min-w-0 break-words text-caption font-medium ${
                    task.isOverdue ? 'text-danger' : task.isDueToday ? 'text-warning' : 'text-muted'
                  }`}
                >
                  {task.meta}
                </span>
                <ArrowRight size={13} className="shrink-0 text-muted/60" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ tone, icon, children }: { tone: 'danger' | 'warning'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === 'danger'
    ? 'border-danger/35 bg-danger/10 text-danger'
    : 'border-warning/35 bg-warning/10 text-warning'
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold ${cls}`}>
      {icon}
      {children}
    </span>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface px-3 py-3">
      <p className="break-words text-caption uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

function sourceLabel(source: FocusTaskSource): string {
  return source === 'work' ? 'Work' : 'Planner'
}

function sourceStyle(source: FocusTaskSource): string {
  return source === 'work'
    ? 'border-violet-500/35 bg-violet-500/10 text-violet-300'
    : 'border-amber-500/35 bg-amber-500/10 text-amber-300'
}
