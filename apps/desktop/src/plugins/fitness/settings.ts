import { useEffect, useState } from 'react'

export interface FitnessPluginSettings {
  workoutTargetPerWeek: number
  sleepTargetHours: number
  maxCigarettesPerDay: number
  mealComplianceTarget: number
  remindMeasurements: boolean
  smokingCessationEnabled: boolean
}

export const FITNESS_SETTINGS_KEY = 'pluginSettings:fitness'

export const DEFAULT_FITNESS_SETTINGS: FitnessPluginSettings = {
  workoutTargetPerWeek: 4,
  sleepTargetHours: 8,
  maxCigarettesPerDay: 6,
  mealComplianceTarget: 80,
  remindMeasurements: true,
  smokingCessationEnabled: false,
}

export function normalizeFitnessSettings(input: Partial<FitnessPluginSettings> | null | undefined): FitnessPluginSettings {
  return {
    ...DEFAULT_FITNESS_SETTINGS,
    ...(input ?? {}),
    workoutTargetPerWeek: clampNumber(input?.workoutTargetPerWeek, 1, 14, DEFAULT_FITNESS_SETTINGS.workoutTargetPerWeek),
    sleepTargetHours: clampNumber(input?.sleepTargetHours, 4, 12, DEFAULT_FITNESS_SETTINGS.sleepTargetHours),
    maxCigarettesPerDay: clampNumber(input?.maxCigarettesPerDay, 0, 60, DEFAULT_FITNESS_SETTINGS.maxCigarettesPerDay),
    mealComplianceTarget: clampNumber(input?.mealComplianceTarget, 0, 100, DEFAULT_FITNESS_SETTINGS.mealComplianceTarget),
    remindMeasurements: input?.remindMeasurements ?? DEFAULT_FITNESS_SETTINGS.remindMeasurements,
    smokingCessationEnabled: input?.smokingCessationEnabled ?? DEFAULT_FITNESS_SETTINGS.smokingCessationEnabled,
  }
}

export async function loadFitnessSettings(): Promise<FitnessPluginSettings> {
  if (!window.storage) return DEFAULT_FITNESS_SETTINGS

  const rows = await window.storage.query(
    `SELECT key, value FROM settings WHERE key = ? LIMIT 1`,
    [FITNESS_SETTINGS_KEY],
  ) as { key: string; value: string }[]

  const rawSettings = rows[0]?.value
  if (rawSettings) {
    try {
      const parsed = JSON.parse(rawSettings) as Partial<FitnessPluginSettings>
      if (parsed.smokingCessationEnabled === undefined) {
        parsed.smokingCessationEnabled = await loadLegacySmokingTracker()
      }
      return normalizeFitnessSettings(parsed)
    } catch {
      return DEFAULT_FITNESS_SETTINGS
    }
  }

  return normalizeFitnessSettings({
    smokingCessationEnabled: await loadLegacySmokingTracker(),
  })
}

export async function saveFitnessSettings(settings: FitnessPluginSettings): Promise<void> {
  if (!window.storage) return
  await window.storage.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [FITNESS_SETTINGS_KEY, JSON.stringify(normalizeFitnessSettings(settings))],
  )
}

export function useFitnessSettings() {
  const [settings, setSettings] = useState<FitnessPluginSettings>(DEFAULT_FITNESS_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void loadFitnessSettings()
      .then((value) => {
        if (!cancelled) setSettings(value)
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loaded }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

async function loadLegacySmokingTracker(): Promise<boolean> {
  if (!window.storage) return false
  const legacyRows = await window.storage.query(
    `SELECT value FROM plugin_state WHERE plugin_id = 'fitness' AND key = 'smokingTracker' LIMIT 1`,
    [],
  ) as { value: string }[]
  return legacyRows[0]?.value === 'true'
}
