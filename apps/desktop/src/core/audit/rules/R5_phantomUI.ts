import type { Finding, AuditInputs } from '../types'

/**
 * R5 — UI fantasma.
 * Detecta `pages`, `navItems` y `widgets` declarados por un plugin inactivo
 * pero que el manifest aún expone (lo cual indica posible leak si el core
 * los enrutara sin verificar). Severidad: error.
 *
 * Nota: el `PluginManager` ya filtra estas listas al desactivar; esta regla
 * detecta cualquier plugin inactivo que aún declare UI registrable, lo cual
 * sirve como verificación cruzada.
 */
export function R5_phantomUI(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)

  for (const m of input.manifests) {
    if (active.has(m.id)) continue
    const counts = {
      pages: m.pages?.length ?? 0,
      navItems: m.navItems?.length ?? 0,
      widgets: m.widgets?.length ?? 0,
    }
    const total = counts.pages + counts.navItems + counts.widgets
    if (total === 0) continue
    findings.push({
      id: `R5:${m.id}`,
      rule: 'R5',
      severity: 'error',
      pluginId: m.id,
      location: 'manifest.pages|navItems|widgets',
      message: `Plugin inactivo "${m.id}" declara UI (${counts.pages} páginas, ${counts.navItems} items de nav, ${counts.widgets} widgets). El core debe filtrarlos.`,
      details: counts,
    })
  }
  return findings
}
