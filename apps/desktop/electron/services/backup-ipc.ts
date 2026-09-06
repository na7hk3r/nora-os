import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { type DatabaseService } from './database'
import { encryptBlob, decryptBlob } from './passphrase'

const CHANNELS = {
  exportPlain: 'backup:export-plain',
  exportEncrypted: 'backup:export-encrypted',
  importPlain: 'backup:import-plain',
  importEncrypted: 'backup:import-encrypted',
} as const

const MAGIC = Buffer.from('POS-BAK1')

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
      const blob = encryptBlob(passphrase, data, MAGIC)
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
    const data = decryptBlob(passphrase, blob, MAGIC)
    const tmp = `${src}.decrypted.tmp.db`
    writeFileSync(tmp, data)
    db.importActiveUserDb(tmp)
    try { writeFileSync(tmp, '') } catch { /* noop */ }
    return { ok: true }
  })
}
