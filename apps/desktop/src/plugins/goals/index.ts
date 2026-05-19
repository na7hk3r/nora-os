/**
 * Plugin Goals / OKRs — manifest.
 *
 * Capa meta que vincula KPIs publicados por otros plugins (vía
 * `CoreAPI.metrics.publish`) en objetivos trimestrales/anuales con
 * Key Results y milestones. Sin esta capa, la gamificación es XP vacío;
 * con Goals, cada hábito y tarea tiene "para qué".
 */

import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { registerAIContextProvider } from '@core/services/aiContextRegistry'
import { subscribeMetrics } from '@core/services/metricsRegistry'
import { useGoalsStore } from './store'
import { GOALS_EVENTS } from './events'
import { GOALS_MIGRATIONS } from './migrations'
import { goalsRepo, keyResultsRepo, milestonesRepo } from './repository'
import { goalsAIProvider } from './aiContextProvider'
import { syncMetricBackedKRs } from './operations'
import { GoalsSummaryWidget } from './components/GoalsSummaryWidget'
import { GoalsDashboard } from './pages/GoalsDashboard'

const goalsPlugin: PluginManifest = {
  id: 'goals',
  name: 'Goals & OKRs',
  version: '1.0.0',
  description: 'Objetivos trimestrales/anuales con Key Results y avance auto desde otros plugins.',
  icon: 'Target',
  domain: 'productivity',
  domainKeywords: ['okr', 'goals', 'objectives', 'milestones'],
  iconography: {
    primary: 'Target',
    gallery: ['Target', 'Flag', 'Layers', 'CheckCircle2', 'TimerReset', 'Workflow'],
  },

  migrations: GOALS_MIGRATIONS,

  widgets: [
    {
      id: 'goals-summary',
      pluginId: 'goals',
      title: 'Objetivos',
      component: GoalsSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ],

  pages: [
    { id: 'goals-dashboard', pluginId: 'goals', path: '/goals', title: 'Objetivos', icon: 'Target', component: GoalsDashboard },
  ],

  navItems: [
    { id: 'goals-nav', pluginId: 'goals', label: 'Objetivos', icon: 'Target', path: '/goals', order: 50 },
  ],

  events: {
    emits: Object.values(GOALS_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    // Cargar persistencia
    const goals = await goalsRepo.find({ orderBy: [{ column: 'created_at', direction: 'ASC' }] })
    const keyResults = await keyResultsRepo.find({ orderBy: [{ column: 'created_at', direction: 'ASC' }] })
    const milestones = await milestonesRepo.find({ orderBy: [{ column: 'achieved_at', direction: 'ASC' }] })

    const store = useGoalsStore.getState()
    store.setGoals(goals)
    store.setKeyResults(keyResults)
    store.setMilestones(milestones)

    // Sincronizar KRs backed by metrics con valores ya publicados al boot.
    void syncMetricBackedKRs()

    // Y reaccionar a futuras publicaciones.
    subscribeMetrics((entry) => {
      void syncMetricBackedKRs(entry.id)
    })

    // Registrar proveedor IA para que el copiloto pueda razonar sobre OKRs.
    registerAIContextProvider(goalsAIProvider)

    // Gamificación: bonus al cumplir KR / objetivo.
    api.events.on(GOALS_EVENTS.KR_COMPLETED, () => {
      api.gamification.addPoints(20, 'Key Result cumplido')
    })
    api.events.on(GOALS_EVENTS.GOAL_COMPLETED, () => {
      api.gamification.addPoints(100, 'Objetivo cumplido')
    })
  },
}

registerPlugin(goalsPlugin)

export default goalsPlugin
