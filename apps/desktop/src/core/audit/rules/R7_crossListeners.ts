import type { Finding, AuditInputs } from '../types'

/**
 * R7 — Listeners cruzados rotos.
 * Plugin A (activo) escucha un evento que solo emite plugin B (inactivo
 * pero registrado). Severidad: warn.
 */
const CORE_EVENT_PREFIXES = ['CORE_', 'GAMIFICATION_', 'core:']

export function R7_crossListeners(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)

  // Mapear evento → plugins (cualquiera) que lo emiten
  const emittersByEvent = new Map<string, { pluginId: string; active: boolean }[]>()
  for (const m of input.manifests) {
    for (const ev of m.events?.emits ?? []) {
      const list = emittersByEvent.get(ev) ?? []
      list.push({ pluginId: m.id, active: active.has(m.id) })
      emittersByEvent.set(ev, list)
    }
  }

  for (const m of input.manifests) {
    if (!active.has(m.id)) continue
    for (const listened of m.events?.listens ?? []) {
      if (CORE_EVENT_PREFIXES.some((p) => listened.startsWith(p))) continue
      const emitters = emittersByEvent.get(listened) ?? []
      const activeEmitters = emitters.filter((e) => e.active)
      const inactiveEmitters = emitters.filter((e) => !e.active && e.pluginId !== m.id)
      if (activeEmitters.length === 0 && inactiveEmitters.length > 0) {
        findings.push({
          id: `R7:${m.id}:${listened}`,
          rule: 'R7',
          severity: 'warn',
          pluginId: m.id,
          location: `events.listens[${listened}]`,
          message: `Plugin "${m.id}" depende del evento "${listened}" que solo emite el plugin inactivo "${inactiveEmitters[0].pluginId}".`,
          details: { event: listened, requiredPlugin: inactiveEmitters[0].pluginId },
        })
      }
    }
  }
  return findings
}
