/**
 * WebAuthBridge
 *
 * Implementación en el navegador de `AuthBridge` (el contrato que consume
 * el renderer de Nora OS vía `window.auth`). Replica la lógica de
 * `apps/desktop/electron/services/auth.ts` sobre sql.js + WebCrypto.
 *
 * Diferencias documentadas frente a Electron:
 *  - Hashing por PBKDF2 (WebCrypto) en vez de scrypt (Node). Ver
 *    docs/WEB_PORT.md (compatibilidad de datos).
 *  - La DB de auth (`users` + `sessions`) vive en IndexedDB bajo la clave
 *    `auth` (un archivo sql.js persistido), no en un `auth.db` del filesystem.
 *  - La sesión activa se persiste en sessionStorage/localStorage (un solo
 *    navegador), de modo que `me()` la recupera tras recargar.
 */
import type { AuthUser, RegisterPayload, ResetPasswordWithRecoveryPayload } from '@core/types'
import { openDatabase, persistDb, toBytes, safeClose, loadDbBytes } from '@spike/sqlite-web'
import { hashSecret, verifySecret } from '@spike/crypto-web'
import type { Database } from 'sql.js'

const AUTH_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    recovery_question TEXT NOT NULL,
    recovery_answer_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    revoked_at TEXT,
    last_seen_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`

const SESSION_STORAGE_KEY = 'nora-web:session'

interface UserRow {
  id: string
  username: string
  password_hash: string
  recovery_question: string
  recovery_answer_hash: string
  created_at: string
  last_login_at: string | null
}

interface SessionRow {
  id: string
  user_id: string
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

function mapAuthUser(_db: Database, row: UserRow | null): AuthUser | null {
  if (!row) return null
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }
}

function getUserByUsername(db: Database, username: string): UserRow | null {
  const res = db.exec('SELECT * FROM users WHERE username = ?', [normalizeUsername(username)])
  if (!res[0]) return null
  const cols = res[0].columns
  const vals = res[0].values[0]
  if (!vals) return null
  const row: Record<string, unknown> = {}
  cols.forEach((c, i) => (row[c] = vals[i]))
  return row as unknown as UserRow
}

const memoryStorage = new Map<string, string>()

function getSessionStorage(): Storage {
  if (typeof window !== 'undefined') {
    try {
      return window.sessionStorage
    } catch {
      /* fallthrough */
    }
    try {
      return window.localStorage
    } catch {
      /* fallthrough */
    }
  }
  // Fallback (Node/tests o navegadores sin storage): memoria del proceso.
  return {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => void memoryStorage.set(k, v),
    removeItem: (k: string) => void memoryStorage.delete(k),
    clear: () => memoryStorage.clear(),
    key: (_i: number) => null,
    length: memoryStorage.size,
  } as Storage
}

export class WebAuthBridge {
  private db: Database | null = null
  private onActiveUser: ((userId: string | null) => void | Promise<void>) | null = null

  /** Registra un callback que se invoca cuando cambia la sesión activa. */
  setOnActiveUser(cb: (userId: string | null) => void | Promise<void>): void {
    this.onActiveUser = cb
  }

  private async notifyActiveUser(userId: string | null): Promise<void> {
    try {
      await this.onActiveUser?.(userId)
    } catch (err) {
      console.warn('[auth] onActiveUser hook failed', err)
    }
  }

  async init(): Promise<void> {
    const existing = await loadDbBytes('auth')
    this.db = await openDatabase('auth', AUTH_SCHEMA)
    // Pragma foreign_keys por conexión (ver spike).
    this.db.exec('PRAGMA foreign_keys = ON')
    if (existing === null) {
      await persistDb('auth', toBytes(this.db))
    }
  }

  private async persist(): Promise<void> {
    if (!this.db) return
    await persistDb('auth', toBytes(this.db))
  }

  private saveSession(sessionId: string | null): void {
    const storage = getSessionStorage()
    try {
      if (sessionId) storage.setItem(SESSION_STORAGE_KEY, sessionId)
      else storage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      // ignore storage errors
    }
  }

  async register(payload: RegisterPayload): Promise<AuthUser> {
    if (!this.db) throw new Error('Auth database not initialized')
    const username = normalizeUsername(payload.username)
    if (!username || username.length < 3 || !/^[a-z0-9._-]+$/i.test(username)) {
      throw new Error('El nombre de usuario no es válido.')
    }
    if (typeof payload.password !== 'string' || payload.password.length < 8) {
      throw new Error('La contraseña debe tener mínimo 8 caracteres.')
    }
    if (getUserByUsername(this.db, username)) {
      throw new Error('Este nombre de usuario ya está en uso. Elige otro.')
    }

    const userId = crypto.randomUUID()
    const passwordHash = await hashSecret(payload.password)
    const recoveryAnswerHash = await hashSecret(payload.recoveryAnswer.trim().toLowerCase())
    this.db.run(
      `INSERT INTO users (id, username, password_hash, recovery_question, recovery_answer_hash, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
      [userId, username, passwordHash, payload.recoveryQuestion.trim(), recoveryAnswerHash],
    )
    // Revocar sesiones previas y crear una nueva (mismo patrón que Electron).
    this.db.run(`UPDATE sessions SET revoked_at = datetime('now') WHERE revoked_at IS NULL`)
    const sessionId = crypto.randomUUID()
    this.db.run(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
      [sessionId, userId],
    )
    await this.persist()
    this.saveSession(sessionId)

    const user = mapAuthUser(this.db, getUserByUsername(this.db, username))
    if (!user) throw new Error('No se pudo completar el registro.')
    await this.notifyActiveUser(user.id)
    return user
  }

  async login(username: string, password: string): Promise<AuthUser> {
    if (!this.db) throw new Error('Auth database not initialized')
    const row = getUserByUsername(this.db, username)
    if (!row || !(await verifySecret(password, row.password_hash))) {
      throw new Error('El nombre de usuario o contraseña es incorrecto.')
    }
    this.db.run(
      `UPDATE users SET last_login_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      [row.id],
    )
    this.db.run(`UPDATE sessions SET revoked_at = datetime('now') WHERE revoked_at IS NULL`)
    const sessionId = crypto.randomUUID()
    this.db.run(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
      [sessionId, row.id],
    )
    await this.persist()
    this.saveSession(sessionId)

    const result = {
      id: row.id,
      username: row.username,
      createdAt: row.created_at,
      lastLoginAt: new Date().toISOString(),
    }
    await this.notifyActiveUser(row.id)
    return result
  }

  async logout(): Promise<void> {
    if (!this.db) return
    const sessionId = getSessionStorage().getItem(SESSION_STORAGE_KEY)
    if (sessionId) {
      this.db.run(`UPDATE sessions SET revoked_at = datetime('now') WHERE id = ?`, [sessionId])
      await this.persist()
    }
    this.saveSession(null)
    await this.notifyActiveUser(null)
  }

  async me(): Promise<AuthUser | null> {
    if (!this.db) return null
    const sessionId = getSessionStorage().getItem(SESSION_STORAGE_KEY)
    if (!sessionId) return null
    const res = this.db.exec('SELECT * FROM sessions WHERE id = ? AND revoked_at IS NULL', [
      sessionId,
    ])
    if (!res[0] || !res[0].values[0]) return null
    const scols = res[0].columns
    const svals = res[0].values[0]
    const session: Record<string, unknown> = {}
    scols.forEach((c, i) => (session[c] = svals[i]))
    // El user_id de la sesión es un id (uuid), no un username.
    const userRow = this.db.exec('SELECT * FROM users WHERE id = ?', [
      (session as unknown as SessionRow).user_id,
    ])[0]
    if (!userRow || !userRow.values[0]) return null
    const ucols = userRow.columns
    const uvals = userRow.values[0]
    const row = {} as Record<string, unknown>
    ucols.forEach((c, i) => (row[c] = uvals[i]))
    return mapAuthUser(this.db, row as unknown as UserRow)
  }

  async getRecoveryQuestion(username: string): Promise<string | null> {
    if (!this.db) return null
    const row = getUserByUsername(this.db, username)
    return row?.recovery_question ?? null
  }

  async resetPasswordWithRecovery(payload: ResetPasswordWithRecoveryPayload): Promise<void> {
    if (!this.db) throw new Error('Auth database not initialized')
    const row = getUserByUsername(this.db, payload.username)
    if (!row) throw new Error('No encontramos ese nombre de usuario.')
    const ok = await verifySecret(
      payload.recoveryAnswer.trim().toLowerCase(),
      row.recovery_answer_hash,
    )
    if (!ok) throw new Error('La respuesta de recuperación es incorrecta.')
    if (typeof payload.newPassword !== 'string' || payload.newPassword.length < 8) {
      throw new Error('La contraseña debe tener mínimo 8 caracteres.')
    }
    const newHash = await hashSecret(payload.newPassword)
    this.db.run(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`, [
      newHash,
      row.id,
    ])
    this.db.run(
      `UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`,
      [row.id],
    )
    await this.persist()
    this.saveSession(null)
  }

  dispose(): void {
    if (this.db) {
      safeClose(this.db)
      this.db = null
    }
  }
}

export const authBridge = new WebAuthBridge()
