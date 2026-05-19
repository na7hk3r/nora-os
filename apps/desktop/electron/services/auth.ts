import { randomBytes, scryptSync, timingSafeEqual, randomUUID } from 'crypto'
import { DatabaseService } from './database'

export interface AuthUser {
  id: string
  username: string
  createdAt: string
  lastLoginAt: string | null
}

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

function assertUsername(username: string): void {
  if (!username.trim()) {
    throw new Error('El nombre de usuario no puede estar vacío.')
  }
  if (username.length < 3) {
    throw new Error('El nombre de usuario debe tener al menos 3 caracteres.')
  }
  if (username.length > 32) {
    throw new Error('El nombre de usuario no puede exceder 32 caracteres.')
  }
  if (!/^[a-z0-9._-]+$/i.test(username)) {
    throw new Error('El nombre de usuario solo puede contener letras, números, puntos, guiones y guiones bajos.')
  }
}

function assertPassword(password: string): void {
  if (!password) {
    throw new Error('La contraseña no puede estar vacía.')
  }
  if (password.length < 8) {
    throw new Error('La contraseña debe tener mínimo 8 caracteres.')
  }
}

function assertRecoveryQuestion(question: string): void {
  const trimmed = question.trim()
  if (!trimmed) {
    throw new Error('La pregunta de recuperación no puede estar vacía.')
  }
  if (trimmed.length < 10) {
    throw new Error('La pregunta de recuperación debe tener mínimo 10 caracteres.')
  }
}

function assertRecoveryAnswer(answer: string): void {
  const trimmed = answer.trim()
  if (!trimmed) {
    throw new Error('La respuesta de recuperación no puede estar vacía.')
  }
  if (trimmed.length < 2) {
    throw new Error('La respuesta de recuperación debe tener mínimo 2 caracteres.')
  }
}

function hashSecret(secret: string): string {
  const salt = randomBytes(16)
  const digest = scryptSync(secret, salt, 64)
  return `${salt.toString('hex')}:${digest.toString('hex')}`
}

function verifySecret(secret: string, encodedHash: string): boolean {
  const [saltHex, digestHex] = encodedHash.split(':')
  if (!saltHex || !digestHex) {
    return false
  }

  const computed = scryptSync(secret, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(digestHex, 'hex')
  if (computed.length !== expected.length) {
    return false
  }

  return timingSafeEqual(computed, expected)
}

function mapAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }
}

export class AuthService {
  private currentUser: AuthUser | null = null
  private currentSessionId: string | null = null

  constructor(private readonly db: DatabaseService) {}

  private getUserByUsername(username: string): UserRow | null {
    const rows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [normalizeUsername(username)],
    ) as UserRow[]

