import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useFitnessStore } from './store'
import { FITNESS_EVENTS } from './events'
import { KpiCards } from './components/KpiCards'
import { FitnessDashboard } from './pages/FitnessDashboard'
import { TrackingPage } from './pages/TrackingPage'
import { MeasurementsPage } from './pages/MeasurementsPage'
import type { DailyEntry, Measurement } from './types'

const fitnessPlugin: PluginManifest = {
  id: 'fitness',
  name: 'Fitness',
  version: '1.0.0',
  description: 'Control de peso, comidas, entrenos, sueño y medidas corporales',
  icon: 'Dumbbell',
  domain: 'fitness',
  domainKeywords: ['workout', 'weight', 'measurements', 'sleep'],
  iconography: {
    primary: 'Dumbbell',
    gallery: ['Dumbbell', 'SquarePen', 'Ruler', 'Scale', 'Activity', 'Flame', 'CalendarDays', 'Trophy'],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS fitness_daily_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          day_name TEXT,
          weight REAL,
          breakfast INTEGER DEFAULT 0,
          lunch INTEGER DEFAULT 0,
          snack INTEGER DEFAULT 0,
          dinner INTEGER DEFAULT 0,
          workout TEXT,
          cigarettes INTEGER DEFAULT 0,
          sleep REAL,
          notes TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS fitness_measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          weight REAL,
          arm_relaxed REAL,
          arm_flexed REAL,
          chest REAL,
          waist REAL,
          leg REAL,
          created_at TEXT DEFAULT (datetime('now'))
        );
      `,
    },
  ],

  widgets: [
    {
      id: 'fitness-kpi',
      pluginId: 'fitness',
      title: 'KPIs Fitness',
      component: KpiCards,
      defaultSize: { w: 3, h: 1 },
    },
  ],

  pages: [
    {
      id: 'fitness-dashboard',
      pluginId: 'fitness',
      path: '/fitness',
      title: 'Fitness',
      icon: 'Dumbbell',
      component: FitnessDashboard,
    },
    {
      id: 'fitness-tracking',
      pluginId: 'fitness',
      path: '/fitness/tracking',
      title: 'Registro',
      icon: 'SquarePen',
      component: TrackingPage,
    },
    {
      id: 'fitness-measurements',
      pluginId: 'fitness',
      path: '/fitness/measurements',
      title: 'Medidas',
      icon: 'Ruler',
      component: MeasurementsPage,
    },
  ],

  navItems: [
    { id: 'fitness-nav', pluginId: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/fitness', order: 10 },
    { id: 'fitness-tracking-nav', pluginId: 'fitness', label: 'Registrar', icon: 'SquarePen', path: '/fitness/tracking', order: 11, parentId: 'fitness-nav' },
    { id: 'fitness-measures-nav', pluginId: 'fitness', label: 'Medidas', icon: 'Ruler', path: '/fitness/measurements', order: 12, parentId: 'fitness-nav' },
  ],

  events: {
    emits: Object.values(FITNESS_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    // Load data from SQLite into Zustand store
    const rawEntries = await api.storage.query(
      'SELECT * FROM fitness_daily_entries ORDER BY date ASC',
    )

    const rawMeasurements = await api.storage.query(
      'SELECT * FROM fitness_measurements ORDER BY date ASC',
    )

    // Map snake_case → camelCase with proper typing
    const mappedEntries: DailyEntry[] = Array.isArray(rawEntries)
      ? rawEntries.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as number | undefined,
          date: row.date as string,
          dayName: row.day_name as string,
          weight: row.weight as number | null,
          breakfast: row.breakfast as 0 | 1,
          lunch: row.lunch as 0 | 1,
          snack: row.snack as 0 | 1,
          dinner: row.dinner as 0 | 1,
          workout: row.workout as DailyEntry['workout'],
          cigarettes: (row.cigarettes ?? 0) as number,
          sleep: typeof row.sleep === 'number' && row.sleep > 0 ? row.sleep : null,
          notes: (row.notes ?? '') as string,
        }
      })
      : []

    const mappedMeasurements: Measurement[] = Array.isArray(rawMeasurements)
      ? rawMeasurements.map((raw) => {
        const row = raw as Record<string, unknown>
        return {
          id: row.id as number | undefined,
          date: row.date as string,
          weight: row.weight as number | null,
          armRelaxed: row.arm_relaxed as number | null,
          armFlexed: row.arm_flexed as number | null,
          chest: row.chest as number | null,
          waist: row.waist as number | null,
          leg: row.leg as number | null,
        }
      })
      : []

    useFitnessStore.getState().setEntries(mappedEntries)
    useFitnessStore.getState().setMeasurements(mappedMeasurements)

    // Listen to own events for gamification
    api.events.on(FITNESS_EVENTS.DAILY_ENTRY_SAVED, () => {
      api.gamification.addPoints(5, 'Registro diario completado')
    })

    api.events.on(FITNESS_EVENTS.WORKOUT_COMPLETED, () => {
      api.gamification.addPoints(25, 'Entrenamiento completado')
    })

    api.events.on(FITNESS_EVENTS.MEASUREMENT_SAVED, () => {
      api.gamification.addPoints(5, 'Medicion corporal registrada')
    })
  },
}

registerPlugin(fitnessPlugin)

export default fitnessPlugin
