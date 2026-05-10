import { eventBus } from '@core/events/EventBus'
import type { GamificationStats } from './gamificationStore'
import { useFitnessStore } from '@plugins/fitness/store'
import { useWorkStore } from '@plugins/work/store'
import { FITNESS_EVENTS } from '@plugins/fitness/events'
import { WORK_EVENTS } from '@plugins/work/events'
import { CORE_EVENTS } from '@core/events/events'
import { getNoriStage } from './pulsoNora'

const ACTION_EVENTS: Set<string> = new Set([
  FITNESS_EVENTS.DAILY_ENTRY_SAVED,
  FITNESS_EVENTS.WORKOUT_COMPLETED,
  FITNESS_EVENTS.MEASUREMENT_SAVED,
  WORK_EVENTS.TASK_COMPLETED,
  WORK_EVENTS.FOCUS_STARTED,
  WORK_EVENTS.FOCUS_COMPLETED,
  WORK_EVENTS.NOTE_CREATED,
  CORE_EVENTS.PLANNER_TASK_COMPLETED,
])

export interface AchievementProgress {
  current: number
  target: number
  label: string
  percent: number
}

interface LevelTitleRange {
  min: number
  max: number
  title: string
}

const LEVEL_TITLES: LevelTitleRange[] = [
  { min: 1, max: 3, title: 'Chispa inicial' },
  { min: 4, max: 6, title: 'Companero de ritmo' },
  { min: 7, max: 9, title: 'Guardian del pulso' },
  { min: 10, max: 12, title: 'Oraculo operativo' },
  { min: 13, max: 14, title: 'Nucleo vivo' },
  { min: 15, max: Number.MAX_SAFE_INTEGER, title: 'Sincronia total' },
]

export type LevelTier = 'bronze' | 'silver' | 'gold' | 'platinum'

export function getIsoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function isSameDateKey(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10)
}

export function getLevelTier(level: number): LevelTier {
  if (level < 4) return 'bronze'
  if (level < 8) return 'silver'
  if (level < 12) return 'gold'
  return 'platinum'
}

export function getLevelTitle(level: number): string {
  const stage = getNoriStage(level)
  if (stage?.title) return stage.title
  for (const entry of LEVEL_TITLES) {
    if (level >= entry.min && level <= entry.max) {
      return entry.title
    }
  }
  return 'Aprendiz'
}

export function getXpMultiplierForStreak(streak: number): number {
  if (streak >= 30) return 1.25
  if (streak >= 7) return 1.1
  return 1
}

function countActionsBeforeNine(history?: { date: string }[]): number {
  if (history && history.length > 0) {
    return history.filter((entry) => new Date(entry.date).getHours() < 9).length
  }

  const events = eventBus.getHistory(200)
  return events.filter((entry) => {
    if (!ACTION_EVENTS.has(entry.event)) return false
    const hour = new Date(entry.timestamp).getHours()
    return hour < 9
  }).length
}

function countCompletedTasks(): number {
  const work = useWorkStore.getState()
  const doneColumns = new Set(
    work.columns
      .filter((column) => column.id === 'col-done' || /hecho|done/i.test(column.name))
      .map((column) => column.id),
  )

  return work.cards.filter((card) => doneColumns.has(card.columnId)).length
}

export function buildGamificationStats(
  totalPoints: number,
  dailyStreak: number,
  history?: { date: string }[],
): GamificationStats {
  const fitness = useFitnessStore.getState()
  const work = useWorkStore.getState()
  const totalWorkouts = fitness.entries.filter((entry) => entry.workout === 'A' || entry.workout === 'B').length
  const focusCompleted = work.focusSessions.filter((session) => Boolean(session.endTime) && !session.interrupted).length

  return {
    totalPoints,
    dailyStreak,
    totalEntries: fitness.entries.length,
    totalWorkouts,
    tasksCompleted: countCompletedTasks(),
    focusCompleted,
    notesCreated: work.notes.length,
    measurementsLogged: fitness.measurements.length,
    actionsBeforeNine: countActionsBeforeNine(history),
  }
}

export function getAchievementProgress(id: string, stats: GamificationStats): AchievementProgress {
  switch (id) {
    case 'first-entry':
      return toProgress(stats.totalEntries, 1, 'registros')
    case 'week-streak':
      return toProgress(stats.dailyStreak, 7, 'dias de racha')
    case 'month-streak':
      return toProgress(stats.dailyStreak, 30, 'dias de racha')
    case 'centurion':
      return toProgress(stats.totalPoints, 100, 'puntos')
    case 'workout-10':
      return toProgress(stats.totalWorkouts, 10, 'entrenamientos')
    case 'tasks-25':
      return toProgress(stats.tasksCompleted, 25, 'tareas')
    case 'focus-master':
      return toProgress(stats.focusCompleted, 20, 'sesiones de foco')
    case 'note-taker':
      return toProgress(stats.notesCreated, 10, 'notas')
    case 'consistency-3':
      return toProgress(stats.dailyStreak, 3, 'dias de racha')
    case 'points-500':
      return toProgress(stats.totalPoints, 500, 'puntos')
    case 'points-1000':
      return toProgress(stats.totalPoints, 1000, 'puntos')
    case 'early-bird':
      return toProgress(stats.actionsBeforeNine, 1, 'acciones antes de 9am')
    default:
      return toProgress(0, 1, 'progreso')
  }
}

function toProgress(current: number, target: number, label: string): AchievementProgress {
  const safeCurrent = Math.max(0, Math.floor(current))
  const percent = Math.max(0, Math.min(100, Math.round((safeCurrent / target) * 100)))
  return {
    current: safeCurrent,
    target,
    label,
    percent,
  }
}

export function getNextAchievement(
  achievements: { id: string; title: string }[],
  unlockedIds: string[],
  stats: GamificationStats,
): { id: string; title: string; progress: AchievementProgress } | null {
  const locked = achievements
    .filter((achievement) => !unlockedIds.includes(achievement.id))
    .map((achievement) => ({
      ...achievement,
      progress: getAchievementProgress(achievement.id, stats),
    }))

  if (locked.length === 0) return null

  locked.sort((a, b) => {
    const left = a.progress.current / a.progress.target
    const right = b.progress.current / b.progress.target
    return right - left
  })

  return locked[0]
}

export function getXpHistoryByDay(history: { amount: number; reason: string; date: string }[], days = 7) {
  const dayMap = new Map<string, number>()
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = getIsoDateKey(d)
    dayMap.set(key, 0)
  }

  for (const entry of history) {
    const key = entry.date.slice(0, 10)
    if (!dayMap.has(key)) continue
    dayMap.set(key, (dayMap.get(key) ?? 0) + entry.amount)
  }

  return Array.from(dayMap.entries()).map(([date, xp]) => ({
    date: date.slice(5),
    xp,
  }))
}

export function userActedToday(lastActionAt?: string): boolean {
  if (!lastActionAt) return false
  return isSameDateKey(lastActionAt, getIsoDateKey(new Date()))
}

export function isMissionTrackedEvent(eventName: string): boolean {
  return ACTION_EVENTS.has(eventName)
}