    return rows[0] ?? null
  }

  private activateSession(user: AuthUser): void {
    this.currentUser = user
    this.db.setActiveUser(user.id)
  }

  private createSession(userId: string): void {
    this.db.authExecute(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE revoked_at IS NULL`,
      [],
    )

    const sessionId = randomUUID()
    this.db.authExecute(
      `INSERT INTO sessions (id, user_id, created_at, last_seen_at)
       VALUES (?, ?, datetime('now'), datetime('now'))`,
      [sessionId, userId],
    )

    this.currentSessionId = sessionId
  }

  private touchSession(sessionId: string): void {
    this.db.authExecute(
      `UPDATE sessions
       SET last_seen_at = datetime('now')
       WHERE id = ?`,
      [sessionId],
    )
  }

  async register(params: {
    username: string
    password: string
    recoveryQuestion: string
    recoveryAnswer: string
  }): Promise<AuthUser> {
    const username = normalizeUsername(params.username)
    assertUsername(username)
    assertPassword(params.password)
    assertRecoveryQuestion(params.recoveryQuestion)
    assertRecoveryAnswer(params.recoveryAnswer)

    const existing = this.getUserByUsername(username)
    if (existing) {
      throw new Error('Este nombre de usuario ya está en uso. Elige otro.')
    }

    const usersCountRows = this.db.authQuery('SELECT COUNT(*) as count FROM users') as Array<{ count: number }>
    const isFirstUser = (usersCountRows[0]?.count ?? 0) === 0

    const userId = randomUUID()
    this.db.authExecute(
      `INSERT INTO users (
        id,
        username,
        password_hash,
        recovery_question,
        recovery_answer_hash,
        created_at,
        updated_at,
        last_login_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
      [
        userId,
        username,
        hashSecret(params.password),
        params.recoveryQuestion.trim(),
        hashSecret(params.recoveryAnswer.trim().toLowerCase()),
      ],
    )

    if (isFirstUser && this.db.hasLegacySingleUserDb()) {
      this.db.claimLegacyDbForUser(userId)
    }

    const userRows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId],
    ) as UserRow[]

    const row = userRows[0]
    if (!row) {
      throw new Error('No se pudo completar el registro. Intenta de nuevo.')
    }

    const user = mapAuthUser(row)
    this.createSession(user.id)
    this.activateSession(user)
    return user
  }

  async login(username: string, password: string): Promise<AuthUser> {
    const userRow = this.getUserByUsername(username)
    if (!userRow || !verifySecret(password, userRow.password_hash)) {
      throw new Error('El nombre de usuario o contraseña es incorrecto.')
    }

    this.db.authExecute(
      `UPDATE users
       SET last_login_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`,
      [userRow.id],
    )

    const updatedRow = {
      ...userRow,
      last_login_at: new Date().toISOString(),
    }

    const user = mapAuthUser(updatedRow)
    this.createSession(user.id)
    this.activateSession(user)
    return user
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (this.currentUser && this.currentSessionId) {
      this.touchSession(this.currentSessionId)
      return this.currentUser
    }

    const sessionRows = this.db.authQuery(
      `SELECT id, user_id
       FROM sessions
       WHERE revoked_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [],
    ) as SessionRow[]

    const session = sessionRows[0]
    if (!session) {
      return null
    }

    const userRows = this.db.authQuery(
      `SELECT id, username, password_hash, recovery_question, recovery_answer_hash, created_at, last_login_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [session.user_id],
    ) as UserRow[]

    const userRow = userRows[0]
    if (!userRow) {
      return null
    }

    this.currentSessionId = session.id
    const user = mapAuthUser(userRow)
    this.activateSession(user)
    this.touchSession(session.id)
    return user
  }

  async logout(): Promise<void> {
    if (this.currentSessionId) {
      this.db.authExecute(
        `UPDATE sessions
         SET revoked_at = datetime('now')
         WHERE id = ?`,
        [this.currentSessionId],
      )
    }

    this.currentSessionId = null
    this.currentUser = null
    this.db.clearActiveUser()
  }

  async getRecoveryQuestion(username: string): Promise<string | null> {
    const user = this.getUserByUsername(username)
    return user?.recovery_question ?? null
  }

  async resetPasswordWithRecovery(params: {
    username: string
    recoveryAnswer: string
    newPassword: string
  }): Promise<void> {
    assertPassword(params.newPassword)
    assertRecoveryAnswer(params.recoveryAnswer)

    const user = this.getUserByUsername(params.username)
    if (!user) {
      throw new Error('No encontramos ese nombre de usuario. Verifica e intenta de nuevo.')
    }

    const answerOk = verifySecret(params.recoveryAnswer.trim().toLowerCase(), user.recovery_answer_hash)
    if (!answerOk) {
      throw new Error('La respuesta de recuperación es incorrecta. Intenta de nuevo.')
    }

    this.db.authExecute(
      `UPDATE users
       SET password_hash = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [hashSecret(params.newPassword), user.id],
    )

    this.db.authExecute(
      `UPDATE sessions
       SET revoked_at = datetime('now')
       WHERE user_id = ? AND revoked_at IS NULL`,
      [user.id],
    )

    if (this.currentUser?.id === user.id) {
      this.currentSessionId = null
      this.currentUser = null
      this.db.clearActiveUser()
    }
  }
}
