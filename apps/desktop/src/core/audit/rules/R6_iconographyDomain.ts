import type { Finding, AuditInputs, AuditFix } from '../types'
import {
  isIconValidForDomain,
  suggestIconsForDomain,
  DOMAIN_ICON_CATALOG,
} from '../domainIconCatalog'
import type { PluginManifest } from '@core/types'

/**
 * R6 — Coherencia semántica de iconografía con el dominio del plugin.
 *
 * Para cada plugin con `manifest.domain` declarado:
 *   - error: ícono PRINCIPAL (`iconography.primary` o `manifest.icon`)
 *     fuera del catálogo del dominio.
 *   - warn: cualquier ícono SECUNDARIO (pages, navItems, widgets,
 *     quickActions) fuera del catálogo o explícitamente prohibido.
 *   - info: oportunidad de usar un ícono más específico del dominio.
 *
 * Cada finding incluye sugerencias del catálogo y un `fix` (autofix) cuando
 * el plugin es oficial (heurística: id ∈ OFFICIAL_PLUGIN_IDS).
 */

const OFFICIAL_PLUGIN_IDS = new Set(['fitness', 'work', 'finance', 'habits', 'journal', 'goals'])

interface IconUsage {
  location: string
  icon: string
  isPrimary: boolean
}

function collectIcons(m: PluginManifest, quickActionPathIcons: Map<string, string[]>): IconUsage[] {
  const out: IconUsage[] = []
  const primary = m.iconography?.primary ?? m.icon
  if (primary) out.push({ location: 'iconography.primary', icon: primary, isPrimary: true })

  m.pages?.forEach((p, i) => {
    if (p.icon) out.push({ location: `pages[${i}].icon (${p.id})`, icon: p.icon, isPrimary: false })
  })
  m.navItems?.forEach((n, i) => {
    if (n.icon) out.push({ location: `navItems[${i}].icon (${n.id})`, icon: n.icon, isPrimary: false })
  })
  // widgets no exponen icon en la PageDefinition actual, pero futuros sí.

  // Quick actions cuyo `path` empieza con la ruta del plugin.
  const pluginPaths = m.pages?.map((p) => p.path) ?? []
  for (const [path, icons] of quickActionPathIcons) {
    if (pluginPaths.some((pp) => path === pp || path.startsWith(pp + '/'))) {
      icons.forEach((icon, i) => {
        out.push({ location: `quickActions[path=${path}][${i}]`, icon, isPrimary: false })
      })
    }
  }
  return out
}

export function R6_iconographyDomain(input: AuditInputs): Finding[] {
  const findings: Finding[] = []

  // Indexar quickActions por path → íconos (label-derived no aplica aquí; usamos componentes string)
  const quickActionPathIcons = new Map<string, string[]>()
  for (const qa of input.quickActions) {
    // Las quick-actions del core no traen el nombre del ícono como string
    // (usan componentes JSX). Para R6 nos enfocamos solo en `requiredPlugin`
    // → coherencia se valida en R8. Mantenemos el mapa vacío salvo que
    // alguna quick-action declare explícitamente icon como string.
    const anyQa = qa as unknown as { icon?: string }
    if (typeof anyQa.icon === 'string') {
      const list = quickActionPathIcons.get(qa.path) ?? []
      list.push(anyQa.icon)
      quickActionPathIcons.set(qa.path, list)
    }
  }

  for (const m of input.manifests) {
    if (!m.domain) continue
    const domain = m.domain
    const gallery = m.iconography?.gallery ?? []
    const usages = collectIcons(m, quickActionPathIcons)
    const isOfficial = OFFICIAL_PLUGIN_IDS.has(m.id)

    for (const u of usages) {
      const result = isIconValidForDomain(u.icon, domain, gallery)
      if (result.valid) continue

      const suggestions = suggestIconsForDomain(domain, [u.icon])
      const severity: Finding['severity'] = u.isPrimary ? 'error' : 'warn'

      let fix: AuditFix | undefined
      if (isOfficial && suggestions[0]) {
        fix = {
          kind: 'replaceIcon',
          pluginId: m.id,
          target: u.location,
          from: u.icon,
          to: suggestions[0],
        }
      }

      findings.push({
        id: `R6:${m.id}:${u.location}`,
        rule: 'R6',
        severity,
        pluginId: m.id,
        location: u.location,
        message:
          result.reason === 'forbidden'
            ? `Ícono "${u.icon}" está PROHIBIDO en el dominio "${domain}" (${DOMAIN_ICON_CATALOG[domain].description}).`
            : `Ícono "${u.icon}" no está en el catálogo del dominio "${domain}". Sugerencias: ${suggestions.join(', ')}.`,
        details: { currentIcon: u.icon, domain, suggestions, reason: result.reason },
        fix,
      })
    }

    // Info: si el plugin no declara `iconography` y solo tiene `manifest.icon`
    // sugerir migrar a `iconography.primary`.
    if (!m.iconography) {
      findings.push({
        id: `R6:${m.id}:no-iconography`,
        rule: 'R6',
        severity: 'info',
        pluginId: m.id,
        location: 'manifest.iconography',
        message: `Plugin "${m.id}" debería declarar \`iconography: { primary, gallery? }\` para mejorar la auditoría.`,
        details: { domain },
      })
    }
  }
  return findings
}
