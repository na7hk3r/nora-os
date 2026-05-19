import type { Finding, AuditInputs } from '../types'

/**
 * R3 — Eventos sin emisor.
 * Para cada plugin activo, todos los eventos en `events.listens` deben ser
 * emitidos por algún plugin activo (o ser un CORE_EVENT). Severidad: info.
 *
 * Los eventos del namespace `CORE_*` o `GAMIFICATION_*` se asumen emitidos
 * por el core y se ignoran.
 */
const CORE_EVENT_PREFIXES = ['CORE_', 'GAMIFICATION_', 'core:']

export function R3_eventsWithoutEmitter(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)

  // Mapear evento → plugins activos que lo emiten
  const emittersByEvent = new Map<string, string[]>()
  for (const m of input.manifests) {
    if (!active.has(m.id)) continue
    for (const ev of m.events?.emits ?? []) {
      const list = emittersByEvent.get(ev) ?? []
      list.push(m.id)
      emittersByEvent.set(ev, list)
    }
  }

  for (const m of input.manifests) {
    if (!active.has(m.id)) continue
    for (const listened of m.events?.listens ?? []) {
      if (CORE_EVENT_PREFIXES.some((p) => listened.startsWith(p))) continue
      const emitters = emittersByEvent.get(listened) ?? []
      if (emitters.length === 0) {
        findings.push({
          id: `R3:${m.id}:${listened}`,
          rule: 'R3',
          severity: 'info',
          pluginId: m.id,
          location: `events.listens[${listened}]`,
          message: `Plugin "${m.id}" escucha el evento "${listened}" pero ningún plugin activo lo emite.`,
          details: { event: listened },
        })
      }
    }
  }
  return findings
}
