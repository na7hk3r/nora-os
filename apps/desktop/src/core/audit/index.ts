import type { AuditInputs, AuditReport, Finding, Severity, AuditFix } from './types'
import { R1_orphanAchievements } from './rules/R1_orphanAchievements'
import { R2_orphanMissions } from './rules/R2_orphanMissions'
import { R3_eventsWithoutEmitter } from './rules/R3_eventsWithoutEmitter'
import { R4_orphanNotifications } from './rules/R4_orphanNotifications'
import { R5_phantomUI } from './rules/R5_phantomUI'
import { R6_iconographyDomain } from './rules/R6_iconographyDomain'
import { R7_crossListeners } from './rules/R7_crossListeners'
import { R8_quickActions } from './rules/R8_quickActions'
import { R9_onboarding } from './rules/R9_onboarding'
import { R10_persistence } from './rules/R10_persistence'

const RULES = [
  R1_orphanAchievements,
  R2_orphanMissions,
  R3_eventsWithoutEmitter,
  R4_orphanNotifications,
  R5_phantomUI,
  R6_iconographyDomain,
  R7_crossListeners,
  R8_quickActions,
  R9_onboarding,
  R10_persistence,
] as const

export function runAudit(input: AuditInputs): AuditReport {
  const findings: Finding[] = []
  for (const rule of RULES) {
    try {
      findings.push(...rule(input))
    } catch (err) {
      console.error('[audit] rule failed', rule.name, err)
    }
  }
  const countsBySeverity: Record<Severity, number> = { error: 0, warn: 0, info: 0 }
  for (const f of findings) countsBySeverity[f.severity]++

  return {
    generatedAt: new Date().toISOString(),
    totalPlugins: input.manifests.length,
    activePlugins: input.activePluginIds.length,
    findings,
    countsBySeverity,
  }
}

/**
 * Aplica un fix de auditoría a un manifest en memoria. Devuelve `true` si se
 * aplicó. El cambio NO se persiste (los manifests son archivos TS); el fix
 * actualiza el objeto runtime para feedback inmediato y queda pendiente de
 * commit manual del desarrollador.
 */
export function applyIconFix(manifest: { icon?: string; iconography?: { primary: string; gallery?: string[] }; pages?: { id: string; icon: string }[]; navItems?: { id: string; icon: string }[] }, fix: AuditFix): boolean {
  if (fix.kind !== 'replaceIcon') return false
  const target = fix.target
  if (target === 'iconography.primary') {
    if (manifest.iconography?.primary === fix.from) {
      manifest.iconography.primary = fix.to
      return true
    }
    if (manifest.icon === fix.from) {
      manifest.icon = fix.to
      return true
    }
    return false
  }
  // pages[idx].icon (id)
  const pageMatch = /^pages\[(\d+)\]\.icon/.exec(target)
  if (pageMatch && manifest.pages) {
    const idx = Number(pageMatch[1])
    if (manifest.pages[idx] && manifest.pages[idx].icon === fix.from) {
      manifest.pages[idx].icon = fix.to
      return true
    }
  }
  const navMatch = /^navItems\[(\d+)\]\.icon/.exec(target)
  if (navMatch && manifest.navItems) {
    const idx = Number(navMatch[1])
    if (manifest.navItems[idx] && manifest.navItems[idx].icon === fix.from) {
      manifest.navItems[idx].icon = fix.to
      return true
    }
  }
  return false
}

export type { AuditInputs, AuditReport, Finding, Severity, RuleId, AuditFix, AchievementBinding, MissionBinding, QuickActionRef } from './types'
export { DOMAIN_ICON_CATALOG, NEUTRAL_ICONS, suggestIconsForDomain, isIconValidForDomain } from './domainIconCatalog'
