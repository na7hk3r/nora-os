/**
 * Plugin Hábitos — manifest.
 *
 * Captura rápida de hábitos diarios/semanales con racha, heatmap y
 * provider de contexto IA. Sin objetivos de vida, sin gamificación pesada:
 * solo tildes y consistencia.
 */

import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useHabitsStore } from './store'
import { HABITS_EVENTS } from './events'
import { registerAIContextProvider } from '@core/services/aiContextRegistry'
import { habitsAIProvider } from './aiProvider'
import { HabitsSummaryWidget } from './components/HabitsSummaryWidget'
import { HabitsDashboard } from './pages/HabitsDashboard'
import { HabitsManagePage } from './pages/HabitsManagePage'
import { HabitsHistoryPage } from './pages/HabitsHistoryPage'
import { habitDefinitionsRepo, habitLogsRepo } from './repository'
import { computeStats } from './utils'

const habitsPlugin: PluginManifest = {
  id: 'habits',
  name: 'Hábitos',
  version: '1.0.0',
  description: 'Hábitos diarios y semanales con racha y heatmap.',
  icon: 'Repeat',
  domain: 'habits',
  domainKeywords: ['routine', 'streak', 'daily'],
  iconography: {
    primary: 'Repeat',
    gallery: ['Repeat', 'CalendarDays', 'CheckCircle2', 'Flame', 'Target', 'Sparkles', 'Settings'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS habits_definitions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          icon TEXT,
          color TEXT,
          kind TEXT NOT NULL DEFAULT 'positive',
          period TEXT NOT NULL DEFAULT 'daily',
          target INTEGER NOT NULL DEFAULT 1,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS habits_logs (
          id TEXT PRIMARY KEY,
          habit_id TEXT NOT NULL,
          date TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 1,
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (habit_id) REFERENCES habits_definitions(id) ON DELETE CASCADE,
          UNIQUE (habit_id, date)
        );
        CREATE INDEX IF NOT EXISTS idx_habits_logs_habit_date ON habits_logs(habit_id, date);
        CREATE INDEX IF NOT EXISTS idx_habits_logs_date ON habits_logs(date);
      `,
    },
  ],

  widgets: [
    {
      id: 'habits-summary',
      pluginId: 'habits',
      title: 'Hábitos',
      component: HabitsSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    { id: 'habits-dashboard', pluginId: 'habits', path: '/habits', title: 'Hábitos', icon: 'Repeat', component: HabitsDashboard },
    { id: 'habits-history', pluginId: 'habits', path: '/habits/history', title: 'Historial', icon: 'CalendarDays', component: HabitsHistoryPage },
    { id: 'habits-manage', pluginId: 'habits', path: '/habits/manage', title: 'Administrar', icon: 'Settings', component: HabitsManagePage },
  ],

  navItems: [
    { id: 'habits-nav', pluginId: 'habits', label: 'Hábitos', icon: 'Repeat', path: '/habits', order: 40 },
    { id: 'habits-history-nav', pluginId: 'habits', label: 'Historial', icon: 'CalendarDays', path: '/habits/history', order: 41, parentId: 'habits-nav' },
    { id: 'habits-manage-nav', pluginId: 'habits', label: 'Administrar', icon: 'Settings', path: '/habits/manage', order: 42, parentId: 'habits-nav' },
  ],

  events: {
    emits: Object.values(HABITS_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const habits = await habitDefinitionsRepo.find({ orderBy: [{ column: 'created_at', direction: 'ASC' }] })
    const logs = await habitLogsRepo.find({ orderBy: [{ column: 'date', direction: 'ASC' }] })

    const store = useHabitsStore.getState()
    store.setHabits(habits)
    store.setLogs(logs)

    registerAIContextProvider(habitsAIProvider)

    // Publica métricas cross-plugin (consumidas por Goals/OKRs).
    function publishHabitsMetrics() {
      const state = useHabitsStore.getState()
      const active = state.habits.filter((h) => !h.archived)
      if (active.length === 0) {
        api.metrics.publish('habits.top_streak', 0)
        api.metrics.publish('habits.completion_rate_30d', 0)
        return
      }
      let topStreak = 0
      let rateSum = 0
      for (const h of active) {
        const s = computeStats(h, state.logs.filter((l) => l.habitId === h.id))
        if (s.streak > topStreak) topStreak = s.streak
        rateSum += s.rate30d
      }
      api.metrics.publish('habits.top_streak', topStreak)
      api.metrics.publish('habits.completion_rate_30d', Math.round((rateSum / active.length) * 100))
    }
    publishHabitsMetrics()
    api.events.on(HABITS_EVENTS.HABIT_LOGGED, publishHabitsMetrics)
    api.events.on(HABITS_EVENTS.HABIT_UNLOGGED, publishHabitsMetrics)
    api.events.on(HABITS_EVENTS.HABIT_GOAL_MET, publishHabitsMetrics)

    api.events.on(HABITS_EVENTS.HABIT_LOGGED, () => {
      api.gamification.addPoints(2, 'Hábito registrado')
    })
    api.events.on(HABITS_EVENTS.HABIT_GOAL_MET, () => {
      api.gamification.addPoints(5, 'Meta de hábito cumplida')
    })
  },
}

registerPlugin(habitsPlugin)

export default habitsPlugin
