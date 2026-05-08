import { create } from 'zustand'
import { eventBus } from '@core/events/EventBus'
import { GAMIFICATION_EVENTS } from '@core/events/events'
import { FITNESS_EVENTS } from '@plugins/fitness/events'
import { WORK_EVENTS } from '@plugins/work/events'
import { getIsoDateKey, getXpMultiplierForStreak } from './gamificationUtils'
import { useCoreStore } from '@core/state/coreStore'
import { CORE_EVENTS } from '@core/events/events'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  condition: (stats: GamificationStats) => boolean
  unlockedAt?: string
}

export interface GamificationStats {
  totalPoints: number
  dailyStreak: number
  totalEntries: number
  totalWorkouts: number
  tasksCompleted: number
  focusCompleted: number
  notesCreated: number
  measurementsLogged: number
  actionsBeforeNine: number
}

export interface DailyMission {
  id: string
  title: string
  description: string
  xp: number
  triggerEvents: string[]
  completed: boolean
  completedAt?: string
}

interface GamificationState {
  points: number
  level: number
  streak: number
  history: { amount: number; reason: string; date: string }[]
  achievements: Achievement[]
  unlockedIds: string[]
  dailyMissions: DailyMission[]
  dailyMissionsDate: string
  missionsCompletedDate?: string
  sweptMissionIds: string[]
  sweptMissionsDate?: string
  lastActionAt?: string

  addPoints: (amount: number, reason: string) => void
  setStreak: (n: number) => void
  unlockAchievement: (id: string) => void
  checkAchievements: (stats: GamificationStats) => void
  ensureDailyMissions: () => void
  sweepCompletedMissions: () => void
  restoreSweptMissions: () => void
  processMissionEvent: (eventName: string) => void
  markDailyAction: (isoDate?: string) => void
  loadFromStorage: () => Promise<void>
}

interface PersistedGamificationState {
  points: number
  level: number
  streak: number
  history: { amount: number; reason: string; date: string }[]
  unlockedIds: string[]
  dailyMissions?: DailyMission[]
  dailyMissionsDate?: string
  missionsCompletedDate?: string
  sweptMissionIds?: string[]
  sweptMissionsDate?: string
  lastActionAt?: string
}

const POINTS_PER_LEVEL = 100

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-entry',
    title: 'Primer registro',
    description: 'Registraste tu primer día',
    icon: 'Star',
    condition: (s) => s.totalEntries >= 1,
  },
  {
    id: 'week-streak',
    title: 'Racha semanal',
    description: '7 días seguidos registrando',
    icon: 'Flame',
    condition: (s) => s.dailyStreak >= 7,
  },
  {
    id: 'month-streak',
    title: 'Racha mensual',
    description: '30 días seguidos registrando',
    icon: 'Gem',
    condition: (s) => s.dailyStreak >= 30,
  },
  {
    id: 'centurion',
    title: 'Centurión',
    description: 'Acumula 100 puntos',
    icon: 'Target',
    condition: (s) => s.totalPoints >= 100,
  },
  {
    id: 'workout-10',
    title: 'Deportista',
    description: 'Completa 10 entrenamientos',
    icon: 'PersonStanding',
    condition: (s) => s.totalWorkouts >= 10,
  },
  {
    id: 'tasks-25',
    title: 'Productivo',
    description: 'Completa 25 tareas',
    icon: 'CheckCircle2',
    condition: (s) => s.tasksCompleted >= 25,
  },
  {
    id: 'focus-master',
    title: 'Maestro del foco',
    description: 'Completa 20 sesiones de foco',
    icon: 'TimerReset',
    condition: (s) => s.focusCompleted >= 20,
  },
  {
    id: 'note-taker',
    title: 'Cronista',
    description: 'Crea 10 notas',
    icon: 'NotebookPen',
    condition: (s) => s.notesCreated >= 10,
  },
  {
    id: 'consistency-3',
    title: 'Consistencia inicial',
    description: 'Mantiene una racha de 3 dias',
    icon: 'Flame',
    condition: (s) => s.dailyStreak >= 3,
  },
  {
    id: 'points-500',
    title: 'Acumulador 500',
    description: 'Alcanza 500 puntos totales',
    icon: 'Target',
    condition: (s) => s.totalPoints >= 500,
  },
  {
    id: 'points-1000',
    title: 'Acumulador 1000',
    description: 'Alcanza 1000 puntos totales',
    icon: 'Gem',
    condition: (s) => s.totalPoints >= 1000,
  },
  {
    id: 'early-bird',
    title: 'Early bird',
    description: 'Registra una accion antes de las 9:00',
    icon: 'Sunrise',
    condition: (s) => s.actionsBeforeNine >= 1,
  },
]

