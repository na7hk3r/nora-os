import type { Finding, AuditInputs } from '../types'

/**
 * R1 — Logros huérfanos.
 * Detecta achievements vinculados a un plugin que no existe en el registro o
 * no está activo. Severidad: warn.
 */
export function R1_orphanAchievements(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const known = new Set(input.manifests.map((m) => m.id))
  const active = new Set(input.activePluginIds)

  for (const ach of input.achievements) {
    const exists = known.has(ach.pluginId)
    const isActive = active.has(ach.pluginId)
    if (!exists) {
      findings.push({
        id: `R1:${ach.achievementId}:missing`,
        rule: 'R1',
        severity: 'warn',
        pluginId: ach.pluginId,
        location: `achievement[${ach.achievementId}]`,
        message: `Logro "${ach.achievementId}" depende del plugin "${ach.pluginId}" que no está registrado.`,
        details: { achievementId: ach.achievementId, reason: ach.reason },
      })
    } else if (!isActive) {
      findings.push({
        id: `R1:${ach.achievementId}:inactive`,
        rule: 'R1',
        severity: 'warn',
        pluginId: ach.pluginId,
        location: `achievement[${ach.achievementId}]`,
        message: `Logro "${ach.achievementId}" no podrá desbloquearse porque el plugin "${ach.pluginId}" está inactivo.`,
        details: { achievementId: ach.achievementId, reason: ach.reason },
      })
    }
  }
  return findings
}
