/**
 * Consistency Auditor — types
 *
 * El auditor recorre los manifests de plugins activos/inactivos y genera
 * `Finding`s describiendo inconsistencias entre el core y los plugins
 * (logros/misiones huérfanos, eventos sin emisor, notificaciones de plugins
 * inactivos, UI fantasma, iconografía incoherente, etc.).
 */

import type { PluginManifest } from '@core/types'

export type Severity = 'error' | 'warn' | 'info'

export type RuleId =
  | 'R1' // Logros huérfanos
  | 'R2' // Misiones huérfanas
  | 'R3' // Eventos sin emisor
  | 'R4' // Notificaciones de plugins inactivos
  | 'R5' // UI fantasma
  | 'R6' // Iconografía incoherente con el dominio
  | 'R7' // Listeners cruzados rotos
  | 'R8' // Quick actions inconsistentes
  | 'R9' // Onboarding pendiente de plugins desactivados
  | 'R10' // Persistencia de plugins desinstalados

export interface Finding {
  /** Identificador estable (ej: `R6:plugin-id:pages[2].icon`). */
  id: string
  rule: RuleId
  severity: Severity
  pluginId?: string
  /** Ubicación dentro del manifest u origen externo (ej: `pages[2].icon`). */
  location?: string
  /** Mensaje en español. */
  message: string
  /** Datos extra usados por la UI (ícono actual, sugerencias, etc.). */
  details?: Record<string, unknown>
  /**
   * Si está definido, la UI puede ofrecer un botón "Aplicar sugerencia" para
   * el cambio descrito. El descriptor es interpretado por `applyAuditFix`.
   */
  fix?: AuditFix
}

export type AuditFix =
  | {
      kind: 'replaceIcon'
      pluginId: string
      /** Ej: `manifest.icon`, `pages[2].icon`, `navItems[0].icon`. */
      target: string
      from: string
      to: string
    }

export interface AuditReport {
  generatedAt: string
  totalPlugins: number
  activePlugins: number
  findings: Finding[]
  countsBySeverity: Record<Severity, number>
}

/** Información sobre un logro/misión vinculado a un plugin. */
export interface AchievementBinding {
  achievementId: string
  pluginId: string
  reason: string
}

export interface MissionBinding {
  missionId: string
  requiredPlugins: string[]
}

export interface QuickActionRef {
  label: string
  path: string
  requiredPlugin?: string
}

/** Snapshot de datos del core consumidos por las reglas. */
export interface AuditInputs {
  manifests: PluginManifest[]
  activePluginIds: string[]
  achievements: AchievementBinding[]
  missions: MissionBinding[]
  quickActions: QuickActionRef[]
  /** Lista de pluginIds cuyos eventos están encolados en core_notifications_queue. */
  queuedNotificationSources?: string[]
}
