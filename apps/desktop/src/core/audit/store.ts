import { create } from 'zustand'
import { runAudit, applyIconFix, type AuditFix, type AuditReport, type AuditInputs, type AchievementBinding, type MissionBinding, type QuickActionRef } from './index'
import { pluginManager } from '@core/plugins/PluginManager'
import { useCoreStore } from '@core/state/coreStore'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { storageAPI } from '@core/storage/StorageAPI'

/**
 * Mapping declarativo de logros core → plugin que requieren para alcanzarse.
 * Solo se listan los logros con dependencia clara (achievements puramente
 * core como `centurion` o `points-500` no tienen pluginId).
 */
const CORE_ACHIEVEMENT_PLUGIN_MAP: Record<string, string> = {
  'workout-10': 'fitness',
  'tasks-25': 'work',
  'focus-master': 'work',
  // 'note-taker' depende de notes core, sin pluginId.
}

/** Quick actions hard-coded del core (espejo de QuickActionsBar.tsx). */
export const CORE_QUICK_ACTIONS: QuickActionRef[] = [
  { label: 'Iniciar foco', path: '/work', requiredPlugin: 'work' },
  { label: 'Registrar peso', path: '/fitness/tracking', requiredPlugin: 'fitness' },
  { label: 'Nueva tarea', path: '/work', requiredPlugin: 'work' },
  { label: 'Nota rápida', path: '/notes' },
  { label: 'Registrar comida', path: '/fitness/tracking', requiredPlugin: 'fitness' },
]

interface AuditState {
  report: AuditReport | null
  lastRunAt: string | null
  isRunning: boolean
  runAudit: () => Promise<AuditReport>
  applyFix: (fix: AuditFix) => Promise<boolean>
  /** Quita un finding del listado actual (una vez aplicado el fix). */
  dismissFinding: (id: string) => void
}

async function collectQueuedNotificationSources(): Promise<string[]> {
  if (!window.storage) return []
  try {
    const rows = await storageAPI.query<{ source: string | null }>(
      `SELECT source FROM core_notifications_queue
       WHERE delivered_at IS NULL AND dismissed_at IS NULL`,
    )
    return rows.map((r) => r.source ?? 'unknown')
  } catch {
    return []
  }
}

function buildAchievements(): AchievementBinding[] {
  const state = useGamificationStore.getState()
  const out: AchievementBinding[] = []
  for (const a of state.achievements ?? []) {
    const pluginId = CORE_ACHIEVEMENT_PLUGIN_MAP[a.id]
    if (!pluginId) continue
    out.push({ achievementId: a.id, pluginId, reason: a.title })
  }
  return out
}

function buildMissions(): MissionBinding[] {
  const state = useGamificationStore.getState()
  // Las plantillas no son públicas; usamos las missions del día como proxy.
  // Las plantillas internas declaran requiredPlugins en el código pero no se
  // exportan; por consistencia inferimos requiredPlugins de los triggerEvents
  // (events del prefijo FITNESS_ → fitness, WORK_ → work, etc.).
  const out: MissionBinding[] = []
  for (const m of state.dailyMissions ?? []) {
    const required = inferRequiredPluginsFromEvents(m.triggerEvents)
    out.push({ missionId: m.id, requiredPlugins: required })
  }
  return out
}

function inferRequiredPluginsFromEvents(events: string[]): string[] {
  const set = new Set<string>()
  for (const ev of events) {
    if (ev.startsWith('FITNESS_')) set.add('fitness')
    else if (ev.startsWith('WORK_')) set.add('work')
    else if (ev.startsWith('FINANCE_')) set.add('finance')
    else if (ev.startsWith('HABITS_')) set.add('habits')
    else if (ev.startsWith('JOURNAL_')) set.add('journal')
  }
  return [...set]
}

async function buildInputs(): Promise<AuditInputs> {
  const manifests = pluginManager.getAllPlugins().map((e) => e.manifest)
  const activePluginIds = useCoreStore.getState().activePlugins
  const queuedNotificationSources = await collectQueuedNotificationSources()
  return {
    manifests,
    activePluginIds,
    achievements: buildAchievements(),
    missions: buildMissions(),
    quickActions: CORE_QUICK_ACTIONS,
    queuedNotificationSources,
  }
}

export const useAuditStore = create<AuditState>((set, get) => ({
  report: null,
  lastRunAt: null,
  isRunning: false,

  async runAudit() {
    if (get().isRunning) return get().report ?? emptyReport()
    set({ isRunning: true })
    try {
      const inputs = await buildInputs()
      const report = runAudit(inputs)
      set({ report, lastRunAt: report.generatedAt })
      return report
    } finally {
      set({ isRunning: false })
    }
  },

  async applyFix(fix) {
    const entry = pluginManager.getPlugin(fix.pluginId)
    if (!entry) return false
    const ok = applyIconFix(entry.manifest as Parameters<typeof applyIconFix>[0], fix)
    if (ok) {
      // Re-correr el auditor para refrescar findings.
      await get().runAudit()
    }
    return ok
  },

  dismissFinding(id) {
    const r = get().report
    if (!r) return
    const findings = r.findings.filter((f) => f.id !== id)
    const counts = { error: 0, warn: 0, info: 0 } as AuditReport['countsBySeverity']
    for (const f of findings) counts[f.severity]++
    set({ report: { ...r, findings, countsBySeverity: counts } })
  },
}))

function emptyReport(): AuditReport {
  return {
    generatedAt: new Date().toISOString(),
    totalPlugins: 0,
    activePlugins: 0,
    findings: [],
    countsBySeverity: { error: 0, warn: 0, info: 0 },
  }
}
