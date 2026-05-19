import type { Finding, AuditInputs } from '../types'

/**
 * R9 — Onboarding pendiente para plugins desactivados.
 * Si un plugin inactivo declara `onboarding`, sugerir limpiar su estado
 * (no se le presentará al usuario). Severidad: info.
 */
export function R9_onboarding(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)

  for (const m of input.manifests) {
    if (active.has(m.id)) continue
    if (!m.onboarding) continue
    findings.push({
      id: `R9:${m.id}`,
      rule: 'R9',
      severity: 'info',
      pluginId: m.id,
      location: 'manifest.onboarding',
      message: `Plugin inactivo "${m.id}" declara onboarding (${m.onboarding.questions.length} preguntas). Considere limpiar el estado de onboarding pendiente.`,
      details: { questions: m.onboarding.questions.length },
    })
  }
  return findings
}
