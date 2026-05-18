import { storageAPI } from '@core/storage/StorageAPI'
import { useCoreStore } from '@core/state/coreStore'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import {
  PULSO_NORA_COMPANION_NAME,
  PULSO_NORA_SYSTEM_NAME,
  getNoriProgress,
  getNoriStage,
  getUnlockedRewards,
} from '@core/gamification/pulsoNora'
import { getAIContextProviders } from './aiContextRegistry'
import { loadFitnessSettings } from '@plugins/fitness/settings'

/**
 * Snapshot del estado del usuario que se entrega como contexto a Ollama.
 * Pensado para ser legible por un LLM y no exponer datos sensibles innecesarios.
 */
export interface UserContextSnapshot {
  generatedAt: string
  profile: {
    name: string
    age: number
    height: number
    weightGoal: number
  }
  gamification: {
    systemName: string
    companionName: string
    level: number
    maxLevel: number
    points: number
    streak: number
    stage: string
    progressPercent: number
    xpToNextLevel: number
    unlockedRewards: string[]
  }
  fitness?: {
    daysWithDataLast7: number
    workoutsLast7: number
    avgSleepLast7: number | null
    lastWeight: number | null
    cigarettesLast7?: number
    daysSinceLastWorkout: number | null
  }
  work?: {
    activeCards: number
    doneLast7: number
    focusSessionsLast7: number
    focusMinutesLast7: number
    overdueCards: number
  }
  planner?: {
    completedToday: number
    pendingToday: number
  }
  /**
   * Slices aportados por plugins via `registerAIContextProvider`. La key es el
   * id del proveedor (típicamente el plugin id). Permite que plugins como
   * Finance contribuyan datos sin que el core los conozca.
   */
  pluginSlices: Record<string, { data: unknown; lines: string[] }>
  recentEvents: { type: string; source: string; createdAt: string }[]
}

interface FitnessRow {
  date: string
  weight: number | null
  workout: string | null
  cigarettes: number | null
  sleep: number | null
}

interface WorkCardRow {
  id: string
  due_date: string | null
  archived: number
  column_id: string
}

interface WorkFocusRow {
  start_time: number
  end_time: number | null
  duration: number | null
}

interface SettingsRow { key: string; value: string }

function startOfTodayIso(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

async function tableExists(table: string): Promise<boolean> {
  const rows = await storageAPI.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [table],
  ) as { name: string }[]
  return rows.length > 0
}

async function getFitnessSnapshot(): Promise<UserContextSnapshot['fitness'] | undefined> {
  if (!(await tableExists('fitness_daily_entries'))) return undefined
  const settings = await loadFitnessSettings().catch(() => undefined)
  const includeSmoking = Boolean(settings?.smokingCessationEnabled)
  const since = isoDaysAgo(7)
  const rows = await storageAPI.query<FitnessRow>(
    'SELECT date, weight, workout, cigarettes, sleep FROM fitness_daily_entries WHERE date >= ? ORDER BY date DESC',
    [since],
  )
  const lastWeightRow = await storageAPI.query<{ weight: number }>(
    'SELECT weight FROM fitness_daily_entries WHERE weight IS NOT NULL ORDER BY date DESC LIMIT 1',
  )
  const lastWorkoutRow = await storageAPI.query<{ date: string }>(
    "SELECT date FROM fitness_daily_entries WHERE workout IS NOT NULL AND TRIM(workout) <> '' ORDER BY date DESC LIMIT 1",
  )
  const sleeps = rows.map((r) => r.sleep).filter((s): s is number => typeof s === 'number' && s > 0)
  const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null
  const workouts = rows.filter((r) => (r.workout ?? '').trim().length > 0).length
  const cigs = includeSmoking ? rows.reduce((acc, r) => acc + (r.cigarettes ?? 0), 0) : undefined
  let daysSince: number | null = null
  if (lastWorkoutRow[0]?.date) {
    daysSince = Math.floor((Date.now() - new Date(lastWorkoutRow[0].date).getTime()) / 86_400_000)
  }
  return {
    daysWithDataLast7: rows.length,
    workoutsLast7: workouts,
    avgSleepLast7: avgSleep != null ? Math.round(avgSleep * 10) / 10 : null,
    lastWeight: lastWeightRow[0]?.weight ?? null,
    ...(includeSmoking ? { cigarettesLast7: cigs ?? 0 } : {}),
    daysSinceLastWorkout: daysSince,
  }
}

