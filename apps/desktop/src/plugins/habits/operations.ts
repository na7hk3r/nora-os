/**
 * Operaciones del plugin Hábitos (refactor sobre Repository layer).
 *  - Persisten en SQLite via repositorios tipados.
 *  - Actualizan el store Zustand.
 *  - Emiten eventos vía eventBus (con persist=true).
 */

import { eventBus } from '@core/events/EventBus'
import { useHabitsStore } from './store'
import { HABITS_EVENTS } from './events'
import { genId, todayISO, computeStats } from './utils'
import { habitDefinitionsRepo, habitLogsRepo } from './repository'
import type { HabitDefinition, HabitKind, HabitPeriod, HabitLog } from './types'

// ─── Habits CRUD ─────────────────────────────────────────────────────

export interface CreateHabitInput {
  name: string
  kind?: HabitKind
  period?: HabitPeriod
  target?: number
  icon?: string | null
  color?: string | null
}

export async function createHabit(input: CreateHabitInput): Promise<HabitDefinition> {
  const name = input.name.trim()
  if (!name) throw new Error('habit name required')
  const draft: HabitDefinition = {
    id: genId('hbt'),
    name,
    icon: input.icon ?? null,
    color: input.color ?? null,
    kind: input.kind ?? 'positive',
    period: input.period ?? 'daily',
    target: Math.max(1, Math.floor(input.target ?? 1)),
    archived: false,
    createdAt: new Date().toISOString(),
  }
  const habit = await habitDefinitionsRepo.create(draft)
  useHabitsStore.getState().upsertHabit(habit)
  eventBus.emit(HABITS_EVENTS.HABIT_CREATED, { id: habit.id, name: habit.name }, { source: 'habits', persist: true })
  return habit
}

export async function updateHabit(
  id: string,
  patch: Partial<Pick<HabitDefinition, 'name' | 'icon' | 'color' | 'kind' | 'period' | 'target'>>,
): Promise<void> {
  const existing = useHabitsStore.getState().habits.find((h) => h.id === id)
  if (!existing) return
  const next: Partial<HabitDefinition> = {
    ...patch,
    name: patch.name ? patch.name.trim() || existing.name : undefined,
    target: patch.target != null ? Math.max(1, Math.floor(patch.target)) : undefined,
  }
  const updated = await habitDefinitionsRepo.update(id, next)
  if (updated) useHabitsStore.getState().upsertHabit(updated)
  eventBus.emit(HABITS_EVENTS.HABIT_UPDATED, { id }, { source: 'habits', persist: true })
}

export async function archiveHabit(id: string): Promise<void> {
  const existing = useHabitsStore.getState().habits.find((h) => h.id === id)
  if (!existing) return
  const updated = await habitDefinitionsRepo.update(id, { archived: true })
  useHabitsStore.getState().upsertHabit(updated ?? { ...existing, archived: true })
  eventBus.emit(HABITS_EVENTS.HABIT_ARCHIVED, { id }, { source: 'habits', persist: true })
}

export async function unarchiveHabit(id: string): Promise<void> {
  const existing = useHabitsStore.getState().habits.find((h) => h.id === id)
  if (!existing) return
  const updated = await habitDefinitionsRepo.update(id, { archived: false })
  useHabitsStore.getState().upsertHabit(updated ?? { ...existing, archived: false })
  eventBus.emit(HABITS_EVENTS.HABIT_UPDATED, { id }, { source: 'habits', persist: true })
}

export async function deleteHabit(id: string): Promise<void> {
  await habitLogsRepo.deleteWhere([{ column: 'habit_id', op: '=', value: id }])
  await habitDefinitionsRepo.delete(id)
  useHabitsStore.getState().removeHabit(id)
  eventBus.emit(HABITS_EVENTS.HABIT_ARCHIVED, { id, deleted: true }, { source: 'habits', persist: true })
}

// ─── Logs ────────────────────────────────────────────────────────────

export interface LogHabitInput {
  habitId: string
  date?: string
  count?: number
  note?: string | null
}

/**
 * Registra el cumplimiento de un hábito. Si ya hay un log para ese día,
 * acumula el count (para hábitos con target > 1).
 */
export async function logHabit(input: LogHabitInput): Promise<HabitLog> {
  const habit = useHabitsStore.getState().habits.find((h) => h.id === input.habitId)
  if (!habit) throw new Error('habit not found')

  const date = input.date ?? todayISO()
  const inc = Math.max(1, Math.floor(input.count ?? 1))
  const existing = useHabitsStore.getState().logs.find((l) => l.habitId === habit.id && l.date === date)

  let log: HabitLog
  if (existing) {
    const newCount = existing.count + inc
    const newNote = input.note ?? existing.note
    const updated = await habitLogsRepo.update(existing.id, { count: newCount, note: newNote })
    log = updated ?? { ...existing, count: newCount, note: newNote }
  } else {
    const draft: HabitLog = {
      id: genId('hlg'),
      habitId: habit.id,
      date,
      count: inc,
      note: input.note ?? null,
      createdAt: new Date().toISOString(),
    }
    log = await habitLogsRepo.create(draft)
  }

  useHabitsStore.getState().upsertLog(log)
  eventBus.emit(HABITS_EVENTS.HABIT_LOGGED, { habitId: habit.id, date, count: log.count }, { source: 'habits', persist: true })

  // Detectar goal_met para gamificación: emitido sólo cuando el conteo alcanza target en este período.
  const allLogs = useHabitsStore.getState().logs.filter((l) => l.habitId === habit.id)
  const stats = computeStats(habit, allLogs)
  if (stats.completedThisPeriod) {
    const before = stats.countThisPeriod - inc
    if (before < habit.target) {
      eventBus.emit(
        HABITS_EVENTS.HABIT_GOAL_MET,
        { habitId: habit.id, name: habit.name, streak: stats.streak },
        { source: 'habits', persist: true },
      )
    }
  }

  return log
}

/** Quita un log puntual (por id). */
export async function unlogHabit(logId: string): Promise<void> {
  const log = useHabitsStore.getState().logs.find((l) => l.id === logId)
  if (!log) return
  await habitLogsRepo.delete(logId)
  useHabitsStore.getState().removeLog(logId)
  eventBus.emit(HABITS_EVENTS.HABIT_UNLOGGED, { habitId: log.habitId, date: log.date }, { source: 'habits', persist: true })
}

/** Toggle conveniente: si hay log hoy, lo borra; si no, crea uno con count=1. */
export async function toggleTodayLog(habitId: string): Promise<void> {
  const date = todayISO()
  const existing = useHabitsStore.getState().logs.find((l) => l.habitId === habitId && l.date === date)
  if (existing) {
    await unlogHabit(existing.id)
  } else {
    await logHabit({ habitId, date, count: 1 })
  }
}