interface DailyMissionTemplate extends Omit<DailyMission, 'completed' | 'completedAt'> {
  requiredPlugins: string[]
}

const DAILY_MISSION_TEMPLATES: DailyMissionTemplate[] = [
  {
    id: 'fitness-entry',
    title: 'Registra fitness hoy',
    description: 'Registra tu entrada de fitness del dia',
    xp: 5,
    triggerEvents: [FITNESS_EVENTS.DAILY_ENTRY_SAVED],
    requiredPlugins: ['fitness'],
  },
  {
    id: 'work-task',
    title: 'Completa 1 tarea de trabajo',
    description: 'Mueve una tarea a hecho para cerrar una mision',
    xp: 10,
    triggerEvents: [WORK_EVENTS.TASK_COMPLETED],
    requiredPlugins: ['work'],
  },
  {
    id: 'focus-start',
    title: 'Inicia una sesion de foco',
    description: 'Activa al menos una sesion de foco hoy',
    xp: 5,
    triggerEvents: [WORK_EVENTS.FOCUS_STARTED],
    requiredPlugins: ['work'],
  },
  {
    id: 'core-planner-task',
    title: 'Completa una mision del planner',
    description: 'Cierra al menos una tarea del planner core',
    xp: 8,
    triggerEvents: [CORE_EVENTS.PLANNER_TASK_COMPLETED],
    requiredPlugins: [],
  },
]

const SETTINGS_KEY = 'gamificationState'

function getPersistableState(state: Pick<GamificationState, 'points' | 'level' | 'streak' | 'history' | 'unlockedIds' | 'dailyMissions' | 'dailyMissionsDate' | 'missionsCompletedDate' | 'sweptMissionIds' | 'sweptMissionsDate' | 'lastActionAt'>): PersistedGamificationState {
  return {
    points: state.points,
    level: state.level,
    streak: state.streak,
    history: state.history.slice(0, 180),
    unlockedIds: state.unlockedIds,
    dailyMissions: state.dailyMissions,
    dailyMissionsDate: state.dailyMissionsDate,
    missionsCompletedDate: state.missionsCompletedDate,
    sweptMissionIds: state.sweptMissionIds,
    sweptMissionsDate: state.sweptMissionsDate,
    lastActionAt: state.lastActionAt,
  }
}

function persistState(state: Pick<GamificationState, 'points' | 'level' | 'streak' | 'history' | 'unlockedIds' | 'dailyMissions' | 'dailyMissionsDate' | 'missionsCompletedDate' | 'sweptMissionIds' | 'sweptMissionsDate' | 'lastActionAt'>): void {
  if (!window.storage) return
  const payload = JSON.stringify(getPersistableState(state))
  void window.storage.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [SETTINGS_KEY, payload],
  )
}

function getDayDistance(from: Date, to: Date): number {
  const left = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const right = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.floor((right - left) / 86_400_000)
}

function buildTodayMissions(activePluginIds: string[], previousMissions: DailyMission[] = []): DailyMission[] {
  const previousById = new Map(previousMissions.map((mission) => [mission.id, mission]))

  return DAILY_MISSION_TEMPLATES
    .filter((mission) => mission.requiredPlugins.every((pluginId) => activePluginIds.includes(pluginId)))
    .map((mission) => {
      const previous = previousById.get(mission.id)
      return {
        id: mission.id,
        title: mission.title,
        description: mission.description,
        xp: mission.xp,
        triggerEvents: mission.triggerEvents,
        completed: previous?.completed ?? false,
        completedAt: previous?.completedAt,
      }
    })
}

function haveMissionsChanged(current: DailyMission[], next: DailyMission[]): boolean {
  if (current.length !== next.length) return true

  for (let i = 0; i < current.length; i++) {
    const left = current[i]
    const right = next[i]
    if (!right) return true
    if (left.id !== right.id || left.completed !== right.completed) {
      return true
    }
  }

  return false
}

function recalcStreakFromLastAction(streak: number, lastActionAt?: string): number {
  if (!lastActionAt) return streak
  const distance = getDayDistance(new Date(lastActionAt), new Date())
  if (distance <= 1) return streak
  return 0
}

