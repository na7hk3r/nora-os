/**
 * Tests de integración del arranque web (Fase 1).
 *
 * Ejecutan en Node (env node) con `defaultPersistence` = memoria, simulando el
 * flujo real del boot: init de bridges → registro → login → selección de la DB
 * de usuario → operaciones de storage del renderer (write + query).
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { setPersistence, MemoryBackend } from '../spike/sqlite-web'
import { authBridge } from '../bridge/auth'
import { storageBridge } from '../bridge/storage'

beforeAll(() => {
  // Aislar: backend de memoria, sin tocar IndexedDB.
  setPersistence(new MemoryBackend())
})

describe('boot: bridges de auth y storage', () => {
  it('registra un usuario y abre su DB de storage', async () => {
    await authBridge.init()
    const user = await authBridge.register({
      username: 'Ada',
      password: 'password-123',
      recoveryQuestion: '¿Ciudad?',
      recoveryAnswer: 'Londres',
    })
    expect(user.username).toBe('ada')
    expect(user.id).toBeTruthy()

    // El login en el renderer dispara el switch de DB del usuario.
    await storageBridge.setActiveUser(user.id)

    await storageBridge.execute(`INSERT INTO settings (key, value) VALUES (?, ?)`, [
      'theme',
      'dark',
    ])
    const rows = (await storageBridge.query(`SELECT key, value FROM settings WHERE key = ?`, [
      'theme',
    ])) as Array<{ key: string; value: string }>
    expect(rows[0].value).toBe('dark')
  })

  it('login/me recuerda la sesión y el usuario activo', async () => {
    const user = await authBridge.login('ada', 'password-123')
    expect(user.username).toBe('ada')

    const me = await authBridge.me()
    expect(me?.username).toBe('ada')
  })

  it('permite escritura por usuario aislada', async () => {
    // Un segundo usuario con su propia DB no ve datos del primero.
    await authBridge.logout()
    const b = await authBridge.register({
      username: 'Grace',
      password: 'password-456',
      recoveryQuestion: '¿Color?',
      recoveryAnswer: 'Azul',
    })
    await storageBridge.setActiveUser(b.id)

    const rows = (await storageBridge.query('SELECT * FROM settings')) as unknown[]
    expect(rows.length).toBe(0)
  })
})
