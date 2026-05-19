import { aiContextService } from './aiContextService'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { storageAPI } from '@core/storage/StorageAPI'

/**
 * Daily Score Service
 * -------------------
 * Computa un "score del día" (0-100) y datos contextuales para la
 * pantalla de arranque (DailyScoreScreen). Usa exclusivamente datos ya
 * disponibles en el sistema:
 *
 *  - aiContextService.snapshot(): hábitos / planner / plugin slices.
 *  - gamificationStore.history: XP diaria de los últimos días.
 *
 * No persiste nada: la pantalla decide cuándo mostrarse mediante un flag
 * en localStorage gestionado por App.tsx.
 */

const DAILY_XP_TARGET = 30 // referencia: ~3 acciones de 10 XP

export interface AtRiskHabit {
  name: string
  streak: number
  hint?: string
}

export interface SuggestedTask {
  id: string
  title: string
}

export interface DailyScoreData {
  date: string
  /** Score combinado 0-100. */
  score: number
  /** Promedio rolling 7 días (excluyendo hoy). */
  weekAverage: number
  /** score - weekAverage. Positivo = arriba del baseline. */
  delta: number
  /** Hábitos con racha alta que aún no se cumplieron en el período actual. */
  atRiskHabits: AtRiskHabit[]
  /** Tareas pendientes para hoy (ordenadas por complejidad desc). */
  pendingTasks: SuggestedTask[]
  /** Resumen breve de fuentes consultadas, útil para debugging. */
  meta: {
    habitsCompletionPct: number | null
    plannerCompletionPct: number | null
    todayXp: number
  }
}

interface PlannerTaskRow {
  id: string
  title: string
  category?: string
  complexity?: 'baja' | 'media' | 'alta'
  date: string
  completed: boolean
}

interface HabitsSlice {
  total: number
  todayCompleted: number
  atRisk?: Array<{ name: string; streak: number }>
}

const COMPLEXITY_WEIGHT: Record<string, number> = { alta: 3, media: 2, baja: 1 }

function todayIsoDate(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}

function xpToDayScore(xp: number): number {
  return clamp(Math.round((xp / DAILY_XP_TARGET) * 100), 0, 100)
}

function getXpByDay(): Map<string, number> {
  const history = useGamificationStore.getState().history ?? []
  const map = new Map<string, number>()
  for (const entry of history) {
    const key = (entry.date ?? '').slice(0, 10)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + (entry.amount || 0))
  }
  return map
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function getPendingTasks(): Promise<SuggestedTask[]> {
  if (!window.storage) return []
  try {
    const rows = await storageAPI.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = 'corePlannerTasksV1' LIMIT 1",
    )
    if (!rows[0]?.value) return []
    const parsed = JSON.parse(rows[0].value) as PlannerTaskRow[]
    if (!Array.isArray(parsed)) return []
    const today = todayIsoDate()
    const pending = parsed.filter((t) => t.date === today && !t.completed)
    pending.sort((a, b) => {
      const wa = COMPLEXITY_WEIGHT[a.complexity ?? 'media'] ?? 2
      const wb = COMPLEXITY_WEIGHT[b.complexity ?? 'media'] ?? 2
      return wb - wa
    })
    return pending.slice(0, 3).map((t) => ({ id: t.id, title: t.title }))
  } catch {
    return []
  }
}

export const dailyScoreService = {
  todayKey: todayIsoDate,

  async compute(): Promise<DailyScoreData> {
    const today = todayIsoDate()

    // Snapshot de contexto IA — incluye planner + slices de plugins (habits).
    const snapshot = await aiContextService.snapshot().catch(() => null)

    // Hábitos: completion% del día + en riesgo (vienen del aiProvider).
    const habitsSlice = (snapshot?.pluginSlices?.habits?.data as HabitsSlice | undefined) ?? undefined
    let habitsCompletionPct: number | null = null
    let atRiskHabits: AtRiskHabit[] = []
    if (habitsSlice && habitsSlice.total > 0) {
      habitsCompletionPct = Math.round((habitsSlice.todayCompleted / habitsSlice.total) * 100)
      atRiskHabits = (habitsSlice.atRisk ?? []).slice(0, 3).map((h) => ({
        name: h.name,
        streak: h.streak,
      }))
    }

    // Planner: completion% del día.
    let plannerCompletionPct: number | null = null
    if (snapshot?.planner) {
      const total = snapshot.planner.completedToday + snapshot.planner.pendingToday
      if (total > 0) {
        plannerCompletionPct = Math.round((snapshot.planner.completedToday / total) * 100)
      }
    }

    // XP del día y de los últimos 7 días.
    const xpByDay = getXpByDay()
    const todayXp = xpByDay.get(today) ?? 0
    const xpScore = xpToDayScore(todayXp)

    // Score compuesto. Pesos: hábitos 40 / planner 30 / xp 30.
    // Si falta una pieza, redistribuyo proporcionalmente al resto.
    const components: Array<{ value: number; weight: number }> = []
    if (habitsCompletionPct != null) components.push({ value: habitsCompletionPct, weight: 0.4 })
    if (plannerCompletionPct != null) components.push({ value: plannerCompletionPct, weight: 0.3 })
    components.push({ value: xpScore, weight: 0.3 })

    const totalWeight = components.reduce((acc, c) => acc + c.weight, 0)
    const score = totalWeight > 0
      ? Math.round(components.reduce((acc, c) => acc + (c.value * c.weight), 0) / totalWeight)
      : 0

    // Promedio semanal (últimos 7 días, excluyendo hoy) usando solo XP por día.
    // Es una proxy razonable: la única señal histórica que el core garantiza.
    const pastScores: number[] = []
    for (let i = 1; i <= 7; i++) {
      const key = isoDaysAgo(i)
      const xp = xpByDay.get(key) ?? 0
      pastScores.push(xpToDayScore(xp))
    }
    const weekAverage = pastScores.length > 0
      ? Math.round(pastScores.reduce((a, b) => a + b, 0) / pastScores.length)
      : 0

    const pendingTasks = await getPendingTasks()

    return {
      date: today,
      score: clamp(score, 0, 100),
      weekAverage: clamp(weekAverage, 0, 100),
      delta: score - weekAverage,
      atRiskHabits,
      pendingTasks,
      meta: {
        habitsCompletionPct,
        plannerCompletionPct,
        todayXp,
      },
    }
  },
}
