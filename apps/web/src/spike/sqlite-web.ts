/**
 * SqliteWebSpike
 *
 * Spike de viabilidad Fase 0: validar que sql.js (SQLite compilado a
 * WebAssembly) puede ejecutar el schema core real de Nora OS y persistir el
 * archivo de base de datos en IndexedDB (via Dexie), de modo que sobreviva
 * recargas del navegador.
 *
 * Puntos a validar:
 *  1. Carga de sql.js con el wasm (funciona igual en Node para tests y en
 *     navegador).
 *  2. Persistencia del array de bytes de la DB en IndexedDB.
 *  3. Rehidratación: al recargar, se reabre la DB desde el blob guardado.
 *
 * Un corazón de todas las apps (un solo usuario, un solo archivo .db en este
 * spike). La versión productiva añadirá un archivo por usuario igual que
 * Electron (personal-os-user-{id}.db).
 */
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import Dexie, { type Table } from 'dexie'

// ── Loader que funciona en Node (tests) y en navegador ──────────────
let sqlPromise: Promise<SqlJsStatic> | null = null

export function loadSqlJs(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    if (typeof window !== 'undefined') {
      // En el navegador el wasm se sirve desde /public (copiado en build,
      // ver vite.config.ts) bajo la base configurada (p. ej. /nora-os/web/).
      sqlPromise = initSqlJs({ locateFile: () => `${import.meta.env.BASE_URL}sql-wasm.wasm` })
    } else {
      // En Node (tests) cargamos el wasm desde node_modules de sql.js.
      sqlPromise = (async () => {
        const fs = await import('fs')
        const path = await import('path')
        const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm')
        const wasmBinary = fs.readFileSync(wasmPath)
        return initSqlJs({ wasmBinary: wasmBinary as unknown as ArrayBuffer })
      })()
    }
  }
  return sqlPromise as Promise<SqlJsStatic>
}

// ── Persistencia (IndexedDB en navegador, memoria en tests) ──────────
export interface PersistenceBackend {
  set(key: string, bytes: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | null>
  delete(key: string): Promise<void>
}

export class MemoryBackend implements PersistenceBackend {
  private store = new Map<string, Uint8Array>()
  async set(key: string, bytes: Uint8Array): Promise<void> {
    this.store.set(key, bytes)
  }
  async get(key: string): Promise<Uint8Array | null> {
    return this.store.get(key) ?? null
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}

class IndexedDbBackend implements PersistenceBackend {
  private db: NoraWebDb | null = null
  private async getDb(): Promise<NoraWebDb> {
    if (!this.db) this.db = new NoraWebDb()
    return this.db
  }
  async set(key: string, bytes: Uint8Array): Promise<void> {
    const db = await this.getDb()
    await db.dbs.put({ key, bytes, updatedAt: Date.now() })
  }
  async get(key: string): Promise<Uint8Array | null> {
    const db = await this.getDb()
    const row = await db.dbs.get(key)
    return row?.bytes ?? null
  }
  async delete(key: string): Promise<void> {
    const db = await this.getDb()
    await db.dbs.delete(key)
  }
}

class NoraWebDb extends Dexie {
  dbs!: Table<{ key: string; bytes: Uint8Array; updatedAt: number }, string>

  constructor() {
    super('nora-web')
    this.version(1).stores({
      dbs: 'key',
    })
  }
}

/** Backend de persistencia seleccionado automáticamente según el entorno. */
export const defaultPersistence: PersistenceBackend =
  typeof window !== 'undefined' ? new IndexedDbBackend() : new MemoryBackend()

/** Provisto por el usuario. En el spike, los tests usan memoria por defecto. */
let activePersistence: PersistenceBackend = defaultPersistence

export function setPersistence(backend: PersistenceBackend): void {
  activePersistence = backend
}

export async function persistDb(key: string, bytes: Uint8Array): Promise<void> {
  await activePersistence.set(key, bytes)
}

export async function loadDbBytes(key: string): Promise<Uint8Array | null> {
  return activePersistence.get(key)
}

export async function deleteDb(key: string): Promise<void> {
  await activePersistence.delete(key)
}

/**
 * Abre (o crea) una base SQLite bajo `key`, ejecuta el `schema` y devuelve
 * el objeto Database listo para operar. `save()` debe llamarse para persistir.
 */
export async function openDatabase(key: string, schema?: string): Promise<Database> {
  const SQL = await loadSqlJs()
  const existing = await loadDbBytes(key)
  const db: Database = existing ? new SQL.Database(existing) : new SQL.Database()

  // sql.js mantiene PRAGMA por conexión; hay que forzar foreign keys en cada
  // apertura/rehidratación (si solo vive en el schema, se pierde al volver a
  // cargar desde IndexedDB, rompiendo ON DELETE CASCADE).
  db.exec('PRAGMA foreign_keys = ON')

  if (schema && existing === null) {
    db.exec(schema)
    await persistDb(key, db.export())
  }
  return db
}

export function toBytes(db: Database): Uint8Array {
  return db.export()
}

export function safeClose(db: Database): void {
  try {
    db.close()
  } catch {
    // ignore
  }
}
