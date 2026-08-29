/**
 * Tests de Fase 3: los 8 plugins del núcleo operan con datos reales sobre el
 * backend web (sql.js).
 *
 * Simula el arranque real del renderer desktop (sin montar React): registra un
 * usuario, monta `window.storage` con el bridge web, importa los manifiestos de
 * los 8 plugins (que se auto-registran en `PluginRegistry`), y corre
 * `pluginManager.initPlugin()` para cada uno —igual que hace `App.bootstrap()`.
 * Verifica que las migraciones corren (tablas creadas) y que el store de cada
 * plugin se hidrata leyendo datos reales de la DB.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { setPersistence, MemoryBackend } from '../spike/sqlite-web'
import { authBridge } from './auth'
import { storageBridge } from './storage'
import { getAvailablePlugins } from '@core/plugins/PluginRegistry'
import { pluginManager } from '@core/plugins/PluginManager'

// Los módulos de plugin se auto-registran al importarse (efecto de lado), igual
// que hacen los imports de `App.tsx`.
import '@/plugins/fitness'
import '@/plugins/work'
import '@/plugins/finance'
import '@/plugins/habits'
import '@/plugins/journal'
import '@/plugins/goals'
import '@/plugins/knowledge'
import '@/plugins/time'

const EXPECTED_PLUGIN_IDS = [
  'finance',
  'fitness',
  'goals',
  'habits',
  'journal',
  'knowledge',
  'time',
  'work',
]

// Tabla representativa por plugin (de su migración v1) a comprobar.
const SAMPLE_TABLES: Record<string, string> = {
  finance: 'finance_accounts',
  fitness: 'fitness_daily_entries',
  goals: 'goals_objectives',
  habits: 'habits_definitions',
  journal: 'journal_entries',
  knowledge: 'knowledge_resources',
  time: 'time_projects',
  work: 'work_boards',
}

beforeAll(async () => {
  setPersistence(new MemoryBackend())
  await authBridge.init()

  const user = await authBridge.register({
    username: 'plugin_tester',
    password: 'password-123',
    recoveryQuestion: 'q',
    recoveryAnswer: 'respuesta',
  })
  await storageBridge.setActiveUser(user.id)

  // La StorageAPI del desktop lee `window.storage`; lo montamos igual que hace
  // el bootstrap web en el navegador.
  ;(globalThis as any).window = {
    storage: storageBridge,
    auth: authBridge,
  }
})

describe('Fase 3: 8 plugins del núcleo sobre sql.js', () => {
  it('se registran los 8 manifiestos esperados', () => {
    const ids = getAvailablePlugins()
      .map((m) => m.id)
      .sort()
    expect(ids).toEqual([...EXPECTED_PLUGIN_IDS].sort())
  })

  it('cada plugin se inicializa (migraciones + hidratación de datos)', async () => {
    const manifests = getAvailablePlugins()
    for (const manifest of manifests) {
      pluginManager.register(manifest)
      await pluginManager.initPlugin(manifest.id)
      const entry = pluginManager.getPlugin(manifest.id)
      expect(entry?.status, `plugin ${manifest.id} debería quedar active`).toBe('active')
      expect(entry?.error).toBeUndefined()
    }
  })

  it('las migraciones se registran en _migrations para los 8 plugins', async () => {
    const migrated = (await storageBridge.query(
      `SELECT DISTINCT plugin_id FROM _migrations`,
    )) as Array<{ plugin_id: string }>
    const migratedIds = migrated.map((r) => r.plugin_id).sort()
    expect(migratedIds).toEqual([...EXPECTED_PLUGIN_IDS].sort())
  })

  it('las tablas de datos de cada plugin existen y son consultables', async () => {
    for (const [pluginId, table] of Object.entries(SAMPLE_TABLES)) {
      const rows = await storageBridge.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [table],
      )
      expect(rows.length, `tabla ${table} de ${pluginId} debería existir`).toBe(1)
    }
  })

  it('el UI registrado por los plugins queda disponible (pages/widgets/nav)', () => {
    const pages = pluginManager.getActivePages()
    const widgets = pluginManager.getActiveWidgets()
    const nav = pluginManager.getActiveNavItems()
    // Al menos 1 widget y 1 página por plugin activo.
    expect(widgets.length).toBeGreaterThanOrEqual(8)
    expect(pages.length).toBeGreaterThanOrEqual(8)
    expect(nav.length).toBeGreaterThanOrEqual(8)
  })
})
