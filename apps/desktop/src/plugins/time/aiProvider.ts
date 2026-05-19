import type { AIContextProvider } from '@core/services/aiContextRegistry'
import { useTimeStore } from './store'
import { entryDurationSec, formatDuration, startOfTodayISO, startOfWeekISO, sumDurationSec } from './utils'

interface TimeAIContext {
  todayHours: number
  weekHours: number
  billableWeekHours: number
  weekRevenue: number
  runningProject: string | null
  runningSec: number
}

export const timeAIProvider: AIContextProvider<TimeAIContext> = {
  id: 'time',
  collect: async () => {
    const { entries, projects } = useTimeStore.getState()
    const now = new Date()
    const todaySec = sumDurationSec(entries, startOfTodayISO(now), now)
    const weekSec = sumDurationSec(entries, startOfWeekISO(now), now)
    const billableEntries = entries.filter((e) => e.billable)
    const billableWeekSec = sumDurationSec(billableEntries, startOfWeekISO(now), now)

    let weekRevenue = 0
    const fromMs = Date.parse(startOfWeekISO(now))
    for (const entry of entries) {
      if (!entry.billable || !entry.projectId) continue
      const project = projects.find((p) => p.id === entry.projectId)
      if (!project?.hourlyRate) continue
      const startMs = Date.parse(entry.start)
      const endMs = entry.end ? Date.parse(entry.end) : now.getTime()
      const slice = Math.max(0, (endMs - Math.max(startMs, fromMs)) / 1000)
      weekRevenue += (slice / 3600) * project.hourlyRate
    }

    const running = entries.find((e) => e.end === null)
    const runningProject = running ? projects.find((p) => p.id === running.projectId)?.name ?? null : null

    return {
      todayHours: +(todaySec / 3600).toFixed(2),
      weekHours: +(weekSec / 3600).toFixed(2),
      billableWeekHours: +(billableWeekSec / 3600).toFixed(2),
      weekRevenue: Math.round(weekRevenue * 100) / 100,
      runningProject,
      runningSec: running ? entryDurationSec(running, now) : 0,
    }
  },
  render: (data) => {
    const lines: string[] = []
    if (data.runningProject || data.runningSec > 0) {
      lines.push(`Trackeando ahora: ${data.runningProject ?? 'sin proyecto'} (${formatDuration(data.runningSec)})`)
    }
    lines.push(`Horas hoy: ${data.todayHours.toFixed(1)}h`)
    lines.push(`Horas esta semana: ${data.weekHours.toFixed(1)}h`)
    if (data.billableWeekHours > 0) {
      lines.push(`Facturable esta semana: ${data.billableWeekHours.toFixed(1)}h`)
    }
    if (data.weekRevenue > 0) {
      lines.push(`Ingresos proyectados (semana): ${data.weekRevenue.toFixed(0)}`)
    }
    return lines
  },
}
