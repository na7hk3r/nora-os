/**
 * Plugin Time Tracking — manifest.
 *
 * Cronómetro y timesheet local. Soporta entradas manuales y auto-entries
 * generadas al completar sesiones de Focus del plugin Work. Sin sync
 * externo, sin nube. Cross-plugin con Work (focus → time entry) y Goals
 * (horas por proyecto como métrica futura).
 */

import type { CoreAPI, PluginManifest } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { registerAIContextProvider } from '@core/services/aiContextRegistry'
import { WORK_EVENTS } from '@plugins/work/events'
import { TIME_EVENTS } from './events'
import { timeAIProvider } from './aiProvider'
import { TimeSummaryWidget } from './components/TimeSummaryWidget'
import { TimeDashboard } from './pages/TimeDashboard'
import { TimeProjectsPage } from './pages/TimeProjectsPage'
import { TimesheetPage } from './pages/TimesheetPage'
import { loadAll, recordFocusSession } from './operations'
import { useTimeStore } from './store'
import { startOfTodayISO, startOfWeekISO, sumDurationSec } from './utils'

interface FocusCompletedPayload {
  sessionId: string
  taskId: string | null
  taskTitle?: string
  duration?: number // ms
  durationMin?: number
}

const timePlugin: PluginManifest = {
  id: 'time',
  name: 'Tiempo',
  version: '1.0.0',
  description: 'Cronómetro y timesheet con auto-entries desde Focus.',
  icon: 'Timer',
  domain: 'time',
  domainKeywords: ['time', 'tracking', 'timesheet', 'pomodoro', 'billable'],
  iconography: {
    primary: 'Timer',
    gallery: ['Timer', 'Clock', 'Hourglass', 'AlarmClock', 'Stopwatch', 'CalendarClock'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS time_projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#60a5fa',
          client TEXT,
          hourly_rate REAL,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS time_entries (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          task_id TEXT,
          start TEXT NOT NULL,
          end TEXT,
          duration_sec INTEGER NOT NULL DEFAULT 0,
          billable INTEGER NOT NULL DEFAULT 0,
          source TEXT NOT NULL DEFAULT 'manual',
          note TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (project_id) REFERENCES time_projects(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_time_entries_start ON time_entries(start);
        CREATE INDEX IF NOT EXISTS idx_time_entries_project ON time_entries(project_id);
      `,
    },
  ],

  widgets: [
    {
      id: 'time-summary',
      pluginId: 'time',
      title: 'Tiempo',
      component: TimeSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    { id: 'time-dashboard', pluginId: 'time', path: '/time', title: 'Tiempo', icon: 'Timer', component: TimeDashboard },
    { id: 'time-projects', pluginId: 'time', path: '/time/projects', title: 'Proyectos', icon: 'FolderKanban', component: TimeProjectsPage },
    { id: 'time-timesheet', pluginId: 'time', path: '/time/timesheet', title: 'Timesheet', icon: 'CalendarClock', component: TimesheetPage },
  ],

  navItems: [
    { id: 'time-nav', pluginId: 'time', label: 'Tiempo', icon: 'Timer', path: '/time', order: 60 },
    { id: 'time-projects-nav', pluginId: 'time', label: 'Proyectos', icon: 'FolderKanban', path: '/time/projects', order: 61, parentId: 'time-nav' },
    { id: 'time-timesheet-nav', pluginId: 'time', label: 'Timesheet', icon: 'CalendarClock', path: '/time/timesheet', order: 62, parentId: 'time-nav' },
  ],

  events: {
    emits: Object.values(TIME_EVENTS),
    listens: [WORK_EVENTS.FOCUS_COMPLETED],
  },

  async init(api: CoreAPI) {
    await loadAll()

    registerAIContextProvider(timeAIProvider)

    function publishMetrics() {
      const { entries, projects } = useTimeStore.getState()
      const now = new Date()
      const todaySec = sumDurationSec(entries, startOfTodayISO(now), now)
      const weekSec = sumDurationSec(entries, startOfWeekISO(now), now)
      const billableWeekSec = sumDurationSec(
        entries.filter((e) => e.billable),
        startOfWeekISO(now),
        now,
      )

      // Ingresos facturables aproximados de la semana.
      let billableWeekRevenue = 0
      const fromMs = Date.parse(startOfWeekISO(now))
      for (const entry of entries) {
        if (!entry.billable || !entry.projectId) continue
        const project = projects.find((p) => p.id === entry.projectId)
        if (!project?.hourlyRate) continue
        const startMs = Date.parse(entry.start)
        const endMs = entry.end ? Date.parse(entry.end) : now.getTime()
        const slice = Math.max(0, (endMs - Math.max(startMs, fromMs)) / 1000)
        billableWeekRevenue += (slice / 3600) * project.hourlyRate
      }

      const running = entries.find((e) => e.end === null)

      api.metrics.publish('time.tracked_today_sec', todaySec)
      api.metrics.publish('time.tracked_week_sec', weekSec)
      api.metrics.publish('time.billable_week_sec', billableWeekSec)
      api.metrics.publish('time.billable_week_revenue', Math.round(billableWeekRevenue * 100) / 100)
      api.metrics.publish('time.active_running', running ? 1 : 0)
    }
    publishMetrics()
    api.events.on(TIME_EVENTS.ENTRY_STARTED, publishMetrics)
    api.events.on(TIME_EVENTS.ENTRY_STOPPED, publishMetrics)
    api.events.on(TIME_EVENTS.ENTRY_CREATED, publishMetrics)
    api.events.on(TIME_EVENTS.ENTRY_UPDATED, publishMetrics)
    api.events.on(TIME_EVENTS.ENTRY_DELETED, publishMetrics)
    api.events.on(TIME_EVENTS.PROJECT_UPDATED, publishMetrics)
    api.events.on(TIME_EVENTS.PROJECT_DELETED, publishMetrics)

    // Auto-entries desde sesiones de Focus de Work.
    api.events.on(WORK_EVENTS.FOCUS_COMPLETED, (raw) => {
      const payload = raw as FocusCompletedPayload
      const minutes =
        payload.durationMin ?? (payload.duration ? Math.floor(payload.duration / 60_000) : 0)
      if (!minutes || minutes <= 0) return
      void recordFocusSession({
        sessionId: payload.sessionId,
        taskId: payload.taskId ?? null,
        durationMin: minutes,
      })
    })

    // Gamificación: pequeño refuerzo al detener una entrada larga (≥5 min).
    api.events.on(TIME_EVENTS.ENTRY_STOPPED, (raw) => {
      const payload = raw as { id: string; durationSec: number }
      if (payload.durationSec >= 5 * 60) {
        api.gamification.addPoints(2, 'Time entry registrada')
      }
    })
  },
}

registerPlugin(timePlugin)

export default timePlugin
