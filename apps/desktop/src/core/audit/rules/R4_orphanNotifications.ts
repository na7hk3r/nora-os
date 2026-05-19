import type { Finding, AuditInputs } from '../types'

/**
 * R4 — Notificaciones de plugins inactivos en cola.
 * Si la cola `core_notifications_queue` contiene entradas cuyo `source`
 * (pluginId) no está activo, no se entregan y se reportan. Severidad: error.
 */
export function R4_orphanNotifications(input: AuditInputs): Finding[] {
  if (!input.queuedNotificationSources?.length) return []
  const active = new Set(input.activePluginIds)
  const known = new Set(input.manifests.map((m) => m.id))
  const findings: Finding[] = []

  // Contar por source
  const counts = new Map<string, number>()
  for (const src of input.queuedNotificationSources) {
    counts.set(src, (counts.get(src) ?? 0) + 1)
  }

  for (const [source, count] of counts) {
    if (active.has(source)) continue
    // Ignorar fuentes core conocidas (no son plugins): instant, core, automations.
    if (source === 'core' || source === 'instant' || source === 'automations') continue
    findings.push({
      id: `R4:${source}`,
      rule: 'R4',
      severity: 'error',
      pluginId: known.has(source) ? source : undefined,
      location: 'core_notifications_queue',
      message: `${count} notificación(es) en cola pertenecen al plugin "${source}" que está inactivo. No se entregarán.`,
      details: { source, count, knownPlugin: known.has(source) },
    })
  }
  return findings
}
