/**
 * Tests críticos para AuthService (registro, login, sesión, recovery).
 * Usa un fake de DatabaseService en memoria que replica el enrutado SQL
 * que AuthService emite (tablas `users` y `sessions`).
 */
import { randomBytes, scryptSync } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { AuthService } from '../../electron/services/auth'
import type { DatabaseService } from '../../electron/services/database'

interface FakeUserRow {
  id: string
  username: string
  password_hash: string
  recovery_question: string
  recovery_answer_hash: string
  created_at: string
  last_login_at: string | null
}

interface FakeSessionRow {
  id: string
  user_id: string
  created_at: string
  revoked_at: string | null
  last_seen_at: string | null
}

class FakeAuthDb {
  users: FakeUserRow[] = []
  sessions: FakeSessionRow[] = []
  activeUserId: string | null = null
  legacySingleUser = false
  dropNextInsertedUser = false
  countResult: Array<{ count?: number }> | null = null
  claimedUserIds: string[] = []

  authQuery(sql: string, params: unknown[] = []): unknown[] {
    if (sql.includes('COUNT(*)')) {
      return this.countResult ?? [{ count: this.users.length }]
    }
    if (sql.includes('FROM sessions')) {
      return this.sessions
        .filter((s) => s.revoked_at === null)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 1)
    }
    if (sql.includes('FROM users') && sql.includes('WHERE username = ?')) {
      const row = this.users.find((u) => u.username === params[0])
      return row ? [row] : []
    }
    if (sql.includes('FROM users') && sql.includes('WHERE id = ?')) {
      const row = this.users.find((u) => u.id === params[0])
      return row ? [row] : []
    }
    return []
  }

  authExecute(sql: string, params: unknown[] = []): { changes: number; lastInsertRowid: number } {
    if (sql.includes('INSERT INTO sessions')) {
      this.sessions.push({
        id: String(params[0]),
        user_id: String(params[1]),
        created_at: new Date().toISOString(),
        revoked_at: null,
        last_seen_at: new Date().toISOString(),
      })
    } else if (sql.includes('INSERT INTO users')) {
      if (!this.dropNextInsertedUser) {
        this.users.push({
          id: String(params[0]),
          username: String(params[1]),
          password_hash: String(params[2]),
          recovery_question: String(params[3]),
          recovery_answer_hash: String(params[4]),
          created_at: new Date().toISOString(),
          last_login_at: new Date().toISOString(),
        })
      }
    } else if (sql.includes('UPDATE users') && sql.includes('SET last_login_at')) {
      const user = this.users.find((u) => u.id === String(params[0]))
      if (user) user.last_login_at = new Date().toISOString()
    } else if (sql.includes('UPDATE users') && sql.includes('SET password_hash')) {
      const user = this.users.find((u) => u.id === String(params[1]))
      if (user) user.password_hash = String(params[0])
    } else if (sql.includes('UPDATE sessions') && sql.includes('SET last_seen_at')) {
      const session = this.sessions.find((s) => s.id === String(params[0]))
      if (session) session.last_seen_at = new Date().toISOString()
    } else if (sql.includes('UPDATE sessions') && sql.includes('WHERE id = ?')) {
      const session = this.sessions.find((s) => s.id === String(params[0]))
      if (session) session.revoked_at = new Date().toISOString()
    } else if (sql.includes('UPDATE sessions') && sql.includes('WHERE user_id = ?')) {
      for (const s of this.sessions) {
        if (s.user_id === String(params[0]) && s.revoked_at === null) {
          s.revoked_at = new Date().toISOString()
        }
      }
    } else if (sql.includes('UPDATE sessions')) {
      for (const s of this.sessions) {
        if (s.revoked_at === null) s.revoked_at = new Date().toISOString()
      }
    }
    return { changes: 1, lastInsertRowid: 1 }
  }

  setActiveUser(id: string): void {
    this.activeUserId = id
  }

  clearActiveUser(): void {
    this.activeUserId = null
  }

  hasLegacySingleUserDb(): boolean {
    return this.legacySingleUser
  }

  claimLegacyDbForUser(id: string): void {
    this.claimedUserIds.push(id)
  }
}