function computeNextStreak(currentStreak: number, lastActionAt: string | undefined, currentStamp: string): number {
  if (!lastActionAt) return 1

  const previousDate = new Date(lastActionAt)
  const currentDate = new Date(currentStamp)
  const distance = getDayDistance(previousDate, currentDate)

  if (distance <= 0) return currentStreak
  if (distance === 1) return currentStreak + 1
  return 1
}

function getSweepContext(
  state: Pick<GamificationState, 'sweptMissionIds' | 'sweptMissionsDate'>,
  missions: DailyMission[],
  today: string,
): Pick<GamificationState, 'sweptMissionIds' | 'sweptMissionsDate'> {
  if (state.sweptMissionsDate !== today) {
    return { sweptMissionIds: [], sweptMissionsDate: undefined }
  }

  const missionIds = new Set(missions.map((mission) => mission.id))
  const sweptMissionIds = state.sweptMissionIds.filter((id) => missionIds.has(id))

  return {
    sweptMissionIds,
    sweptMissionsDate: sweptMissionIds.length > 0 ? today : undefined,
  }
}

function getMissionContext(state: GamificationState): Pick<GamificationState, 'dailyMissions' | 'dailyMissionsDate' | 'missionsCompletedDate' | 'sweptMissionIds' | 'sweptMissionsDate'> {
  const today = getIsoDateKey(new Date())
  const activePluginIds = useCoreStore.getState().activePlugins
  const keepPrevious = state.dailyMissionsDate === today ? state.dailyMissions : []
  const missions = buildTodayMissions(activePluginIds, keepPrevious)
  const preserveCompletedDate =
    state.dailyMissionsDate === today &&
    missions.length > 0 &&
    missions.every((mission) => mission.completed)

  return {
    dailyMissions: missions,
    dailyMissionsDate: today,
    missionsCompletedDate: preserveCompletedDate ? state.missionsCompletedDate : undefined,
    ...getSweepContext(state, missions, today),
  }
}

function getFreshMissionsOnLoad(parsed: Partial<PersistedGamificationState>): Pick<GamificationState, 'dailyMissions' | 'dailyMissionsDate' | 'missionsCompletedDate' | 'sweptMissionIds' | 'sweptMissionsDate'> {
  const today = getIsoDateKey(new Date())
  const savedDate = parsed.dailyMissionsDate ?? ''
  const storedMissions = Array.isArray(parsed.dailyMissions) ? parsed.dailyMissions : []
  const activePluginIds = useCoreStore.getState().activePlugins

  const base = savedDate === today
    ? storedMissions
    : []

  const missions = buildTodayMissions(activePluginIds, base)
  const allCompleted = missions.length > 0 && missions.every((mission) => mission.completed)

  return {
    dailyMissions: missions,
    dailyMissionsDate: today,
    missionsCompletedDate: allCompleted && savedDate === today ? parsed.missionsCompletedDate : undefined,
    ...getSweepContext(
      {
        sweptMissionIds: Array.isArray(parsed.sweptMissionIds) ? parsed.sweptMissionIds : [],
        sweptMissionsDate: parsed.sweptMissionsDate,
      },
      missions,
      today,
    ),
  }
}