async function getWorkSnapshot(): Promise<UserContextSnapshot['work'] | undefined> {
  if (!(await tableExists('work_cards'))) return undefined
  const cards = await storageAPI.query<WorkCardRow>(
    'SELECT id, due_date, archived, column_id FROM work_cards',
  )
  const doneCols = await storageAPI.query<{ id: string }>(
    "SELECT id FROM work_columns WHERE LOWER(name) LIKE '%hecho%' OR LOWER(name) LIKE '%done%' OR LOWER(name) LIKE '%completad%'",
  )
  const doneIds = new Set(doneCols.map((c) => c.id))
  const active = cards.filter((c) => !c.archived && !doneIds.has(c.column_id)).length
  const now = Date.now()
  const overdue = cards.filter((c) => {
    if (!c.due_date || c.archived || doneIds.has(c.column_id)) return false
    const t = Date.parse(c.due_date)
    return Number.isFinite(t) && t < now
  }).length
  const sevenAgo = now - 7 * 86_400_000
  const focus = await storageAPI.query<WorkFocusRow>(
    'SELECT start_time, end_time, duration FROM work_focus_sessions WHERE start_time >= ?',
    [sevenAgo],
  )
  const focusMinutes = focus.reduce((acc, s) => acc + Math.round((s.duration ?? 0) / 60_000), 0)
  // events_log para tareas cerradas
  const doneEvents = await storageAPI.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM events_log
     WHERE created_at >= datetime('now', '-7 days')
       AND event_type IN ('WORK_TASK_COMPLETED', 'TASK_COMPLETED')`,
  )
  return {
    activeCards: active,
    doneLast7: doneEvents[0]?.count ?? 0,
    focusSessionsLast7: focus.length,
    focusMinutesLast7: focusMinutes,
    overdueCards: overdue,
  }
}

async function getPlannerSnapshot(): Promise<UserContextSnapshot['planner'] | undefined> {
  const rows = await storageAPI.query<SettingsRow>(
    "SELECT key, value FROM settings WHERE key = 'corePlannerTasksV1'",
  )
  if (!rows[0]) return undefined
  try {
    const parsed = JSON.parse(rows[0].value) as { date: string; completed: boolean }[]
    const today = new Date().toISOString().slice(0, 10)
    const todayTasks = parsed.filter((t) => t.date === today)
    return {
      completedToday: todayTasks.filter((t) => t.completed).length,
      pendingToday: todayTasks.filter((t) => !t.completed).length,
    }
  } catch {
    return undefined
  }
}

async function getRecentEvents(): Promise<UserContextSnapshot['recentEvents']> {
  const events = await storageAPI.getRecentEvents(20)
  return events.map((e) => ({ type: e.event_type, source: e.source, createdAt: e.created_at }))
}

export const aiContextService = {
  async snapshot(): Promise<UserContextSnapshot> {
    const profile = useCoreStore.getState().profile
    const gam = useGamificationStore.getState()
    const noriProgress = getNoriProgress(gam.points, gam.level)
    const noriStage = getNoriStage(gam.level)
    const unlockedRewards = getUnlockedRewards(gam.level)
    const providers = getAIContextProviders()
    const [fitness, work, planner, recent, ...providerResults] = await Promise.all([
      getFitnessSnapshot().catch(() => undefined),
      getWorkSnapshot().catch(() => undefined),
      getPlannerSnapshot().catch(() => undefined),
      getRecentEvents().catch(() => []),
      ...providers.map(async (p) => {
        try {
          const data = await p.collect()
          if (data === undefined || data === null) return null
          return { id: p.id, data, lines: p.render(data) }
        } catch (err) {
          console.warn(`[aiContextService] provider "${p.id}" falló:`, err)
          return null
        }
      }),
    ])
    const pluginSlices: UserContextSnapshot['pluginSlices'] = {}
    for (const r of providerResults) {
      if (r) pluginSlices[r.id] = { data: r.data, lines: r.lines }
    }
    return {
      generatedAt: new Date().toISOString(),
      profile: {
        name: profile.name,
        age: profile.age,
        height: profile.height,
        weightGoal: profile.weightGoal,
      },
      gamification: {
        systemName: PULSO_NORA_SYSTEM_NAME,
        companionName: PULSO_NORA_COMPANION_NAME,
        level: gam.level,
        maxLevel: noriProgress.maxLevel,
        points: gam.points,
        streak: gam.streak,
        stage: noriStage.title,
        progressPercent: noriProgress.percent,
        xpToNextLevel: noriProgress.xpToNextLevel,
        unlockedRewards: unlockedRewards.map((reward) => reward.title),
      },
      fitness,
      work,
      planner,
      pluginSlices,
      recentEvents: recent,
    }
  },

  /**
   * Render a compact text snapshot designed to be embedded in an LLM prompt.
   * Avoids markdown noise and trims to keep token usage low.
   */
  asPromptContext(snapshot: UserContextSnapshot): string {
    const lines: string[] = []
    lines.push(`Fecha: ${snapshot.generatedAt.slice(0, 10)}`)
    if (snapshot.profile.name) lines.push(`Usuario: ${snapshot.profile.name}`)
    lines.push(`${snapshot.gamification.systemName}: ${snapshot.gamification.companionName} nivel ${snapshot.gamification.level}/${snapshot.gamification.maxLevel}, etapa ${snapshot.gamification.stage}, ${snapshot.gamification.points} XP, racha ${snapshot.gamification.streak}d, progreso ${snapshot.gamification.progressPercent}%, faltan ${snapshot.gamification.xpToNextLevel} XP`)
    if (snapshot.gamification.unlockedRewards.length) {
      lines.push(`Desbloqueos activos: ${snapshot.gamification.unlockedRewards.join(', ')}`)
    }
    if (snapshot.fitness) {
      const f = snapshot.fitness
      lines.push(
        `Fitness (7d): registros=${f.daysWithDataLast7} entrenos=${f.workoutsLast7} ` +
        `sueño_prom=${f.avgSleepLast7 ?? 'n/d'} ` +
        `${f.cigarettesLast7 == null ? '' : `cigarrillos=${f.cigarettesLast7} `}` +
        `peso_actual=${f.lastWeight ?? 'n/d'}kg objetivo=${snapshot.profile.weightGoal || 'n/d'}kg ` +
        `días_sin_entrenar=${f.daysSinceLastWorkout ?? 'n/d'}`,
      )
    }
    if (snapshot.work) {
      const w = snapshot.work
      lines.push(
        `Work (7d): activas=${w.activeCards} cerradas=${w.doneLast7} foco_min=${w.focusMinutesLast7} ` +
        `sesiones_foco=${w.focusSessionsLast7} vencidas=${w.overdueCards}`,
      )
    }
    if (snapshot.planner) {
      lines.push(`Planner hoy: completadas=${snapshot.planner.completedToday} pendientes=${snapshot.planner.pendingToday}`)
    }
    for (const [id, slice] of Object.entries(snapshot.pluginSlices)) {
      if (!slice.lines.length) continue
      lines.push(`Plugin ${id}:`)
      for (const ln of slice.lines) lines.push(`  ${ln}`)
    }
    if (snapshot.recentEvents.length) {
      lines.push('Últimos eventos:')
      for (const e of snapshot.recentEvents.slice(0, 8)) {
        lines.push(`  - ${e.createdAt.slice(0, 16)} [${e.source}] ${e.type}`)
      }
    }
    return lines.join('\n')
  },
}
