import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { DatabaseService } from './database'

const CHANNELS = {
  exportPlain: 'backup:export-plain',
  exportEncrypted: 'backup:export-encrypted',
  importPlain: 'backup:import-plain',
  importEncrypted: 'backup:import-encrypted',
} as const

const MAGIC = Buffer.from('POS-BAK1')
const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

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
    throw new Error('Backup file is too small or corrupted')
  }
  const magic = blob.subarray(0, MAGIC.length)
  if (!magic.equals(MAGIC)) {
    throw new Error('Invalid backup format')
  }
  let offset = MAGIC.length
  const salt = blob.subarray(offset, offset + SALT_LEN); offset += SALT_LEN
  const iv = blob.subarray(offset, offset + IV_LEN); offset += IV_LEN
  const tag = blob.subarray(offset, offset + TAG_LEN); offset += TAG_LEN
  const encrypted = blob.subarray(offset)
  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

async function pickSavePath(defaultName: string): Promise<string | null> {
  const focused = BrowserWindow.getFocusedWindow()
  const result = await dialog.showSaveDialog(focused ?? new BrowserWindow({ show: false }), {
    title: 'Guardar backup de Nora OS',
    defaultPath: defaultName,
  })
  return result.canceled || !result.filePath ? null : result.filePath
}

async function pickOpenPath(): Promise<string | null> {
  const focused = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(focused ?? new BrowserWindow({ show: false }), {
    title: 'Restaurar backup de Nora OS',
    properties: ['openFile'],
  })
  return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
}

export function registerBackupIpc(db: DatabaseService): void {
  ipcMain.handle(CHANNELS.exportPlain, async () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = await pickSavePath(`personal-os-backup-${stamp}.db`)
    if (!dest) return { ok: false, canceled: true }
    db.exportActiveUserDb(dest)
    return { ok: true, path: dest }
  })

  ipcMain.handle(CHANNELS.exportEncrypted, async (_event, passphrase: unknown) => {
    if (typeof passphrase !== 'string' || passphrase.length < 8) {
      throw new Error('La passphrase debe tener al menos 8 caracteres')
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dest = await pickSavePath(`personal-os-backup-${stamp}.posbak`)
    if (!dest) return { ok: false, canceled: true }
    // Export to a temp path first so the encrypted blob is built from the canonical file
    const tmp = `${dest}.tmp.db`
    db.exportActiveUserDb(tmp)
    try {
      const data = readFileSync(tmp)
      const blob = encrypt(data, passphrase)
      writeFileSync(dest, blob)
    } finally {
      try { if (existsSync(tmp)) { writeFileSync(tmp, '') } } catch { /* noop */ }
    }
    return { ok: true, path: dest }
  })

  ipcMain.handle(CHANNELS.importPlain, async () => {
    const src = await pickOpenPath()
    if (!src) return { ok: false, canceled: true }
    db.importActiveUserDb(src)
    return { ok: true }
  })

  ipcMain.handle(CHANNELS.importEncrypted, async (_event, passphrase: unknown) => {
    if (typeof passphrase !== 'string' || passphrase.length < 1) {
      throw new Error('Ingresá la passphrase usada al exportar')
    }
    const src = await pickOpenPath()
    if (!src) return { ok: false, canceled: true }
    const blob = readFileSync(src)
    const data = decrypt(blob, passphrase)
    const tmp = `${src}.decrypted.tmp.db`
    writeFileSync(tmp, data)
    db.importActiveUserDb(tmp)
    try { writeFileSync(tmp, '') } catch { /* noop */ }
    return { ok: true }
  })
}
