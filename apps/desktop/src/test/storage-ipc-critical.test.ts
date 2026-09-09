/**
 * Tests críticos para el sandbox SQL de storage-ipc.
 * Verifica allowlist de operaciones, validación de payload, single-statement,
 * y el namespace de tablas de las migraciones por plugin.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { ipcMain } from 'electron'
import { registerStorageIpc } from '../../electron/services/storage-ipc'
import type { DatabaseService } from '../../electron/services/database'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

const QUERY = 'storage:query'
const EXECUTE = 'storage:execute'
const MIGRATE = 'storage:migrate'

type Handler = (...args: unknown[]) => unknown

function createFakeDb() {
  return {
    query: vi.fn(() => [{ ok: true }]),
    execute: vi.fn(() => ({ changes: 1, lastInsertRowid: 7 })),
    runMigrations: vi.fn(),
  }
}

describe('registerStorageIpc sandbox', () => {
  let handlers: Map<string, Handler>
  let db: ReturnType<typeof createFakeDb>

  beforeEach(() => {
    vi.clearAllMocks()
    handlers = new Map()
    db = createFakeDb()
    registerStorageIpc(db as unknown as DatabaseService)
    for (const [channel, fn] of (ipcMain.handle as unknown as Mock).mock.calls) {
      handlers.set(channel as string, fn as Handler)
    }
  })

  it('storage:query ejecuta SELECT sobre la DB', () => {
    const result = handlers.get(QUERY)!({}, 'SELECT 1')
    expect(result).toEqual([{ ok: true }])
    expect(db.query).toHaveBeenCalledWith('SELECT 1', [])
  })

  it('storage:query pasa los params y trata params ausentes como []', () => {
    handlers.get(QUERY)!({}, 'SELECT * FROM t WHERE a = ?', [5])
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM t WHERE a = ?', [5])

    handlers.get(QUERY)!({}, 'SELECT * FROM t')
    expect(db.query).toHaveBeenLastCalledWith('SELECT * FROM t', [])
  })

  it('storage:query tolera espacios y punto y coma final (la validación normaliza en memoria)', () => {
    handlers.get(QUERY)!({}, '  SELECT 1;  ')
    // La validación normaliza internamente; la DB recibe el SQL original.
    expect(db.query).toHaveBeenCalledWith('  SELECT 1;  ', [])
  })

  it('storage:query permite WITH y PRAGMA', () => {
    handlers.get(QUERY)!({}, 'WITH x AS (SELECT 1) SELECT * FROM x')
    expect(db.query).toHaveBeenCalledWith('WITH x AS (SELECT 1) SELECT * FROM x', [])

    handlers.get(QUERY)!({}, 'PRAGMA user_version')
    expect(db.query).toHaveBeenLastCalledWith('PRAGMA user_version', [])
  })

  it('storage:query rechaza operaciones fuera del allowlist', () => {
    expect(() => handlers.get(QUERY)!({}, 'DELETE FROM t')).toThrow(
      "storage:query does not allow 'DELETE' statements",
    )
    expect(() => handlers.get(QUERY)!({}, 'FOO bar')).toThrow(
      "storage:query does not allow 'FOO' statements",
    )
  })

  it('storage:query rechaza sql no-string o vacío', () => {
    expect(() => handlers.get(QUERY)!({}, 42)).toThrow('sql must be a non-empty string')
    expect(() => handlers.get(QUERY)!({}, '   ')).toThrow('sql must be a non-empty string')
  })

  it('storage:query rechaza múltiples statements', () => {
    expect(() => handlers.get(QUERY)!({}, 'SELECT 1; SELECT 2')).toThrow(
      'only a single SQL statement is allowed',
    )
  })

  it('storage:query rechaza params que no sean array', () => {
    expect(() => handlers.get(QUERY)!({}, 'SELECT 1', 'nope')).toThrow('params must be an array')
  })

  it('storage:execute permite INSERT, UPDATE y DELETE', () => {
    handlers.get(EXECUTE)!({}, 'INSERT INTO t (a) VALUES (?)', [1])
    expect(db.execute).toHaveBeenCalledWith('INSERT INTO t (a) VALUES (?)', [1])

    handlers.get(EXECUTE)!({}, 'UPDATE t SET a = 1 WHERE id = ?', [2])
    expect(db.execute).toHaveBeenLastCalledWith('UPDATE t SET a = 1 WHERE id = ?', [2])

    handlers.get(EXECUTE)!({}, 'DELETE FROM t WHERE id = 3')
    expect(db.execute).toHaveBeenLastCalledWith('DELETE FROM t WHERE id = 3', [])
  })

  it('storage:execute rechaza SELECT y múltiples statements', () => {
    expect(() => handlers.get(EXECUTE)!({}, 'SELECT 1')).toThrow(
      "storage:execute does not allow 'SELECT' statements",
    )
    expect(() => handlers.get(EXECUTE)!({}, 'INSERT INTO t (a) VALUES (1); DELETE FROM t')).toThrow(
      'only a single SQL statement is allowed',
    )
  })

  it('storage:migrate ejecuta migraciones válidas de un plugin', () => {
    const migrations = [
      {
        version: 1,
        up: 'CREATE TABLE myplugin_items (id TEXT PRIMARY KEY, value TEXT)',
      },
      {
        version: 2,
        up: 'CREATE INDEX idx_myplugin_items ON myplugin_items (value)',
      },
    ]
    handlers.get(MIGRATE)!({}, 'myplugin', migrations)

    expect(db.runMigrations).toHaveBeenCalledWith('myplugin', migrations)
  })

  it('storage:migrate permite múltiples statements y DDL/DML del namespace', () => {
    const migrations = [
      {
        version: 1,
        up: 'CREATE TABLE myplug_a (id TEXT); CREATE TABLE myplug_b (id TEXT)',
      },
      {
        version: 2,
        up: 'ALTER TABLE myplug_a ADD COLUMN extra TEXT',
      },
      {
        version: 3,
        up: "INSERT OR REPLACE INTO myplug_a (id) VALUES ('x')",
      },
      {
        version: 4,
        up: "UPDATE myplug_a SET extra = 'y' WHERE id = 'x'",
      },
      {
        version: 5,
        up: "DELETE FROM myplug_a WHERE id = 'x'",
      },
      {
        version: 6,
        up: 'DROP TABLE IF EXISTS myplug_b',
      },
    ]
    handlers.get(MIGRATE)!({}, 'myplug', migrations)

    expect(db.runMigrations).toHaveBeenCalledWith('myplug', migrations)
  })

  it('storage:migrate rechaza pluginIds inválidos', () => {
    for (const pluginId of ['MyPlugin', '123', '', 'con espacio']) {
      expect(() => handlers.get(MIGRATE)!({}, pluginId, [{ version: 1, up: 'CREATE TABLE t (id TEXT)' }])).toThrow(
        'pluginId is invalid',
      )
    }
  })

  it('storage:migrate rechaza migrations que no sean array no-vacío', () => {
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', {})).toThrow(
      'migrations must be a non-empty array',
    )
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [])).toThrow(
      'migrations must be a non-empty array',
    )
    expect(db.runMigrations).not.toHaveBeenCalled()
  })

  it('storage:migrate valida versiones positivas enteras únicas', () => {
    const base = { up: 'CREATE TABLE myplugin_t (id TEXT)' }
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ ...base, version: '1' }])).toThrow(
      'each migration must contain a positive integer version',
    )
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ ...base, version: 0 }])).toThrow(
      'each migration must contain a positive integer version',
    )
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ ...base, version: -1 }])).toThrow(
      'each migration must contain a positive integer version',
    )
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ ...base, version: 1.5 }])).toThrow(
      'each migration must contain a positive integer version',
    )
    expect(() =>
      handlers.get(MIGRATE)!({}, 'myplugin', [
        { ...base, version: 1 },
        { ...base, version: 1 },
      ]),
    ).toThrow('duplicate migration version 1')
  })

  it('storage:migrate exige un up SQL no-vacío por migración', () => {
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ version: 1, up: 42 }])).toThrow(
      'must define a non-empty up SQL string',
    )
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ version: 1 }])).toThrow(
      'must define a non-empty up SQL string',
    )
    expect(() => handlers.get(MIGRATE)!({}, 'myplugin', [{ version: 1, up: '   ' }])).toThrow(
      'must define a non-empty up SQL string',
    )
  })

  it('storage:migrate rechaza operaciones disallowed', () => {
    expect(() =>
      handlers.get(MIGRATE)!({}, 'myplugin', [{ version: 1, up: 'SELECT * FROM myplugin_t' }]),
    ).toThrow("migration 1 contains disallowed 'SELECT' operation")
  })

  it('storage:migrate rechaza tablas fuera del namespace del plugin', () => {
    expect(() =>
      handlers.get(MIGRATE)!({}, 'myplugin', [{ version: 1, up: 'CREATE TABLE evil (id TEXT)' }]),
    ).toThrow("migration 1 touches table 'evil' outside plugin namespace 'myplugin_'")
  })

  it('storage:migrate valida TODAS las statements de una migración multi-statement', () => {
    expect(() =>
      handlers.get(MIGRATE)!({}, 'myplugin', [
        { version: 1, up: 'CREATE TABLE myplugin_a (id TEXT); CREATE TABLE evil (id TEXT)' },
      ]),
    ).toThrow("migration 1 touches table 'evil' outside plugin namespace 'myplugin_'")
  })

  it('storage:migrate rechaza statements SQL sin contenido ejecutable', () => {
    expect(() => handlers.get(MIGRATE)!({}, 'myplug', [{ version: 1, up: ' ; ; ' }])).toThrow(
      'migration 1 does not contain executable SQL statements',
    )
  })

  it('storage:migrate rechaza statements sin tabla resoluble', () => {
    expect(() =>
      handlers.get(MIGRATE)!({}, 'myplugin', [{ version: 1, up: 'CREATE VIEW myplugin_v AS SELECT 1' }]),
    ).toThrow('migration 1 could not resolve target table')
  })

  it('envuelve errores de la capa de datos con el prefijo de validación', () => {
    db.query.mockImplementation(() => {
      throw new Error('db caída')
    })
    expect(() => handlers.get(QUERY)!({}, 'SELECT 1')).toThrow(
      'Storage IPC validation failed: db caída',
    )
  })

  it('traduce errores no-Error a "unknown storage error"', () => {
    db.query.mockImplementation(() => {
      throw 'boom'
    })
    expect(() => handlers.get(QUERY)!({}, 'SELECT 1')).toThrow(
      'Storage IPC validation failed: unknown storage error',
    )
  })
})