/** Reproduce el formato `salt:digest` que AuthService usa internamente. */
function makeHash(secret: string): string {
  const salt = randomBytes(16)
  const digest = scryptSync(secret, salt, 64)
  return `${salt.toString('hex')}:${digest.toString('hex')}`
}

function seedUser(db: FakeAuthDb, username: string, passwordHash: string): string {
  const id = `u-seed-${db.users.length + 1}`
  db.users.push({
    id,
    username,
    password_hash: passwordHash,
    recovery_question: '¿Pregunta de seed?',
    recovery_answer_hash: 'irrelevante',
    created_at: new Date().toISOString(),
    last_login_at: null,
  })
  return id
}

const REGISTER = {
  username: 'AdaLovelace',
  password: 'password-segura-1',
  recoveryQuestion: '¿Cuál es el nombre de tu primera mascota?',
  recoveryAnswer: 'Tommy',
}

describe('AuthService', () => {
  it('register crea un usuario con username normalizado y sesión activa', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)

    const user = await service.register({ ...REGISTER, username: '  Ada.Love_lace-7  ' })

    expect(user.username).toBe('ada.love_lace-7')
    expect(user.id).toBeTruthy()
    expect(user.lastLoginAt).not.toBeNull()
    expect(db.sessions).toHaveLength(1)
    expect(db.sessions[0].revoked_at).toBeNull()
    expect(db.activeUserId).toBe(user.id)
    expect(db.claimedUserIds).toEqual([])
  })

  it('register reclama la DB legacy single-user cuando es el primer usuario', async () => {
    const db = new FakeAuthDb()
    db.legacySingleUser = true
    const service = new AuthService(db as unknown as DatabaseService)

    const user = await service.register(REGISTER)

    expect(db.claimedUserIds).toEqual([user.id])
    expect(db.activeUserId).toBe(user.id)
  })

  it('register trata un conteo ausente como primer usuario (defensivo)', async () => {
    const db = new FakeAuthDb()
    db.countResult = [{ count: undefined }]
    const service = new AuthService(db as unknown as DatabaseService)

    const user = await service.register(REGISTER)

    expect(user.username).toBe('adalovelace')
    expect(db.claimedUserIds).toEqual([])
  })

  it('register rechaza un usuario ya existente (mismo username normalizado)', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register({ ...REGISTER, username: 'Ada.Love_lace-7' })

    await expect(
      service.register({ ...REGISTER, username: 'ada.love_lace-7' }),
    ).rejects.toThrow('Este nombre de usuario ya está en uso')
  })

  it('register valida username, password y preguntas de recovery', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(service.register({ ...REGISTER, username: '   ' })).rejects.toThrow(
      'no puede estar vacío',
    )
    await expect(service.register({ ...REGISTER, username: 'ab' })).rejects.toThrow(
      'al menos 3 caracteres',
    )
    await expect(service.register({ ...REGISTER, username: 'a'.repeat(33) })).rejects.toThrow(
      'no puede exceder 32 caracteres',
    )
    await expect(service.register({ ...REGISTER, username: 'upper$' })).rejects.toThrow(
      'solo puede contener letras, números, puntos, guiones y guiones bajos',
    )
    await expect(service.register({ ...REGISTER, password: '' })).rejects.toThrow(
      'no puede estar vacía',
    )
    await expect(service.register({ ...REGISTER, password: '1234567' })).rejects.toThrow(
      'mínimo 8 caracteres',
    )
    await expect(service.register({ ...REGISTER, recoveryQuestion: '  ' })).rejects.toThrow(
      'no puede estar vacía',
    )
    await expect(service.register({ ...REGISTER, recoveryQuestion: 'muy corta' })).rejects.toThrow(
      'mínimo 10 caracteres',
    )
    await expect(service.register({ ...REGISTER, recoveryAnswer: ' ' })).rejects.toThrow(
      'no puede estar vacía',
    )
    await expect(service.register({ ...REGISTER, recoveryAnswer: 'a' })).rejects.toThrow(
      'mínimo 2 caracteres',
    )
  })

  it('register lanza error si la fila insertada no puede releerse', async () => {
    const db = new FakeAuthDb()
    db.dropNextInsertedUser = true
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(service.register(REGISTER)).rejects.toThrow('No se pudo completar el registro')
  })

  it('login valida credenciales, revoca la sesión previa y crea una nueva', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    const created = await service.register(REGISTER)
    const firstSessionId = db.sessions[0]?.id

    const user = await service.login(REGISTER.username, REGISTER.password)

    expect(user.id).toBe(created.id)
    expect(db.sessions).toHaveLength(2)
    expect(db.sessions[0]?.id).toBe(firstSessionId)
    expect(db.sessions[0]?.revoked_at).not.toBeNull()
    expect(db.sessions[1]?.revoked_at).toBeNull()
    expect(db.activeUserId).toBe(created.id)
    expect(user.lastLoginAt).not.toBeNull()
  })

  it('login rechaza un usuario desconocido', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(service.login('nadienoporte', 'password-segura-1')).rejects.toThrow(
      'El nombre de usuario o contraseña es incorrecto',
    )
  })

  it('login rechaza una contraseña incorrecta', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register(REGISTER)

    await expect(service.login(REGISTER.username, 'password-incorrecta')).rejects.toThrow(
      'El nombre de usuario o contraseña es incorrecto',
    )
  })

  it('login rechaza un hash almacenado sin el separador salt:digest', async () => {
    const db = new FakeAuthDb()
    seedUser(db, 'malformed', 'no-es-un-hash-valido')
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(service.login('malformed', 'password-segura-1')).rejects.toThrow('incorrecto')
  })

  it('login rechaza un hash con digest de longitud incorrecta', async () => {
    const db = new FakeAuthDb()
    seedUser(db, 'shortdigest', `${'a'.repeat(32)}:bb`) // digest de 1 byte vs 64 esperados
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(service.login('shortdigest', 'password-segura-1')).rejects.toThrow('incorrecto')
  })

  it('getCurrentUser devuelve el usuario en memoria y toca la sesión', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    const created = await service.register(REGISTER)
    const executeSpy = vi.spyOn(db, 'authExecute')

    const current = await service.getCurrentUser()

    expect(current?.id).toBe(created.id)
    expect(executeSpy.mock.calls.some(([sql]) => sql.includes('SET last_seen_at'))).toBe(true)
  })

  it('getCurrentUser restaura la sesión persistida cuando no hay estado en memoria', async () => {
    const db = new FakeAuthDb()
    const userId = seedUser(db, 'ada', makeHash('password-segura-1'))
    db.sessions.push({
      id: 's1',
      user_id: userId,
      created_at: new Date().toISOString(),
      revoked_at: null,
      last_seen_at: null,
    })
    const service = new AuthService(db as unknown as DatabaseService)

    const current = await service.getCurrentUser()

    expect(current?.username).toBe('ada')
    expect(current?.id).toBe(userId)
    expect(db.activeUserId).toBe(userId)
  })

  it('getCurrentUser devuelve null cuando no hay sesión activa', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)

    expect(await service.getCurrentUser()).toBeNull()
  })

  it('getCurrentUser devuelve null cuando la sesión referencia un usuario inexistente', async () => {
    const db = new FakeAuthDb()
    db.sessions.push({
      id: 's-ghost',
      user_id: 'usuario-inexistente',
      created_at: new Date().toISOString(),
      revoked_at: null,
      last_seen_at: null,
    })
    const service = new AuthService(db as unknown as DatabaseService)

    expect(await service.getCurrentUser()).toBeNull()
  })

  it('logout revoca la sesión activa y limpia el estado', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register(REGISTER)
    const clearSpy = vi.spyOn(db, 'clearActiveUser')

    await service.logout()

    expect(db.sessions[0]?.revoked_at).not.toBeNull()
    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(db.activeUserId).toBeNull()
    expect(await service.getCurrentUser()).toBeNull()
  })

  it('logout sin sesión activa es un no-op', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    const clearSpy = vi.spyOn(db, 'clearActiveUser')

    await service.logout()

    expect(clearSpy).toHaveBeenCalledTimes(1)
    expect(db.sessions).toHaveLength(0)
  })

  it('getRecoveryQuestion devuelve la pregunta del usuario o null', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register(REGISTER)

    expect(await service.getRecoveryQuestion(REGISTER.username)).toBe(REGISTER.recoveryQuestion)
    expect(await service.getRecoveryQuestion('nadie')).toBeNull()
  })

  it('resetPasswordWithRecovery valida password y respuesta antes de buscar al usuario', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(
      service.resetPasswordWithRecovery({
        username: 'nadie',
        recoveryAnswer: 'Tommy',
        newPassword: '123',
      }),
    ).rejects.toThrow('mínimo 8 caracteres')

    await expect(
      service.resetPasswordWithRecovery({
        username: 'nadie',
        recoveryAnswer: 'x',
        newPassword: 'nueva-password-1',
      }),
    ).rejects.toThrow('mínimo 2 caracteres')
  })

  it('resetPasswordWithRecovery rechaza un usuario inexistente', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)

    await expect(
      service.resetPasswordWithRecovery({
        username: 'nadie',
        recoveryAnswer: 'Tommy',
        newPassword: 'nueva-password-1',
      }),
    ).rejects.toThrow('No encontramos ese nombre de usuario')
  })

  it('resetPasswordWithRecovery rechaza una respuesta incorrecta', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register(REGISTER)

    await expect(
      service.resetPasswordWithRecovery({
        username: REGISTER.username,
        recoveryAnswer: 'Respuesta incorrecta',
        newPassword: 'nueva-password-1',
      }),
    ).rejects.toThrow('La respuesta de recuperación es incorrecta')
  })

  it('resetPasswordWithRecovery cambia la password y revoca las sesiones', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    const created = await service.register(REGISTER)
    await service.logout()

    await service.resetPasswordWithRecovery({
      username: REGISTER.username,
      recoveryAnswer: REGISTER.recoveryAnswer,
      newPassword: 'nueva-password-1',
    })

    expect(db.sessions.every((s) => s.revoked_at !== null)).toBe(true)
    await expect(service.login(REGISTER.username, REGISTER.password)).rejects.toThrow('incorrecto')
    await expect(service.login(REGISTER.username, 'nueva-password-1')).resolves.toMatchObject({
      id: created.id,
    })
  })

  it('resetPasswordWithRecovery limpia la sesión en memoria cuando es el usuario actual', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register(REGISTER)

    await service.resetPasswordWithRecovery({
      username: REGISTER.username,
      recoveryAnswer: REGISTER.recoveryAnswer,
      newPassword: 'nueva-password-1',
    })

    expect(db.activeUserId).toBeNull()
    expect(await service.getCurrentUser()).toBeNull()
  })

  it('resetPasswordWithRecovery no toca la sesión de otro usuario activo', async () => {
    const db = new FakeAuthDb()
    const service = new AuthService(db as unknown as DatabaseService)
    await service.register(REGISTER)
    await service.register({
      ...REGISTER,
      username: 'OtraPersona',
      recoveryQuestion: '¿Cuál es tu ciudad natal?',
      recoveryAnswer: 'Londres',
    })

    await service.resetPasswordWithRecovery({
      username: REGISTER.username,
      recoveryAnswer: REGISTER.recoveryAnswer,
      newPassword: 'nueva-password-1',
    })

    const current = await service.getCurrentUser()
    expect(current?.username).toBe('otrapersona')
    expect(db.activeUserId).not.toBeNull()
  })
})