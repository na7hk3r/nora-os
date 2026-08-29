/**
 * backup.ts — `window.backup` (BackupBridge) funcional para web.
 *
 * Replica `backup-ipc.ts` de Electron usando el formato POS-BAK1:
 *   - exportPlain: bytes crudos de la DB del usuario activo → descarga `.db`.
 *   - exportEncrypted(pass): cifra esos bytes con scrypt+AES-GCM → `.posbak`.
 *   - importPlain: selecciona un `.db` y reemplaza la DB del usuario activo.
 *   - importEncrypted(pass): selecciona `.posbak`, descifra y reemplaza.
 */
import type { BackupBridge, BackupResult } from '@core/types'
import { storageBridge } from './storage'
import { encryptElectron, decryptElectron } from '../spike/crypto-electron'
import { downloadBlob, pickFile } from './files'

const stamp = (): string => new Date().toISOString().replace(/[:.]/g, '-')

export const backupBridge: BackupBridge = {
  async exportPlain(): Promise<BackupResult> {
    const bytes = await storageBridge.exportBytes()
    downloadBlob(`nora-backup-${stamp()}.db`, new Blob([bytes as unknown as BlobPart]))
    return { ok: true }
  },

  async exportEncrypted(passphrase: string): Promise<BackupResult> {
    if (typeof passphrase !== 'string' || passphrase.length < 8) {
      throw new Error('La passphrase debe tener al menos 8 caracteres')
    }
    const bytes = await storageBridge.exportBytes()
    const blob = await encryptElectron('backup', bytes, passphrase)
    downloadBlob(`nora-backup-${stamp()}.posbak`, new Blob([blob as unknown as BlobPart]))
    return { ok: true }
  },

  async importPlain(): Promise<BackupResult> {
    const file = await pickFile('.db,application/x-sqlite3')
    if (!file) return { ok: false, canceled: true }
    await storageBridge.importBytes(file.bytes)
    return { ok: true }
  },

  async importEncrypted(passphrase: string): Promise<BackupResult> {
    const file = await pickFile('.posbak,.posdb,.enc')
    if (!file) return { ok: false, canceled: true }
    const { plaintext } = await decryptElectron(file.bytes, passphrase)
    await storageBridge.importBytes(plaintext)
    return { ok: true }
  },
}
