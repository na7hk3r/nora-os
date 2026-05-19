import type { Finding, AuditInputs } from '../types'

/**
 * R10 — Persistencia de plugins desinstalados.
 * Para plugins inactivos que declaran `migrations` (i.e. crearon tablas
 * SQLite), sugerir purga de datos. Severidad: info.
 */
export function R10_persistence(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)

  for (const m of input.manifests) {
    if (active.has(m.id)) continue
    const migrations = m.migrations?.length ?? 0
    const collections = m.collections?.length ?? 0
    if (migrations === 0 && collections === 0) continue
    findings.push({
      id: `R10:${m.id}`,
      rule: 'R10',
      severity: 'info',
      pluginId: m.id,
      location: 'manifest.migrations|collections',
      message: `Plugin inactivo "${m.id}" tiene datos persistentes (${migrations} migración(es), ${collections} colección(es)). Considere purgar las tablas con prefijo "${m.id}_".`,
      details: { migrations, collections },
    })
  }
  return findings
}
