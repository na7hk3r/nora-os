import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleAlert,
  Eraser,
  ListTodo,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { getXpMultiplierForStreak } from '@core/gamification/gamificationUtils'
import { useCoreStore } from '@core/state/coreStore'
import { useToast } from './components/ToastProvider'
import { useWorkStore } from '@plugins/work/store'
import { usePlannerTasksToday } from './hooks/usePlannerTasksToday'
import {
  isDoneColumn,
  isInProgressColumn,
  isTodoColumn,
  getColumnIds,
} from '@plugins/work/utils/columnUtils'
import {
  formatDueDate,
  isDueDateOverdue,
  isDueDateToday,
} from '@core/utils/dateUtils'
import type { Card, Column } from '@plugins/work/types'

interface PriorityGroup {
  priorityTasks: Card[]
  overdueCount: number
  dueTodayCount: number
  totalPending: number
}

function computePriorityTasks(cards: Card[], columns: Column[]): PriorityGroup {
  const doneIds = getColumnIds(columns, isDoneColumn)
  const inProgressIds = getColumnIds(columns, isInProgressColumn)
  const todoIds = getColumnIds(columns, isTodoColumn)

  const activeCards = cards.filter((c) => !doneIds.has(c.columnId))
  const inProgressCards = activeCards.filter((c) => inProgressIds.has(c.columnId))
  const todoCardsWithDate = activeCards
    .filter((c) => todoIds.has(c.columnId) && c.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

  const priorityTasks = [...inProgressCards, ...todoCardsWithDate].slice(0, 3)

  const overdueCount = activeCards.filter((c) => c.dueDate && isDueDateOverdue(c.dueDate)).length
  const dueTodayCount = activeCards.filter((c) => c.dueDate && isDueDateToday(c.dueDate)).length

  return {
    priorityTasks,
    overdueCount,
    dueTodayCount,
    totalPending: activeCards.length,
  }
}

/**
 * Vista única "¿Qué hago hoy?" — combina las tareas prioritarias del día (Work)
 * y las misiones diarias (gamificación) en una sola tarjeta con dos secciones
 * apiladas. Sin tabs: ambas secciones siempre visibles.
 *
 * Renderiza solo las secciones aplicables al usuario (si no hay plugin work
 * activo, oculta tareas; si no hay misiones generadas, oculta misiones).
 */
export function TodayFocus() {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Misiones (gamificación)
  const dailyMissions = useGamificationStore((s) => s.dailyMissions)
  const missionsCompletedDate = useGamificationStore((s) => s.missionsCompletedDate)
  const sweptMissionIds = useGamificationStore((s) => s.sweptMissionIds)
  const sweepCompletedMissions = useGamificationStore((s) => s.sweepCompletedMissions)
  const restoreSweptMissions = useGamificationStore((s) => s.restoreSweptMissions)
  const streak = useGamificationStore((s) => s.streak)

  // Tareas (work)
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const isWorkActive = activePlugins.includes('work')
  const { cards, columns } = useWorkStore()

  // Tareas del Planner core (no plugin)
  const plannerTasks = usePlannerTasksToday(3)

  const taskGroup = useMemo(
    () => computePriorityTasks(cards, columns),
    [cards, columns],
  )

  const visibleMissions = useMemo(() => {
    const swept = new Set(sweptMissionIds)
    return dailyMissions.filter((mission) => !(mission.completed && swept.has(mission.id)))
  }, [dailyMissions, sweptMissionIds])

  const hasMissions = visibleMissions.length > 0
  const hasTasks = isWorkActive && cards.length > 0
  const hasPlanner = plannerTasks.length > 0

  if (!hasMissions && !hasTasks && !hasPlanner) return null

  const pendingMissions = dailyMissions.filter((m) => !m.completed).length
  const allMissionsCompleted = hasMissions && pendingMissions === 0
  const completedVisibleMissions = visibleMissions.filter((mission) => mission.completed).length
  const earnedXp = dailyMissions.filter((m) => m.completed).reduce((sum, m) => sum + m.xp, 0)
  const baseXp = dailyMissions.reduce((sum, m) => sum + m.xp, 0)
  const bonusXp = 15 + (streak >= 7 ? 5 : 0)
  const totalXp = baseXp + bonusXp
  const multiplier = getXpMultiplierForStreak(streak)
  const hasMultiplier = multiplier > 1

  const taskBadges = hasTasks && (taskGroup.overdueCount > 0 || taskGroup.dueTodayCount > 0)

  const clearCompletedMissions = () => {
    sweepCompletedMissions()
    toast.undo({
      message: 'Misiones completadas ocultas del dashboard.',
      undoLabel: 'Mostrar',
      onUndo: restoreSweptMissions,
    })
  }

  return (
    <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface">
            <Sun size={16} className="text-accent-light" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-muted">Hoy</p>
            <h3 className="text-lg font-semibold text-white">Tu foco del día</h3>
          </div>
        </div>
        {hasMissions && hasMultiplier && (
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-caption font-semibold text-accent-light">
            <Zap size={11} />
            ×{multiplier.toFixed(2)} XP
          </span>
        )}
      </div>

      {/* Sección 1: Tareas principales */}
      {hasTasks && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption uppercase tracking-eyebrow text-muted">Tareas</p>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {taskGroup.overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-danger/35 bg-danger/10 px-2 py-0.5 text-caption font-semibold text-danger">
                  <CircleAlert size={11} />
                  {taskGroup.overdueCount} atrasada{taskGroup.overdueCount > 1 ? 's' : ''}
                </span>
              )}
              {taskGroup.dueTodayCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/35 bg-warning/10 px-2 py-0.5 text-caption font-semibold text-warning">
                  <CalendarClock size={11} />
                  {taskGroup.dueTodayCount} vence{taskGroup.dueTodayCount > 1 ? 'n' : ''} hoy
                </span>
              )}
            </div>
          </div>

          <div className={`space-y-2 ${taskBadges ? 'mt-2' : 'mt-3'}`}>
            {taskGroup.priorityTasks.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2.5 text-sm text-success">
                <ListTodo size={15} />
                Sin tareas principales hoy. Buen trabajo.
              </div>
            ) : (
              taskGroup.priorityTasks.map((task) => {
                const dateLabel = formatDueDate(task.dueDate)
                const overdue = isDueDateOverdue(task.dueDate)
                const dueToday = isDueDateToday(task.dueDate)

                return (
                  <button
                    key={task.id}
                    onClick={() => navigate('/work')}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-left transition-all hover:border-accent/40 hover:bg-surface"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="rounded-md border border-violet-500/35 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
                        Work
                      </span>
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{task.title}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {dateLabel && (
                        <span
                          className={`text-caption font-medium ${
                            overdue ? 'text-danger' : dueToday ? 'text-warning' : 'text-muted'
                          }`}
                        >
                          {dateLabel}
                        </span>
                      )}
                      <ArrowRight size={13} className="text-muted/60" />
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {taskGroup.totalPending > 3 && taskGroup.priorityTasks.length > 0 && (
            <button
              onClick={() => navigate('/work')}
              className="mt-2 w-full text-center text-caption text-muted transition-colors hover:text-accent-light"
            >
              +{taskGroup.totalPending - 3} más pendientes → Ver tablero
            </button>
          )}
        </div>
      )}

      {/* Separador después de Tareas si hay Planner o Misiones */}
      {hasTasks && (hasPlanner || hasMissions) && <div className="my-4 border-t border-border/60" />}

      {/* Sección Planner: tareas del calendario core (no plugin) */}
      {hasPlanner && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption uppercase tracking-eyebrow text-muted">Planner</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-caption font-semibold text-amber-300">
              <CalendarClock size={11} />
              {plannerTasks.length}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {plannerTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => navigate('/planner')}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2.5 text-left transition-all hover:border-amber-500/40 hover:bg-surface"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="rounded-md border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                    Planner
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{task.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`text-caption font-medium ${
                      task.isOverdue ? 'text-danger' : 'text-warning'
                    }`}
                  >
                    {task.isOverdue ? 'Atrasada' : 'Hoy'}
                  </span>
                  <ArrowRight size={13} className="text-muted/60" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Separador antes de Misiones si hay Planner */}
      {hasPlanner && hasMissions && <div className="my-4 border-t border-border/60" />}

      {/* Sección 2: Misiones diarias */}
      {hasMissions && (
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-caption uppercase tracking-eyebrow text-muted">Misiones</p>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-caption text-muted">
                <span className="font-semibold text-accent-light">{earnedXp}</span> / {totalXp} XP
              </span>
              {pendingMissions > 0 ? (
                <span className="rounded-full border border-warning/35 bg-warning/15 px-2 py-0.5 text-caption font-semibold text-warning">
                  Pendiente
                </span>
              ) : (
                <span className="rounded-full border border-success/35 bg-success/15 px-2 py-0.5 text-caption font-semibold text-success">
                  ✓ Completas
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
                className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-all ${
                  mission.completed
                    ? 'border-success/35 bg-success/10'
                    : 'border-border bg-surface/70'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {mission.completed ? (
                    <CheckCircle2 size={16} className="shrink-0 text-success" />
                  ) : (
                    <Circle size={14} className="shrink-0 text-muted" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{mission.title}</p>
                    <p className="truncate text-xs text-muted">{mission.description}</p>
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
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-success/30 bg-success/12 px-3 py-2 text-sm text-success animate-fade-in">
              <Sparkles size={14} />
              <span>Día completo · +{bonusXp} XP bonus{missionsCompletedDate ? ' aplicado' : ' pendiente'}</span>
            </div>
          )}

          {!allMissionsCompleted && pendingMissions === 1 && (
            <p className="mt-2 text-center text-xs text-muted">Queda 1 misión — casi.</p>
          )}
        </div>
      )}
    </section>
  )
}
