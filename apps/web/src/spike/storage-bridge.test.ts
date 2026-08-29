/**
 * StorageBridgeSpike — validación de viabilidad del puente de almacenamiento web.
 *
 * Verifica que sql.js puede ejecutar el schema core REAL de Nora OS y que el
 * WebStorageBridge respeta el contrato StorageBridge que consume el renderer.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebStorageBridge } from './storage-bridge'
import { WORK_MIGRATIONS } from './schema'
import { loadSqlJs } from './sqlite-web'
import type { Migration } from './types'

// En Node los túne tanto sql como crypto.subtle existen; para tests evitamos
// persistir a IndexedDB (no existe en node) probando con un key distinto por
// test y sin llamar a save().
const TEST_KEY = `test:${Date.now()}`

describe('WebStorageBridge (schema core real)', () => {
  let bridge: WebStorageBridge

  beforeAll(async () => {
    await loadSqlJs()
    bridge = new WebStorageBridge({ dbKey: TEST_KEY })
    await bridge.open()
  })

  afterAll(() => {
    bridge.close()
  })

  it('crea las tablas del schema core', async () => {
    const tables = (await bridge.query(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    )) as Array<{ name: string }>
    const names = tables.map((t) => t.name)
    expect(names).toContain('settings')
    expect(names).toContain('events_log')
    expect(names).toContain('profile')
    expect(names).toContain('core_tags')
    expect(names).toContain('_migrations')
  })

  it('insert y lee con INSERT OR REPLACE (patrón que usa el renderer)', async () => {
    await bridge.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      'core:ollamaSettings',
      JSON.stringify({ enabled: false }),
    ])
    const rows = (await bridge.query('SELECT value FROM settings WHERE key = ?', [
      'core:ollamaSettings',
    ])) as Array<{ value: string }>
    expect(rows[0].value).toBe(JSON.stringify({ enabled: false }))
  })

  it('devuelve lastInsertRowid en AUTOINCREMENT', async () => {
    const r1 = await bridge.execute(
      'INSERT INTO events_log (event_type, source, payload) VALUES (?, ?, ?)',
      ['CORE_TEST', 'spike', JSON.stringify({ a: 1 })],
    )
    expect(r1.lastInsertRowid).toBeGreaterThan(0)
    const r2 = await bridge.execute(
      'INSERT INTO events_log (event_type, source, payload) VALUES (?, ?, ?)',
      ['CORE_TEST', 'spike', '{}'],
    )
    expect(r2.lastInsertRowid).toBe(r1.lastInsertRowid + 1)
  })

  it('resuelve foreign keys ON DELETE CASCADE', async () => {
    const tagRes = await bridge.execute('INSERT INTO core_tags (name) VALUES (?)', ['tag-a'])
    const tagId = tagRes.lastInsertRowid
    await bridge.execute(
      'INSERT INTO core_tag_links (tag_id, entity_type, entity_id) VALUES (?, ?, ?)',
      [tagId, 'note', 'entity-1'],
    )
    const before = (await bridge.query('SELECT * FROM core_tag_links')).length
    expect(before).toBeGreaterThan(0)
    await bridge.execute('DELETE FROM core_tags WHERE id = ?', [tagId])
    const after = (await bridge.query('SELECT * FROM core_tag_links')).length
    expect(after).toBe(0)
  })

  it('aplica migraciones de plugin en transacción', async () => {
    const fresh = new WebStorageBridge({ dbKey: `${TEST_KEY}:mig` })
    await fresh.open()
    await fresh.migrate('work', WORK_MIGRATIONS)
    const tables = (await fresh.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'work_%'",
    )) as Array<{ name: string }>
    const names = tables.map((t) => t.name)
    expect(names).toContain('work_boards')
    expect(names).toContain('work_columns')
    expect(names).toContain('work_cards')
    expect(names).toContain('work_notes')

    // Idempotente: re-aplicar no duplica ni falla.
    await expect(fresh.migrate('work', WORK_MIGRATIONS)).resolves.toBeUndefined()
    const recorded = (await fresh.query('SELECT version FROM _migrations WHERE plugin_id = ?', [
      'work',
    ])) as Array<{ version: number }>
    expect(recorded.map((r) => r.version).sort()).toEqual([1, 2])
    fresh.close()
  })

  it('rechaza query que no es SELECT (seguridad tipo storage-ipc)', async () => {
    await expect(bridge.query('DELETE FROM settings')).rejects.toThrow()
  })

  it('rechaza execute que no es escritura (seguridad tipo storage-ipc)', async () => {
    await expect(bridge.execute('SELECT * FROM settings')).rejects.toThrow()
  })

  it('hace rollback completo de una migración que falla a mitad (sin estado parcial)', async () => {
    const broken: Migration[] = [
      {
        version: 1,
        up: 'CREATE TABLE tmp_partial (id INTEGER); THIS IS NOT SQL',
      },
    ]
    const fresh = new WebStorageBridge({ dbKey: `${TEST_KEY}:rollback` })
    await fresh.open()
    await expect(fresh.migrate('broken', broken)).rejects.toThrow()

    // La tabla creada por el primer statement de `up` debe haberse revertido.
    const tables = (await fresh.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tmp_partial'",
    )) as Array<{ name: string }>
    expect(tables).toHaveLength(0)

    // La versión no debe quedar registrada como aplicada.
    const recorded = (await fresh.query(
      'SELECT version FROM _migrations WHERE plugin_id = ?',
      ['broken'],
    )) as Array<{ version: number }>
    expect(recorded).toHaveLength(0)

    // Tras el ROLLBACK la conexión debe seguir siendo utilizable.
    await expect(
      fresh.execute('INSERT INTO settings (key, value) VALUES (?, ?)', ['post-rollback', 'ok']),
    ).resolves.toBeDefined()
    fresh.close()
  })

  it('aplica migraciones en orden de versión aunque se pasen desordenadas', async () => {
    const fresh = new WebStorageBridge({ dbKey: `${TEST_KEY}:order` })
    await fresh.open()
    await fresh.migrate('order', [
      { version: 2, up: 'CREATE TABLE order_v2 (id INTEGER)' },
      { version: 1, up: 'CREATE TABLE order_v1 (id INTEGER)' },
    ])
    const recorded = (await fresh.query('SELECT version FROM _migrations WHERE plugin_id = ?', [
      'order',
    ])) as Array<{ version: number }>
    expect(recorded.map((r) => r.version).sort()).toEqual([1, 2])
    fresh.close()
  })

  it('omite versiones ya aplicadas y aplica únicamente las pendientes', async () => {
    const fresh = new WebStorageBridge({ dbKey: `${TEST_KEY}:partial` })
    await fresh.open()
    await fresh.migrate('partial', [{ version: 1, up: 'CREATE TABLE partial_v1 (id INTEGER)' }])

    // La v1 debe omitirse (no re-ejecutar su up), solo aplicarse la v2.
    await fresh.migrate('partial', [
      { version: 1, up: 'CREATE TABLE partial_v1_REDO (id INTEGER)' },
      { version: 2, up: 'CREATE TABLE partial_v2 (id INTEGER)' },
    ])

    const names = ((await fresh.query(
      "SELECT name FROM sqlite_master WHERE name LIKE 'partial_%'",
    )) as Array<{ name: string }>).map((r) => r.name)

    // La v1 original debe existir; el up de v1 ya aplicada NO debe re-ejecutarse.
    expect(names).toContain('partial_v1')
    expect(names).not.toContain('partial_v1_REDO')
    expect(names).toContain('partial_v2')
    fresh.close()
  })
})
