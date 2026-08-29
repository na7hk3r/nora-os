/**
 * bootstrap.ts — prepara el entorno navegador de Nora OS.
 *
 * Expone en `window.*` los bridges web con el MISMO shape que expone el
 * preload de Electron, para que el renderer desktop (core + plugins + stores)
 * opere sin cambios. Debe ejecutarse antes de montar `<App />`.
 *
 * Bridges críticos: storage, auth, dbEncryption (necesarios para el boot).
 * Bridges de feature: notifications, workFocusWindow, ollama (deshabilitado en
 * v1), backup/profile (export/import adaptado), diagnostic, appUpdate,
 * scheduledBackup.
 */
import { storageBridge } from './storage'
import { authBridge } from './auth'
import {
  dbEncryptionBridge,
  notificationsBridge,
  ollamaBridge,
  backupBridge,
  profileBridge,
  diagnosticBridge,
  appUpdateBridge,
  scheduledBackupBridge,
  workFocusWindowBridge,
} from './misc'

export interface WebBridges {
  storage: typeof storageBridge
  auth: typeof authBridge
}

/**
 * Inicializa todos los bridges y los monta en `window`. Devuelve los bridges
 * esenciales. Idempotente.
 */
export async function initBridges(): Promise<WebBridges> {
  await authBridge.init()
  authBridge.setOnActiveUser((userId) => storageBridge.setActiveUser(userId))
  await storageBridge.setActiveUser(null)
  // Si ya hay una sesión activa (recarga), restaurar la DB de ese usuario.
  const currentUser = await authBridge.me()
  if (currentUser) {
    await storageBridge.setActiveUser(currentUser.id)
  }

  const win = window as any
  win.__NORA_WEB__ = true
  win.storage = storageBridge
  win.auth = authBridge
  win.dbEncryption = dbEncryptionBridge
  win.notifications = notificationsBridge
  win.ollama = ollamaBridge
  win.backup = backupBridge
  win.profile = profileBridge
  win.diagnostic = diagnosticBridge
  win.appUpdate = appUpdateBridge
  win.scheduledBackup = scheduledBackupBridge
  win.workFocusWindow = workFocusWindowBridge

  return { storage: storageBridge, auth: authBridge }
}
