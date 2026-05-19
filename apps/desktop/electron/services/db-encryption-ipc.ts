/**
 * IPC para gestión del cifrado en reposo de la DB de usuario.
 *
 * Canales:
 *  - dbencryption:status        → { enabled, hasEncryptedAtRest }
 *  - dbencryption:enable        → activa cifrado con passphrase nueva
 *  - dbencryption:disable       → desactiva cifrado (sesión activa)
 *  - dbencryption:check-strength→ valida fortaleza de passphrase sin guardar
 */

import { ipcMain } from 'electron'
import { DatabaseService } from './database'
import { isPassphraseStrongEnough, EncryptionError } from './encryption'

const CHANNELS = {
  status: 'dbencryption:status',
  enable: 'dbencryption:enable',
  disable: 'dbencryption:disable',
  checkStrength: 'dbencryption:check-strength',
  unlock: 'dbencryption:unlock',
} as const

export function registerDbEncryptionIpc(): void {
  const db = DatabaseService.getInstance()

  ipcMain.handle(CHANNELS.status, () => {
    const userId = db.getActiveUserId()
    return {
      enabled: db.isEncryptionEnabledForActiveUser(),
      hasEncryptedAtRest: userId ? db.hasEncryptedDb(userId) : false,
      locked: db.isLocked(),
    }
  })

  ipcMain.handle(CHANNELS.unlock, (_evt, passphrase: string) => {
    try {
      db.unlockEncryptedDb(passphrase)
      return { ok: true }
    } catch (err) {
      if (err instanceof EncryptionError) {
        return { ok: false, code: err.code, message: err.message }
      }
      return { ok: false, code: 'IO', message: (err as Error).message }
    }
  })

  ipcMain.handle(CHANNELS.checkStrength, (_evt, passphrase: string) => {
    return { strong: isPassphraseStrongEnough(passphrase ?? '') }
  })

  ipcMain.handle(CHANNELS.enable, (_evt, passphrase: string) => {
    try {
      db.enableEncryptionForActiveUser(passphrase)
      return { ok: true }
    } catch (err) {
      if (err instanceof EncryptionError) {
        return { ok: false, code: err.code, message: err.message }
      }
      return { ok: false, code: 'IO', message: (err as Error).message }
    }
  })

  ipcMain.handle(CHANNELS.disable, () => {
    try {
      db.disableEncryptionForActiveUser()
      return { ok: true }
    } catch (err) {
      return { ok: false, message: (err as Error).message }
    }
  })
}
