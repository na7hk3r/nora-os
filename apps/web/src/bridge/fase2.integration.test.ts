/**
 * Tests de Fase 2: bridges funcionales (dbEncryption, backup/profile internos)
 * sobre el backend de memoria.
 *
 * - dbEncryption: enable → locked → unlock → disable, con datos intactos.
 * - storage exportBytes/importBytes: round-trip de la DB del usuario.
 * - profile (buildSnapshot/applySnapshot): exportación y re-aplicación.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { setPersistence, MemoryBackend } from '../spike/sqlite-web'
import { authBridge } from './auth'
import { storageBridge } from './storage'
import { dbEncryptionBridge } from './db-encryption'
import { __testing as profileTesting } from './profile'

beforeAll(async () => {
  setPersistence(new MemoryBackend())
  await authBridge.init()
})

async function seedUser(username: string): Promise<string> {
  const user = await authBridge.register({
    username,
    password: 'password-123',
    recoveryQuestion: 'q',
    recoveryAnswer: 'respuesta',
  })
  await storageBridge.setActiveUser(user.id)
  await storageBridge.execute(`INSERT INTO settings (key, value) VALUES (?, ?)`, ['theme', 'dark'])
  return user.id
}

describe('dbEncryptionBridge (cifrado en reposo web)', () => {
  it('enable bloquea (locked) y unlock restaura los datos', async () => {
    await seedUser('crypto_user')
    let status = await dbEncryptionBridge.status()
    expect(status.enabled).toBe(false)

    const en = await dbEncryptionBridge.enable('passphrase-fuerte-123!')
    expect(en.ok).toBe(true)
    status = await dbEncryptionBridge.status()
    expect(status.enabled).toBe(true)
    expect(status.hasEncryptedAtRest).toBe(true)
    expect(status.locked).toBe(true)

    // Passphrase incorrecta → falla el unlock y sigue locked.
    const bad = await dbEncryptionBridge.unlock('passphrase-incorrecta')
    expect(bad.ok).toBe(false)
    expect(bad.code).toBe('BAD_PASSPHRASE')

    const ok = await dbEncryptionBridge.unlock('passphrase-fuerte-123!')
    expect(ok.ok).toBe(true)
    status = await dbEncryptionBridge.status()
    expect(status.locked).toBe(false)

    // Los datos siguen intactos tras el ciclo.
    const rows = (await storageBridge.query(`SELECT value FROM settings WHERE key = ?`, [
      'theme',
    ])) as Array<{ value: string }>
    expect(rows[0].value).toBe('dark')
  })

  it('disable desactiva el cifrado', async () => {
    const dis = await dbEncryptionBridge.disable()
    expect(dis.ok).toBe(true)
    const status = await dbEncryptionBridge.status()
    expect(status.enabled).toBe(false)
    expect(status.hasEncryptedAtRest).toBe(false)
    expect(status.locked).toBe(false)
  })

  it('rechaza passphrase débil al habilitar', async () => {
    const res = await dbEncryptionBridge.enable('corta')
    expect(res.ok).toBe(false)
    expect(res.code).toBe('WEAK_PASSPHRASE')
  })
})

describe('storage exportBytes / importBytes (backup de DB)', () => {
  it('exporta y re-importa la DB sin pérdida', async () => {
    const userId = await seedUser('export_user')
    storageBridge.setActiveUser(userId)
    const bytes = await storageBridge.exportBytes()
    expect(bytes.length).toBeGreaterThan(0)

    // "Restaurar" desde esos bytes en la misma DB.
    await storageBridge.importBytes(bytes)
    const rows = (await storageBridge.query(`SELECT value FROM settings WHERE key = ?`, [
      'theme',
    ])) as Array<{ value: string }>
    expect(rows.length).toBe(1)
    expect(rows[0].value).toBe('dark')
  })
})

describe('profile (buildSnapshot / applySnapshot)', () => {
  it('exporta el perfil y lo aplica a otro usuario', async () => {
    await authBridge.logout()
    await seedUser('profile_origin')
    // Preparar datos de perfil.
    await storageBridge.execute(
      `INSERT OR REPLACE INTO profile (id, name, height, age, start_date, weight_goal) VALUES (1, 'Ada', 165, 30, '2020-01-01', 70)`,
    )
    await storageBridge.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('profile.bigGoal', 'Maratón')`,
    )
    await storageBridge.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('gamificationState', '{"points":120,"level":5}')`,
    )
    await storageBridge.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('activePlugins', '["work","fitness"]')`,
    )

    const snapshot = await profileTesting.buildSnapshot()
    expect(snapshot.profile?.name).toBe('Ada')
    expect(snapshot.profile?.bigGoal).toBe('Maratón')
    expect(snapshot.gamification?.totalXp).toBe(120)
    expect(snapshot.gamification?.level).toBe(5)
    expect(snapshot.activePlugins).toEqual(['work', 'fitness'])

    // Aplicarlo a un usuario distinto (vacío).
    await authBridge.logout()
    await seedUser('profile_target')
    await profileTesting.applySnapshot(snapshot)
    const rows = (await storageBridge.query(`SELECT value FROM settings WHERE key = ?`, [
      'profile.bigGoal',
    ])) as Array<{ value: string }>
    expect(rows[0].value).toBe('Maratón')
    const name = (await storageBridge.query('SELECT name FROM profile WHERE id = 1')) as Array<{
      name: string
    }>
    expect(name[0].name).toBe('Ada')
  })
})