function getPersistPayload(state: GamificationState): Pick<GamificationState, 'points' | 'level' | 'streak' | 'history' | 'unlockedIds' | 'dailyMissions' | 'dailyMissionsDate' | 'missionsCompletedDate' | 'sweptMissionIds' | 'sweptMissionsDate' | 'lastActionAt'> {
  return {
    points: state.points,
    level: state.level,
    streak: state.streak,
    history: state.history,
    unlockedIds: state.unlockedIds,
    dailyMissions: state.dailyMissions,
    dailyMissionsDate: state.dailyMissionsDate,
    missionsCompletedDate: state.missionsCompletedDate,
    sweptMissionIds: state.sweptMissionIds,
    sweptMissionsDate: state.sweptMissionsDate,
    lastActionAt: state.lastActionAt,
  }
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  points: 0,
  level: 1,
  streak: 0,
  history: [],
  achievements: DEFAULT_ACHIEVEMENTS,
  unlockedIds: [],
  dailyMissions: [],
  dailyMissionsDate: '',
  missionsCompletedDate: undefined,
  sweptMissionIds: [],
  sweptMissionsDate: undefined,
  lastActionAt: undefined,

  addPoints: (amount, reason) => {
    set((s) => {
      const multiplier = amount > 0 ? getXpMultiplierForStreak(s.streak) : 1
      const effectiveAmount = amount > 0 ? Math.round(amount * multiplier) : amount
      const newPoints = Math.max(0, s.points + effectiveAmount)
      const newLevel = Math.floor(newPoints / POINTS_PER_LEVEL) + 1
      const levelUp = newLevel > s.level

      if (levelUp) {
        eventBus.emit(GAMIFICATION_EVENTS.LEVEL_UP, { level: newLevel })
      }

      eventBus.emit(GAMIFICATION_EVENTS.POINTS_ADDED, {
        amount: effectiveAmount,
        baseAmount: amount,
        multiplier,
        reason,
        total: newPoints,
      })

      const nextState = {
        points: newPoints,
        level: newLevel,
        history: [
          { amount: effectiveAmount, reason, date: new Date().toISOString() },
          ...s.history.slice(0, 179),
        ],
      }

      persistState({
        points: nextState.points,
        level: nextState.level,
        streak: s.streak,
        history: nextState.history,
        unlockedIds: s.unlockedIds,
        dailyMissions: s.dailyMissions,
        dailyMissionsDate: s.dailyMissionsDate,
        missionsCompletedDate: s.missionsCompletedDate,
        sweptMissionIds: s.sweptMissionIds,
        sweptMissionsDate: s.sweptMissionsDate,
        lastActionAt: s.lastActionAt,
      })

      return nextState
    })
  },

  setStreak: (n) => {
    const prev = get().streak
    set((s) => {
      persistState({
        points: s.points,
        level: s.level,
        streak: n,
        history: s.history,
        unlockedIds: s.unlockedIds,
        dailyMissions: s.dailyMissions,
        dailyMissionsDate: s.dailyMissionsDate,
        missionsCompletedDate: s.missionsCompletedDate,
        sweptMissionIds: s.sweptMissionIds,
        sweptMissionsDate: s.sweptMissionsDate,
        lastActionAt: s.lastActionAt,
      })
      return { streak: n }
    })

    if (n > prev && n >= 5 && n % 5 === 0) {
      get().addPoints(20, `Bonus de racha x${n} dias`)
    }
  },

  unlockAchievement: (id) => {
    const s = get()
    if (s.unlockedIds.includes(id)) return
    const ach = s.achievements.find((a) => a.id === id)
    if (!ach) return

    const unlockedIds = [...s.unlockedIds, id]
    set({ unlockedIds })

    persistState({
      points: s.points,
      level: s.level,
      streak: s.streak,
      history: s.history,
      unlockedIds,
      dailyMissions: s.dailyMissions,
      dailyMissionsDate: s.dailyMissionsDate,
      missionsCompletedDate: s.missionsCompletedDate,
      sweptMissionIds: s.sweptMissionIds,
      sweptMissionsDate: s.sweptMissionsDate,
      lastActionAt: s.lastActionAt,
    })

    eventBus.emit(GAMIFICATION_EVENTS.ACHIEVEMENT_UNLOCKED, {
      id,
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
    })
  },

  checkAchievements: (stats) => {
    const s = get()
    for (const ach of s.achievements) {
      if (!s.unlockedIds.includes(ach.id) && ach.condition(stats)) {
        get().unlockAchievement(ach.id)
      }
    }
  },

  ensureDailyMissions: () => {
    const s = get()
    const context = getMissionContext(s)
    if (
      s.dailyMissionsDate === context.dailyMissionsDate &&
      !haveMissionsChanged(s.dailyMissions, context.dailyMissions) &&
      s.missionsCompletedDate === context.missionsCompletedDate
    ) {
      return
    }

    set({
      dailyMissions: context.dailyMissions,
      dailyMissionsDate: context.dailyMissionsDate,
      missionsCompletedDate: context.missionsCompletedDate,
      sweptMissionIds: context.sweptMissionIds,
      sweptMissionsDate: context.sweptMissionsDate,
    })

    const next = get()
    persistState(getPersistPayload(next))
  },

  sweepCompletedMissions: () => {
    const s = get()
    const today = getIsoDateKey(new Date())
    const completedIds = s.dailyMissions
      .filter((mission) => mission.completed)
      .map((mission) => mission.id)

    if (completedIds.length === 0) return

    const existing = s.sweptMissionsDate === today ? s.sweptMissionIds : []
    const sweptMissionIds = Array.from(new Set([...existing, ...completedIds]))

    set({
      sweptMissionIds,
      sweptMissionsDate: today,
    })

    persistState(getPersistPayload(get()))
  },

  restoreSweptMissions: () => {
    const s = get()
    if (s.sweptMissionIds.length === 0 && !s.sweptMissionsDate) return

    set({
      sweptMissionIds: [],
      sweptMissionsDate: undefined,
    })

    persistState(getPersistPayload(get()))
  },

  markDailyAction: (isoDate) => {
    const stamp = isoDate ?? new Date().toISOString()

    const previous = get()
    const nextStreak = computeNextStreak(previous.streak, previous.lastActionAt, stamp)

    set({ lastActionAt: stamp, streak: nextStreak })
    const next = get()
    persistState(getPersistPayload(next))

    if (nextStreak > previous.streak && nextStreak >= 5 && nextStreak % 5 === 0) {
      get().addPoints(20, `Bonus de racha x${nextStreak} dias`)
    }
  },

  processMissionEvent: (eventName) => {
    const now = new Date().toISOString()
    get().markDailyAction(now)
    get().ensureDailyMissions()

    const state = get()
    const updatedMissions = state.dailyMissions.map((mission) => {
      if (mission.completed) return mission
      if (!mission.triggerEvents.includes(eventName)) return mission
      return {
        ...mission,
        completed: true,
        completedAt: now,
      }
    })

    const changed = updatedMissions.some((mission, index) => mission.completed !== state.dailyMissions[index]?.completed)
    if (!changed) return

    set({ dailyMissions: updatedMissions })

    for (const mission of updatedMissions) {
      const previous = state.dailyMissions.find((item) => item.id === mission.id)
      if (!previous?.completed && mission.completed) {
        get().addPoints(mission.xp, `Mision diaria: ${mission.title}`)
      }
    }

    const today = getIsoDateKey(new Date())
    const latest = get()
    const allCompleted = latest.dailyMissions.length > 0 && latest.dailyMissions.every((mission) => mission.completed)

    if (allCompleted && latest.missionsCompletedDate !== today) {
      set({ missionsCompletedDate: today })
      get().addPoints(15, 'Todas las misiones del dia completadas')

      if (latest.streak >= 7) {
        get().addPoints(5, `Bonus de racha x${latest.streak} dias`)
      }
    }

    const finalState = get()
    persistState({
      points: finalState.points,
      level: finalState.level,
      streak: finalState.streak,
      history: finalState.history,
      unlockedIds: finalState.unlockedIds,
      dailyMissions: finalState.dailyMissions,
      dailyMissionsDate: finalState.dailyMissionsDate,
      missionsCompletedDate: finalState.missionsCompletedDate,
      sweptMissionIds: finalState.sweptMissionIds,
      sweptMissionsDate: finalState.sweptMissionsDate,
      lastActionAt: finalState.lastActionAt,
    })
  },

  loadFromStorage: async () => {
    if (!window.storage) return

    try {
      const rows = (await window.storage.query(
        `SELECT value FROM settings WHERE key = ? LIMIT 1`,
        [SETTINGS_KEY],
      )) as { value: string }[]

      const raw = rows[0]?.value
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<PersistedGamificationState>
      const points = Number(parsed.points ?? 0)
      const level = Number(parsed.level ?? Math.floor(points / POINTS_PER_LEVEL) + 1)
      const streak = Number(parsed.streak ?? 0)
      const history = Array.isArray(parsed.history) ? parsed.history.slice(0, 180) : []
      const unlockedIds = Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : []
      const missionContext = getFreshMissionsOnLoad(parsed)
      const effectiveStreak = recalcStreakFromLastAction(streak, parsed.lastActionAt)

      set({
        points,
        level,
        streak: effectiveStreak,
        history,
        unlockedIds,
        dailyMissions: missionContext.dailyMissions,
        dailyMissionsDate: missionContext.dailyMissionsDate,
        missionsCompletedDate: missionContext.missionsCompletedDate,
        sweptMissionIds: missionContext.sweptMissionIds,
        sweptMissionsDate: missionContext.sweptMissionsDate,
        lastActionAt: parsed.lastActionAt,
      })
    } catch {
      // ignore malformed persisted state
    }
  },
}))
