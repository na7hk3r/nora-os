/**
 * Profile export/import (Sprint 9).
 *
 * Permite mover el "perfil" de un usuario entre máquinas sin necesidad de
 * exportar la base de datos completa: nombre, objetivo personal, plugins
 * activos, settings y stats básicos de gamificación.
 *
 * Formato:
 *   - Plano: JSON UTF-8 (extension .posprof.json)
 *   - Cifrado: AES-256-GCM con passphrase derivada por scrypt (extension .posprof)
 *     Header: MAGIC ("POS-PRF1") + salt(16) + iv(12) + tag(16) + ciphertext
 *
 * NUNCA exporta password_hash, recovery_*, sesiones, tokens ni el contenido
 * de las tablas de plugins. Es solo el "shell" para reinstalar rápido.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync } from 'fs'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { DatabaseService } from './database'

const CHANNELS = {
  exportPlain: 'profile:export-plain',
  exportEncrypted: 'profile:export-encrypted',
  importPlain: 'profile:import-plain',
  importEncrypted: 'profile:import-encrypted',
} as const

const MAGIC = Buffer.from('POS-PRF1')
const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16
const PROFILE_SCHEMA_VERSION = 1
const GAMIFICATION_SETTINGS_KEY = 'gamificationState'

const ALLOWED_SETTING_KEYS = new Set([
  'theme',
  'sidebarCollapsed',
  'activePlugins',
  'profile.bigGoal',
  GAMIFICATION_SETTINGS_KEY,
])

interface ProfileSnapshot {
  schemaVersion: number
  exportedAt: string
  app: { name: string; ref: string }
  profile: {
    name: string
    height: number
    age: number
    startDate: string
    weightGoal: number
    bigGoal?: string
  } | null
  settings: Record<string, string>
  activePlugins: string[]
  gamification: { totalXp: number; level: number } | null
}

function parseGamificationSetting(value: string | undefined): ProfileSnapshot['gamification'] {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as { points?: unknown; level?: unknown }
    const totalXp = Number(parsed.points ?? 0)
    const level = Number(parsed.level ?? 1)
    return {
      totalXp: Number.isFinite(totalXp) ? Math.max(0, Math.floor(totalXp)) : 0,
      level: Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1,
    }
  } catch {
    return null
  }
}

function buildGamificationSetting(gamification: ProfileSnapshot['gamification']): string | null {
  if (!gamification) return null
  return JSON.stringify({
    points: gamification.totalXp ?? 0,
    level: gamification.level ?? 1,
    streak: 0,
    history: [],
    unlockedIds: [],
  })
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN, { N: 16384, r: 8, p: 1 })
}

function encrypt(payload: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = deriveKey(passphrase, salt)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([MAGIC, salt, iv, tag, encrypted])
}

function decrypt(blob: Buffer, passphrase: string): Buffer {
  if (blob.length < MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error('Archivo de perfil corrupto o demasiado chico')
  }
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('Formato inválido: el archivo no es un perfil cifrado de Nora OS')
  }
  let offset = MAGIC.length
  const salt = blob.subarray(offset, offset + SALT_LEN); offset += SALT_LEN
  const iv = blob.subarray(offset, offset + IV_LEN); offset += IV_LEN
  const tag = blob.subarray(offset, offset + TAG_LEN); offset += TAG_LEN
  const ciphertext = blob.subarray(offset)
  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

async function pickSavePath(defaultName: string): Promise<string | null> {
  const focused = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(focused ?? new BrowserWindow({ show: false }), {
    title: 'Exportar perfil de Nora OS',
    defaultPath: defaultName,
  })
  return result.canceled || !result.filePath ? null : result.filePath
}

async function pickOpenPath(): Promise<string | null> {
  const focused = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(focused ?? new BrowserWindow({ show: false }), {
    title: 'Importar perfil de Nora OS',
    properties: ['openFile'],
  })
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
}

function buildSnapshot(db: DatabaseService): ProfileSnapshot {
  const profileRow = (db.query(
    'SELECT name, height, age, start_date as startDate, weight_goal as weightGoal FROM profile WHERE id = 1',
  ) as Array<{ name: string; height: number; age: number; startDate: string; weightGoal: number }>)[0]

  const settingsRows = db.query('SELECT key, value FROM settings') as Array<{ key: string; value: string }>

  const settings: Record<string, string> = {}
  for (const row of settingsRows) {
    if (ALLOWED_SETTING_KEYS.has(row.key)) {
      settings[row.key] = row.value
    }
  }

  let activePlugins: string[] = []
  if (settings.activePlugins) {
    try {
      const parsed = JSON.parse(settings.activePlugins)
      if (Array.isArray(parsed)) activePlugins = parsed.filter((id) => typeof id === 'string')
    } catch {
      // ignore corrupt settings
    }
  }

  const gamification = parseGamificationSetting(settings[GAMIFICATION_SETTINGS_KEY])

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    // `app.name` legacy: se mantiene como `personal-os` para que snapshots
    // exportados sigan siendo importables en versiones previas de la app.
    // No es el nombre comercial visible (la app se llama Nora OS).
    app: { name: 'personal-os', ref: 'profile-export' },
    profile: profileRow
      ? {
          ...profileRow,
          bigGoal: settings['profile.bigGoal'] || undefined,
        }
      : null,
    settings,
    activePlugins,
    gamification,
  }
}

function applySnapshot(db: DatabaseService, snapshot: ProfileSnapshot): void {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Snapshot inválido')
  }
  if (snapshot.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    throw new Error(`Versión de perfil no soportada: ${snapshot.schemaVersion}`)
  }

  if (snapshot.profile) {
    const p = snapshot.profile
    db.execute(
      `INSERT OR REPLACE INTO profile (id, name, height, age, start_date, weight_goal, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`,
      [p.name ?? '', p.height ?? 0, p.age ?? 0, p.startDate ?? '', p.weightGoal ?? 0],
    )
  }

  if (snapshot.settings) {
    for (const [key, value] of Object.entries(snapshot.settings)) {
      if (ALLOWED_SETTING_KEYS.has(key) && typeof value === 'string') {
        db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
      }
    }
  }

  if (snapshot.profile?.bigGoal) {
    db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('profile.bigGoal', ?)", [
      snapshot.profile.bigGoal,
    ])
  }

  if (snapshot.gamification && !snapshot.settings?.[GAMIFICATION_SETTINGS_KEY]) {
    const value = buildGamificationSetting(snapshot.gamification)
    if (value) {
      db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
        GAMIFICATION_SETTINGS_KEY,
        value,
      ])
    }
  }
}

function parseSnapshot(text: string): ProfileSnapshot {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido')
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('Snapshot inválido')
  const snap = parsed as ProfileSnapshot
  if (snap.app?.name !== 'personal-os') {
    throw new Error('El archivo no parece ser un perfil de Nora OS')
  }
  return snap
}

export interface ProfileImportSummary {
  schemaVersion: number
  exportedAt: string
  hadProfile: boolean
  activePlugins: string[]
}

function summarize(snapshot: ProfileSnapshot): ProfileImportSummary {
  return {
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    hadProfile: Boolean(snapshot.profile),
    activePlugins: snapshot.activePlugins ?? [],
  }
}

export function registerProfileIpc(db: DatabaseService): void {
  ipcMain.handle(CHANNELS.exportPlain, async () => {
    const snapshot = buildSnapshot(db)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = await pickSavePath(`personal-os-profile-${stamp}.posprof.json`)
    if (!dest) return { ok: false, canceled: true }
    writeFileSync(dest, JSON.stringify(snapshot, null, 2), 'utf8')
    return { ok: true, path: dest }
  })

  ipcMain.handle(CHANNELS.exportEncrypted, async (_event, passphrase: unknown) => {
    if (typeof passphrase !== 'string' || passphrase.length < 8) {
      throw new Error('La passphrase debe tener al menos 8 caracteres')
    }
    const snapshot = buildSnapshot(db)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = await pickSavePath(`personal-os-profile-${stamp}.posprof`)
    if (!dest) return { ok: false, canceled: true }
    const blob = encrypt(Buffer.from(JSON.stringify(snapshot), 'utf8'), passphrase)
    writeFileSync(dest, blob)
    return { ok: true, path: dest }
  })

  ipcMain.handle(CHANNELS.importPlain, async () => {
    const src = await pickOpenPath()
    if (!src) return { ok: false, canceled: true }
    const text = readFileSync(src, 'utf8')
    const snapshot = parseSnapshot(text)
    applySnapshot(db, snapshot)
    return { ok: true, summary: summarize(snapshot) }
  })

  ipcMain.handle(CHANNELS.importEncrypted, async (_event, passphrase: unknown) => {
    if (typeof passphrase !== 'string' || passphrase.length < 1) {
      throw new Error('Ingresá la passphrase usada al exportar')
    }
    const src = await pickOpenPath()
    if (!src) return { ok: false, canceled: true }
    const blob = readFileSync(src)
    const plain = decrypt(blob, passphrase)
    const snapshot = parseSnapshot(plain.toString('utf8'))
    applySnapshot(db, snapshot)
    return { ok: true, summary: summarize(snapshot) }
  })
}

export const __testing = {
  buildSnapshot,
  applySnapshot,
  parseGamificationSetting,
}
