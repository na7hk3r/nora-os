import type { Finding, AuditInputs } from '../types'

/**
 * R2 — Misiones huérfanas.
 * Detecta misiones diarias cuyos `requiredPlugins` no están todos activos.
 * Severidad: warn.
 */
export function R2_orphanMissions(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)
  const known = new Set(input.manifests.map((m) => m.id))

  for (const mission of input.missions) {
    if (mission.requiredPlugins.length === 0) continue
    const missingPlugins = mission.requiredPlugins.filter((p) => !active.has(p))
    if (missingPlugins.length === 0) continue
    const unknownPlugins = missingPlugins.filter((p) => !known.has(p))
    findings.push({
      id: `R2:${mission.missionId}`,
      rule: 'R2',
      severity: 'warn',
      pluginId: missingPlugins[0],
      location: `mission[${mission.missionId}]`,
      message: `Misión diaria "${mission.missionId}" requiere plugins inactivos: ${missingPlugins.join(', ')}.`,
      details: {
        missionId: mission.missionId,
        missingPlugins,
        unknownPlugins,
      },
    })
  }
  return findings
}
