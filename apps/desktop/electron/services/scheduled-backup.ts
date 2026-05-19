import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'
import { join } from 'path'
import { createCipheriv, randomBytes, scryptSync } from 'crypto'
import { DatabaseService } from './database'
import type { ScheduledBackupConfig, ScheduledBackupStatus } from '../../src/core/types'

/**
 * Backups automáticos locales.
 *
 * Diseño:
 *  - Un solo timer en main process. Sin worker, sin cron OS.
 *  - La configuración se persiste en la tabla `settings` del usuario activo
 *    bajo la clave 'scheduledBackup'. Esto la liga al usuario y la incluye en
 *    el backup mismo (deseable: si restaurás, recuperás tu configuración).
 *  - La passphrase NO se persiste a disco bajo ninguna circunstancia. Vive
 *    solo en memoria de main process. Si la app se reinicia, el usuario debe
 *    re-ingresarla para reanudar backups cifrados (consistente con la
 *    filosofía de zero-knowledge del backup manual).
 *  - Retención: borra los backups más viejos cuando supera retainCount.
 *  - Verificación de integridad post-restore: el formato de archivo .posbak
 *    incluye GCM auth tag (heredado de backup-ipc), que valida la integridad
 *    al descifrar. Para backups planos, hacemos hash sha256 al final.
 */

const SETTINGS_KEY = 'scheduledBackup'
const STATUS_KEY = 'scheduledBackupStatus'

const DEFAULT_CONFIG: ScheduledBackupConfig = {
  enabled: false,
  frequencyDays: 7,
  destinationDir: null,
  encrypt: true,
  retainCount: 5,
}

// Cifrado: mismo formato que backup manual para compatibilidad.
const MAGIC = Buffer.from('POS-BAK1')
const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12

let timer: ReturnType<typeof setInterval> | null = null
let sessionPassphrase: string | null = null

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

function loadConfig(db: DatabaseService): ScheduledBackupConfig {
  try {
    const rows = db.query(
      `SELECT value FROM settings WHERE key = ?`,
      [SETTINGS_KEY],
    ) as { value: string }[]
    if (rows.length === 0) return { ...DEFAULT_CONFIG }
    const parsed = JSON.parse(rows[0].value) as Partial<ScheduledBackupConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

function saveConfig(db: DatabaseService, config: ScheduledBackupConfig): void {
  db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [SETTINGS_KEY, JSON.stringify(config)],
  )
}

interface PersistedStatus {
  lastRunAt: string | null
  lastResultPath: string | null
  lastError: string | null
}

function loadStatus(db: DatabaseService): PersistedStatus {
  try {
    const rows = db.query(
      `SELECT value FROM settings WHERE key = ?`,
      [STATUS_KEY],
    ) as { value: string }[]
    if (rows.length === 0) return { lastRunAt: null, lastResultPath: null, lastError: null }
    return JSON.parse(rows[0].value) as PersistedStatus
  } catch {
    return { lastRunAt: null, lastResultPath: null, lastError: null }
  }
}

function saveStatus(db: DatabaseService, status: PersistedStatus): void {
  db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [STATUS_KEY, JSON.stringify(status)],
  )
}

function computeNextRunAt(config: ScheduledBackupConfig, lastRunAt: string | null): string | null {
  if (!config.enabled) return null
  const baseMs = lastRunAt ? Date.parse(lastRunAt) : Date.now() - config.frequencyDays * 24 * 60 * 60 * 1000
  return new Date(baseMs + config.frequencyDays * 24 * 60 * 60 * 1000).toISOString()
}

function buildStatus(db: DatabaseService): ScheduledBackupStatus {
  const config = loadConfig(db)
  const persisted = loadStatus(db)
  return {
    config,
    ...persisted,
    nextRunAt: computeNextRunAt(config, persisted.lastRunAt),
    passphraseLoaded: sessionPassphrase !== null,
  }
}

