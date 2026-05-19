import type { Finding, AuditInputs } from '../types'

/**
 * R8 — Quick actions apuntando a páginas/acciones de plugins inactivos
 * sin marcar `requiredPlugin`. Severidad: error.
 *
 * Las quick actions que sí declaran `requiredPlugin` son filtradas en runtime
 * por `QuickActionsBar`; aquí detectamos las que NO lo declaran pero su
 * `path` empieza con la ruta de un plugin inactivo.
 */
export function R8_quickActions(input: AuditInputs): Finding[] {
  const findings: Finding[] = []
  const active = new Set(input.activePluginIds)

  // Mapa path → pluginId (basado en pages declaradas).
  const pathOwners = new Map<string, string>()
  for (const m of input.manifests) {
    for (const page of m.pages ?? []) {
      pathOwners.set(page.path, m.id)
    }
  }

  input.quickActions.forEach((qa, idx) => {
    // Encontrar el dueño del path (match por prefijo más largo)
    let owner: string | undefined
    let bestLen = 0
    for (const [path, pluginId] of pathOwners) {
      if ((qa.path === path || qa.path.startsWith(path + '/')) && path.length > bestLen) {
        owner = pluginId
        bestLen = path.length
      }
    }
    if (!owner) return // path al core
    if (active.has(owner)) return
    if (qa.requiredPlugin === owner) return // ya filtrada en runtime

    findings.push({
      id: `R8:${idx}:${qa.label}`,
      rule: 'R8',
      severity: 'error',
      pluginId: owner,
      location: `quickActions[${idx}]`,
      message: `Quick action "${qa.label}" navega a "${qa.path}" del plugin inactivo "${owner}" sin declarar \`requiredPlugin\`.`,
      details: { label: qa.label, path: qa.path, owner, declaredRequiredPlugin: qa.requiredPlugin },
    })
  })
  return findings
}
