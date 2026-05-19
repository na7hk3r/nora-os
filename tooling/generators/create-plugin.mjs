#!/usr/bin/env node
/* eslint-disable */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { argv } from 'node:process'
import { fileURLToPath } from 'node:url'

const id = argv[2]
if (!id || !/^[a-z][a-z0-9-]{1,30}$/.test(id)) {
  console.error('Uso: npm run create-plugin -- <plugin-id-en-kebab>')
  console.error('Ejemplo: npm run create-plugin -- finanzas')
  process.exit(1)
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const desktopSrc = join(repoRoot, 'apps', 'desktop', 'src')
const root = join(desktopSrc, 'plugins', id)
if (existsSync(root)) {
  console.error(`Ya existe ${root}`)
  process.exit(1)
}

mkdirSync(root, { recursive: true })
mkdirSync(join(root, 'pages'), { recursive: true })
mkdirSync(join(root, 'components'), { recursive: true })

const pluginIdConst = id.replace(/-/g, '_')
const PluginName = id.replace(/(^|-)([a-z])/g, (_, _s, c) => c.toUpperCase())

writeFileSync(join(root, 'index.ts'), `import type { PluginManifest } from '@core/types'
import { ${PluginName}Page } from './pages/${PluginName}Page'

export const ${pluginIdConst}Plugin: PluginManifest = {
  id: '${id}',
  name: '${PluginName}',
  version: '0.1.0',
  description: 'TODO: describir el plugin',
  icon: 'LayoutDashboard',
  // Auditor: ajustar dominio + iconografia segun el plugin.
  // Ver docs/CONSISTENCY_AUDITOR.md y apps/desktop/src/core/audit/domainIconCatalog.ts
  // Dominios soportados: finance, health, fitness, nutrition, nature,
  // knowledge, reading, productivity, habits, social, travel, creativity,
  // music, gaming, spirituality, home, pets, weather, time, utility.
  domain: 'utility',
  domainKeywords: [],
  iconography: {
    primary: 'LayoutDashboard',
    gallery: ['LayoutDashboard', 'Settings'],
  },
  navItems: [
    { id: '${id}-main', label: '${PluginName}', path: '/${id}', icon: 'LayoutDashboard' },
  ],
  pages: [
    { id: '${id}-page', path: '/${id}', component: ${PluginName}Page, title: '${PluginName}', pluginId: '${id}' },
  ],
  async init(api) {
    api.events.emit('PLUGIN_INITIALIZED', { plugin: '${id}' }, { source: '${id}' })
  },
}
`)

writeFileSync(join(root, 'pages', `${PluginName}Page.tsx`), `export function ${PluginName}Page() {
  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-surface-light/85 p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Plugin</p>
        <h1 className="text-xl font-semibold">${PluginName}</h1>
      </header>
      <p className="text-sm text-muted">TODO: implementar UI del plugin ${id}.</p>
    </div>
  )
}
`)

writeFileSync(join(root, 'README.md'), `# ${PluginName}\n\nPlugin generado con \`npm run create-plugin -- ${id}\`.\n\n## Proximos pasos\n\n1. Registrarlo en \`apps/desktop/src/core/plugins/PluginRegistry.ts\`.\n2. Importarlo en \`apps/desktop/src/App.tsx\` (\`import './plugins/${id}'\`).\n3. Crear las tablas en una migracion (prefijo \`${id}_\`).\n`)

console.log(`Plugin "${id}" generado en ${root}`)
console.log('Acordate de:')
console.log(`  1. Importarlo en apps/desktop/src/App.tsx: import './plugins/${id}'`)
console.log('  2. Registrarlo en apps/desktop/src/core/plugins/PluginRegistry.ts')
console.log('  3. Documentar tablas con prefijo ' + id + '_')
