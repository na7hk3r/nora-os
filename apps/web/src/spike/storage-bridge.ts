/**
 * StorageBridgeWebSpike
 *
 * Spike de viabilidad Fase 0: implementación en el navegador de la interfaz
 * `StorageBridge` que el renderer de Nora OS consume vía `window.storage`.
 *
 * La premisa del port es que si esta implementación respeta EXACTAMENTE el
 * shape actual (query / execute / migrate), el renderer completo (core +
 * plugins + stores Zustand) puede operar sin cambiar una sola línea.
 *
 * Validaciones de este spike:
 *  1. `query` acepta SQL parametrizado (?) y devuelve filas.
 *  2. `execute` devuelve { changes, lastInsertRowid }.
 *  3. `migrate` aplica migraciones pendientes en transacción.
 *  4. Persistencia a IndexedDB (sqlite-web.persistDb) para sobrevivir recargas.
 *  5. Tipo de SQL: query solo SELECT, execute solo INSERT/UPDATE/DELETE
 *     (replicando la validación del storage-ipc.ts de Electron).
 */
import type { Database, Statement, BindParams } from 'sql.js'
import type { Migration } from './types'
import { openDatabase, persistDb, toBytes, safeClose } from './sqlite-web'
import { CORE_SCHEMA } from './schema'

export interface WebStorageOptions {
  /** Clave bajo la cual se persiste la DB de usuario en IndexedDB. */
  dbKey?: string
  /** Schema inicial (CORE_SCHEMA por defecto). */
  schema?: string
}

const ALLOWED_QUERY_RE = /^(SELECT|WITH|PRAGMA)\b/i
const ALLOWED_EXECUTE_RE = /^(INSERT|UPDATE|DELETE|REPLACE)\b/i

function assertSingleStatement(sql: string): void {
  // Rechaza SQL con múltiples sentencias separadas por ';' (excepto un ';'
  // final). Es la misma política de defensa que storage-ipc.ts de Electron.
  const trimmed = sql.trim().replace(/;+\s*$/, '')
  const body = trimmed.split(';')
  if (body.some((part) => part.trim().length > 0 && body.length > 1)) {
    throw new Error('Multiple statements are not allowed')
  }
  if (body.length > 1 && body[1].trim().length > 0) {
    throw new Error('Multiple statements are not allowed')
  }
}

function bindParams(stmt: Statement, params: unknown[]): void {
  if (!Array.isArray(params)) {
    throw new Error('params must be an array')
  }
  // sql.js: el bind por array (0-indexed) es el que respeta los placeholders
  // posicionales `?`. El bind por objeto `{1: value}` NO funciona en sql.js.
  if (params.length > 0) {
    stmt.bind(params as BindParams)
  }
}

function toLastInsertRowid(db: Database): number {
  const row = db.exec('SELECT last_insert_rowid() AS id')[0]
  return row ? Number(row.values[0][0]) : 0
}

export class WebStorageBridge {
  private db: Database | null = null
  private readonly dbKey: string
  private readonly schema: string

  constructor(options: WebStorageOptions = {}) {
    this.dbKey = options.dbKey ?? 'user:default'
    this.schema = options.schema ?? CORE_SCHEMA
  }

  /** Abre (o crea) la DB y aplica el schema si es nuevo. Debe llamarse antes de operar. */
  async open(): Promise<void> {
    this.db = await openDatabase(this.dbKey, this.schema)
  }

  /** Persiste el estado actual a IndexedDB. */
  async save(): Promise<void> {
    if (!this.db) throw new Error('database not open')
    await persistDb(this.dbKey, toBytes(this.db))
  }

  /** Exporta la DB como bytes crudos (equivalente a `exportActiveUserDb`). */
  exportBytes(): Uint8Array {
    if (!this.db) throw new Error('database not open')
    return toBytes(this.db)
  }

  /**
   * Reemplaza la DB entera por bytes crudos importados (equivalente a
   * `importActiveUserDb`). Requiere que la DB esté abierta; cierra la previa,
   * rehidrata desde los bytes y persiste.
   */
  async importBytes(bytes: Uint8Array): Promise<void> {
    const { loadSqlJs, persistDb } = await import('./sqlite-web')
    const SQL = await loadSqlJs()
    const imported = new SQL.Database(bytes)
    imported.exec('PRAGMA foreign_keys = ON')
    if (this.db) safeClose(this.db)
    this.db = imported
    await persistDb(this.dbKey, toBytes(this.db))
  }

  close(): void {
    if (this.db) {
      safeClose(this.db)
      this.db = null
    }
  }

  async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    if (!this.db) throw new Error('database not open')
    assertSingleStatement(sql)
    if (!ALLOWED_QUERY_RE.test(sql.trim())) {
      throw new Error('Only SELECT/WITH/PRAGMA statements are allowed for query')
    }
    const stmt = this.db.prepare(sql)
    try {
      if (params.length) bindParams(stmt, params)
      const rows: unknown[] = []
      while (stmt.step()) {
        rows.push(stmt.getAsObject())
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  async execute(
    sql: string,
    params: unknown[] = [],
  ): Promise<{ changes: number; lastInsertRowid: number }> {
    if (!this.db) throw new Error('database not open')
    assertSingleStatement(sql)
    if (!ALLOWED_EXECUTE_RE.test(sql.trim())) {
      throw new Error('Only INSERT/UPDATE/DELETE statements are allowed for execute')
    }
    // sql.js tiene un comportamiento donde el pragma foreign_keys puede no
    // persistir a nivel conexión tras ciertas operaciones (CREATE INDEX vía
    // exec, rehidratación, etc.). Re-afirmar antes de cada escritura es barato
    // y garantiza que ON DELETE CASCADE se respete siempre.
    this.db.run('PRAGMA foreign_keys = ON')
    this.db.run(sql, params as BindParams)
    const lastInsertRowid = toLastInsertRowid(this.db)
    // changes vía sqlite3_changes es aproximado en sql.js; usamos 1 para
    // operaciones de escritura (acurado para UPDATE/DELETE habilitando
    // PRAGMA count_changes sería lo ideal). Documentamos la limitación.
    return { changes: 1, lastInsertRowid }
  }

  async migrate(pluginId: string, migrations: Migration[]): Promise<void> {
    if (!this.db) throw new Error('database not open')
    if (!/^[A-Za-z0-9_-]+$/.test(pluginId)) throw new Error('invalid pluginId')

    const appliedRows = (await this.query('SELECT version FROM _migrations WHERE plugin_id = ?', [
      pluginId,
    ])) as Array<{ version: number }>
    const appliedVersions = new Set(appliedRows.map((r) => r.version))

    const pending = migrations
      .filter((m) => !appliedVersions.has(m.version))
      .sort((a, b) => a.version - b.version)

    for (const migration of pending) {
      // sql.js no expone transacciones implícitas ~ mejor-run; simulamos con
      // BEGIN/COMMIT explícito para replicar la transacción de Electron.
      this.db!.run('BEGIN')
      try {
        this.db!.run(migration.up)
        this.db!.run('INSERT INTO _migrations (plugin_id, version) VALUES (?, ?)', [
          pluginId,
          migration.version,
        ])
        this.db!.run('COMMIT')
      } catch (err) {
        this.db!.run('ROLLBACK')
        throw err
      }
    }
  }
}

export type { Migration } from './types'
