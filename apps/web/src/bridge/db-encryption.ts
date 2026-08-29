/**
 * db-encryption.ts — `window.dbEncryption` (DbEncryptionBridge) para web.
 *
 * Cifrado en reposo de la DB del usuario activo usando el formato **POS1**
 * (mismo que Electron: scrypt+aes-gcm, N=32768).
 *
 * Modelo (equivalente al desktop):
 *   - La DB en uso vive en IndexedDB bajo `user:{id}` (bytes sql.js planos).
 *   - Al habilitar el cifrado, esos bytes se cifran y se guardan bajo
 *     `user:{id}.enc` (POS1); se BORRA el blob plano → la DB queda "en reposo".
 *   - `status().locked` es true si existe `.enc` y no hay blob plano (es decir,
 *     tras cerrar/recargar la app con el cifrado activo). Se desbloquea con
 *     `unlock(passphrase)` que descifra `.enc` y restaura el blob plano.
 *   - `disable()` borra `.enc` (y desbloquea) dejando solo el plano.
 *
 * En web no hay filesystem; el ".enc" vive en IndexedDB igual que la DB.
 */
import type { DbEncryptionBridge, DbEncryptionStatus, DbEncryptionResult } from '@core/types'
import { storageBridge } from './storage'
import { loadDbBytes, persistDb, deleteDb } from '../spike/sqlite-web'
import { encryptElectron, decryptElectron } from '../spike/crypto-electron'

const encKey = (dbKey: string): string => `${dbKey}.enc`

function isStrong(passphrase: string): boolean {
  if (passphrase.length < 12) return false
  let cats = 0
  if (/[a-z]/.test(passphrase)) cats += 1
  if (/[A-Z]/.test(passphrase)) cats += 1
  if (/[0-9]/.test(passphrase)) cats += 1
  if (/[^A-Za-z0-9]/.test(passphrase)) cats += 1
  return cats >= 2
}

export const dbEncryptionBridge: DbEncryptionBridge = {
  async status(): Promise<DbEncryptionStatus> {
    const dbKey = storageBridge.getDbKey()
    if (!dbKey) return { enabled: false, hasEncryptedAtRest: false, locked: false }
    const cipher = await loadDbBytes(encKey(dbKey))
    if (!cipher) return { enabled: false, hasEncryptedAtRest: false, locked: false }
    // Blob plano presente → desbloqueada en memoria; ausente → en reposo (locked).
    const plain = await loadDbBytes(dbKey)
    return { enabled: true, hasEncryptedAtRest: true, locked: !plain }
  },

  async enable(passphrase: string): Promise<DbEncryptionResult> {
    const dbKey = storageBridge.getDbKey()
    if (!dbKey) return { ok: false, code: 'IO', message: 'No hay un usuario activo' }
    if (typeof passphrase !== 'string' || !isStrong(passphrase)) {
      return { ok: false, code: 'WEAK_PASSPHRASE', message: 'La passphrase es demasiado débil' }
    }
    try {
      const plain = await storageBridge.exportBytes()
      const cipher = await encryptElectron('pos1', plain, passphrase)
      await persistDb(encKey(dbKey), cipher)
      await deleteDb(dbKey)
      return { ok: true }
    } catch (err) {
      return { ok: false, code: 'IO', message: (err as Error).message }
    }
  },

  async disable(): Promise<{ ok: boolean; message?: string }> {
    const dbKey = storageBridge.getDbKey()
    if (dbKey) {
      try {
        await deleteDb(encKey(dbKey))
      } catch (err) {
        return { ok: false, message: (err as Error).message }
      }
    }
    return { ok: true }
  },

  checkStrength: async (passphrase) => ({
    strong: typeof passphrase === 'string' && isStrong(passphrase),
  }),

  async unlock(passphrase: string): Promise<DbEncryptionResult> {
    const dbKey = storageBridge.getDbKey()
    if (!dbKey) return { ok: false, code: 'IO', message: 'No hay un usuario activo' }
    const cipher = await loadDbBytes(encKey(dbKey))
    if (!cipher) return { ok: false, code: 'IO', message: 'No hay DB cifrada para este usuario' }
    try {
      const { plaintext } = await decryptElectron(cipher, passphrase)
      await persistDb(dbKey, plaintext)
      return { ok: true }
    } catch (err) {
      return { ok: false, code: 'BAD_PASSPHRASE', message: (err as Error).message }
    }
  },
}
