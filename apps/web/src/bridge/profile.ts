/**
 * profile.ts — `window.profile` (ProfileBridge) funcional para web.
 *
 * Replica `profile-ipc.ts` de Electron: exporta/importa el "perfil" de un
 * usuario (no la DB completa): nombre/objetivo, settings permitidos, plugins
 * activos y gamificación. Formato POS-PRF1 (scrypt+AES-GCM) para el cifrado.
 *
 * NUNCA exporta password_hash, recovery_*, sesiones ni tablas de plugins.
 */
import type { ProfileBridge, ProfileTransferResult, ProfileImportSummary } from '@core/types'
import { storageBridge } from './storage'
import { encryptElectron, decryptElectron } from '../spike/crypto-electron'
import { downloadBlob, pickFile } from './files'

const SCHEMA_VERSION = 1
const GAMIFICATION_SETTINGS_KEY = 'gamificationState'
const ALLOWED_SETTING_KEYS = new Set<string>([
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

const stamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

async function q<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await storageBridge.query(sql, params)) as T[]
}

async function e(sql: string, params: unknown[] = []): Promise<void> {
  await storageBridge.execute(sql, params)
}

function parseGamification(value: string | undefined): ProfileSnapshot['gamification'] {
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

async function buildSnapshot(): Promise<ProfileSnapshot> {
  const profileRows = await q<{
    name: string
    height: number
    age: number
    startDate: string
    weightGoal: number
  }>(
    'SELECT name, height, age, start_date as startDate, weight_goal as weightGoal FROM profile WHERE id = 1',
  )
  const settingsRows = await q<{ key: string; value: string }>('SELECT key, value FROM settings')
  const settings: Record<string, string> = {}
  for (const row of settingsRows) {
    if (ALLOWED_SETTING_KEYS.has(row.key)) settings[row.key] = row.value
  }
  let activePlugins: string[] = []
  if (settings.activePlugins) {
    try {
      const parsed = JSON.parse(settings.activePlugins)
      if (Array.isArray(parsed)) activePlugins = parsed.filter((p) => typeof p === 'string')
    } catch {
      /* ignore */
    }
  }
  const profileRow = profileRows[0]
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    app: { name: 'personal-os', ref: 'profile-export' },
    profile: profileRow
      ? { ...profileRow, bigGoal: settings['profile.bigGoal'] || undefined }
      : null,
    settings,
    activePlugins,
    gamification: parseGamification(settings[GAMIFICATION_SETTINGS_KEY]),
  }
}

async function applySnapshot(snapshot: ProfileSnapshot): Promise<void> {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Snapshot inválido')
  if (snapshot.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Versión de perfil no soportada: ${snapshot.schemaVersion}`)
  }
  if (snapshot.profile) {
    const p = snapshot.profile
    await e(
      `INSERT OR REPLACE INTO profile (id, name, height, age, start_date, weight_goal, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`,
      [p.name ?? '', p.height ?? 0, p.age ?? 0, p.startDate ?? '', p.weightGoal ?? 0],
    )
  }
  if (snapshot.settings) {
    for (const [key, value] of Object.entries(snapshot.settings)) {
      if (ALLOWED_SETTING_KEYS.has(key) && typeof value === 'string') {
        await e('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value])
      }
    }
  }
  if (snapshot.profile?.bigGoal) {
    await e("INSERT OR REPLACE INTO settings (key, value) VALUES ('profile.bigGoal', ?)", [
      snapshot.profile.bigGoal,
    ])
  }
  if (snapshot.gamification && !snapshot.settings?.[GAMIFICATION_SETTINGS_KEY]) {
    await e('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
      GAMIFICATION_SETTINGS_KEY,
      JSON.stringify({
        points: snapshot.gamification.totalXp ?? 0,
        level: snapshot.gamification.level ?? 1,
        streak: 0,
        history: [],
        unlockedIds: [],
      }),
    ])
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
  if (snap.app?.name !== 'personal-os')
    throw new Error('El archivo no parece ser un perfil de Nora OS')
  return snap
}

function summarize(snapshot: ProfileSnapshot): ProfileImportSummary {
  return {
    schemaVersion: snapshot.schemaVersion,
    exportedAt: snapshot.exportedAt,
    hadProfile: Boolean(snapshot.profile),
    activePlugins: snapshot.activePlugins ?? [],
  }
}

export const __testing = {
  buildSnapshot,
  applySnapshot,
  parseGamification,
}

export const profileBridge: ProfileBridge = {
  async exportPlain(): Promise<ProfileTransferResult> {
    const snapshot = await buildSnapshot()
    downloadBlob(
      `nora-profile-${stamp()}.posprof.json`,
      JSON.stringify(snapshot, null, 2),
      'application/json',
    )
    return { ok: true }
  },

  async exportEncrypted(passphrase: string): Promise<ProfileTransferResult> {
    if (typeof passphrase !== 'string' || passphrase.length < 8) {
      throw new Error('La passphrase debe tener al menos 8 caracteres')
    }
    const snapshot = await buildSnapshot()
    const bytes = new TextEncoder().encode(JSON.stringify(snapshot))
    const blob = await encryptElectron('profile', bytes, passphrase)
    downloadBlob(`nora-profile-${stamp()}.posprof`, new Blob([blob as unknown as BlobPart]))
    return { ok: true }
  },

  async importPlain(): Promise<ProfileTransferResult> {
    const file = await pickFile('.posprof.json,application/json')
    if (!file) return { ok: false, canceled: true }
    const snapshot = parseSnapshot(new TextDecoder().decode(file.bytes))
    await applySnapshot(snapshot)
    return { ok: true, summary: summarize(snapshot) }
  },

  async importEncrypted(passphrase: string): Promise<ProfileTransferResult> {
    const file = await pickFile('.posprof,.enc')
    if (!file) return { ok: false, canceled: true }
    const { plaintext } = await decryptElectron(file.bytes, passphrase)
    const snapshot = parseSnapshot(new TextDecoder().decode(plaintext))
    await applySnapshot(snapshot)
    return { ok: true, summary: summarize(snapshot) }
  },
}