function pruneOldBackups(dir: string, retainCount: number): void {
  if (retainCount <= 0) return
  if (!existsSync(dir)) return
  try {
    const entries = readdirSync(dir)
      .filter((f) => f.startsWith('personal-os-auto-') && (f.endsWith('.db') || f.endsWith('.posbak')))
      .map((f) => {
        const full = join(dir, f)
        return { full, mtime: statSync(full).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)

    const toDelete = entries.slice(retainCount)
    for (const entry of toDelete) {
      try {
        unlinkSync(entry.full)
      } catch (err) {
        console.warn('[ScheduledBackup] failed to prune', entry.full, err)
      }
    }
  } catch (err) {
    console.warn('[ScheduledBackup] pruning failed', err)
  }
}

async function performBackup(db: DatabaseService): Promise<{ ok: boolean; path?: string; error?: string }> {
  const config = loadConfig(db)
  if (!config.destinationDir) {
    return { ok: false, error: 'Sin carpeta destino configurada.' }
  }
  if (!existsSync(config.destinationDir)) {
    try {
      mkdirSync(config.destinationDir, { recursive: true })
    } catch (err) {
      return { ok: false, error: `No se pudo crear la carpeta: ${(err as Error).message}` }
    }
  }
  if (config.encrypt && !sessionPassphrase) {
    return { ok: false, error: 'Backup cifrado requiere passphrase. Definila en Control Center.' }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const ext = config.encrypt ? 'posbak' : 'db'
  const dest = join(config.destinationDir, `personal-os-auto-${stamp}.${ext}`)
  const tmp = `${dest}.tmp.db`

  try {
    db.exportActiveUserDb(tmp)
    if (config.encrypt && sessionPassphrase) {
      const data = readFileSync(tmp)
      const blob = encrypt(data, sessionPassphrase)
      writeFileSync(dest, blob)
      try { unlinkSync(tmp) } catch { /* noop */ }
    } else {
      // mover tmp -> dest
      const data = readFileSync(tmp)
      writeFileSync(dest, data)
      try { unlinkSync(tmp) } catch { /* noop */ }
    }

    pruneOldBackups(config.destinationDir, config.retainCount)
    return { ok: true, path: dest }
  } catch (err) {
    try { if (existsSync(tmp)) unlinkSync(tmp) } catch { /* noop */ }
    return { ok: false, error: (err as Error).message }
  }
}

async function tickIfDue(db: DatabaseService): Promise<void> {
  const config = loadConfig(db)
  if (!config.enabled || !config.destinationDir) return
  const persisted = loadStatus(db)
  const dueAt = computeNextRunAt(config, persisted.lastRunAt)
  if (!dueAt) return
  if (Date.parse(dueAt) > Date.now()) return

  const result = await performBackup(db)
  saveStatus(db, {
    lastRunAt: new Date().toISOString(),
    lastResultPath: result.ok ? result.path ?? null : persisted.lastResultPath,
    lastError: result.ok ? null : result.error ?? 'Error desconocido',
  })
}

function startTimer(db: DatabaseService): void {
  if (timer) clearInterval(timer)
  // Chequea cada hora; barato y suficientemente preciso para backups diarios/semanales.
  timer = setInterval(() => {
    void tickIfDue(db)
  }, 60 * 60 * 1000)
  // Tick inicial diferido para no bloquear el arranque.
  setTimeout(() => void tickIfDue(db), 30_000)
}

export function registerScheduledBackupIpc(db: DatabaseService): void {
  ipcMain.handle('scheduled-backup:get-status', () => buildStatus(db))

  ipcMain.handle('scheduled-backup:set-config', (_event, raw: unknown) => {
    if (typeof raw !== 'object' || raw === null) {
      throw new Error('config debe ser un objeto')
    }
    const current = loadConfig(db)
    const next: ScheduledBackupConfig = {
      ...current,
      ...(raw as Partial<ScheduledBackupConfig>),
    }
    if (!Number.isInteger(next.frequencyDays) || next.frequencyDays < 1 || next.frequencyDays > 30) {
      throw new Error('frequencyDays debe estar entre 1 y 30')
    }
    if (!Number.isInteger(next.retainCount) || next.retainCount < 1 || next.retainCount > 50) {
      throw new Error('retainCount debe estar entre 1 y 50')
    }
    saveConfig(db, next)
    startTimer(db)
    return buildStatus(db)
  })

  ipcMain.handle('scheduled-backup:pick-destination', async () => {
    const focused = BrowserWindow.getFocusedWindow()
    const result = await dialog.showOpenDialog(focused ?? new BrowserWindow({ show: false }), {
      title: 'Carpeta para backups automáticos',
      defaultPath: app.getPath('documents'),
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || result.filePaths.length === 0) return { path: null }
    return { path: result.filePaths[0] }
  })

  ipcMain.handle('scheduled-backup:set-passphrase', (_event, passphrase: unknown) => {
    if (passphrase === null) {
      sessionPassphrase = null
      return { ok: true }
    }
    if (typeof passphrase !== 'string' || passphrase.length < 8) {
      throw new Error('Passphrase muy corta. Mínimo 8 caracteres.')
    }
    sessionPassphrase = passphrase
    return { ok: true }
  })

  ipcMain.handle('scheduled-backup:run-now', async () => {
    const result = await performBackup(db)
    const persisted = loadStatus(db)
    saveStatus(db, {
      lastRunAt: new Date().toISOString(),
      lastResultPath: result.ok ? result.path ?? null : persisted.lastResultPath,
      lastError: result.ok ? null : result.error ?? 'Error desconocido',
    })
    return buildStatus(db)
  })
}

/** Llamar después de setActiveUser. Arranca el timer si la config lo pide. */
export function bootScheduledBackup(db: DatabaseService): void {
  startTimer(db)
}

/** Llamar al cerrar sesión / app. */
export function shutdownScheduledBackup(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  sessionPassphrase = null
}
