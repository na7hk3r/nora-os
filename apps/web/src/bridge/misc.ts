/**
 * Bridges misceláneos (web)
 *
 * Implementaciones navegador de los bridges de features que en la web
 * local-first se degradan o se adaptan:
 *
 *  - notifications → Notification API del navegador.
 *  - ollama        → deshabilitado en v1 (se mantiene la interfaz, desconectada).
 *  - appUpdate     → ausente (la PWA se actualiza sola); estado 'disabled'.
 *  - diagnostic    → export como Blob de descarga.
 *  - scheduledBackup → deshabilitado en v1.
 *  - workFocusWindow → no-op (se degrada a no-op para no romper la UI).
 *
 * Los bridges funcionales (storage, auth, dbEncryption, backup, profile) viven
 * en módulos dedicados y se re-exportan aquí para un único punto de importación.
 */
import type {
  OllamaBridge,
  NotificationsBridge,
  DiagnosticBridge,
  AppUpdateBridge,
  ScheduledBackupBridge,
  WorkFocusWindowBridge,
} from '@core/types'
import { downloadBlob } from './files'

export { dbEncryptionBridge } from './db-encryption'
export { backupBridge } from './backup'
export { profileBridge } from './profile'

export const notificationsBridge: NotificationsBridge = {
  isSupported: async () => typeof window !== 'undefined' && 'Notification' in window,
  show: async (payload) => {
    try {
      if (!('Notification' in window)) return { ok: false, reason: 'unsupported' }
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }
      if (permission !== 'granted') return { ok: false, reason: 'denied' }
      new Notification(payload.title, { body: payload.body, silent: payload.silent })
      return { ok: true }
    } catch {
      return { ok: false, reason: 'error' }
    }
  },
}

export const ollamaBridge: OllamaBridge = {
  health: async () => ({ ok: false, baseUrl: '', error: 'IA deshabilitada en la versión web v1' }),
  listModels: async () => [],
  pullModel: async () => ({ ok: false, model: '', status: 'unsupported' }),
  generate: async () => {
    throw new Error('IA deshabilitada en la versión web v1')
  },
}

export const diagnosticBridge: DiagnosticBridge = {
  export: async (payload) => {
    const filename = `nora-diagnostic-${Date.now()}.json`
    const report = {
      ...(payload ?? {}),
      platform: 'web',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      language: typeof navigator !== 'undefined' ? navigator.language : undefined,
      exportedAt: new Date().toISOString(),
    }
    downloadBlob(filename, JSON.stringify(report, null, 2))
    return { ok: true, path: filename }
  },
}

export const appUpdateBridge: AppUpdateBridge = {
  getStatus: async () => ({ state: 'disabled', reason: 'web' }),
  checkForUpdates: async () => ({ state: 'disabled', reason: 'web' }),
  downloadUpdate: async () => ({ state: 'disabled', reason: 'web' }),
  quitAndInstall: async () => {
    /* no-op */
  },
  onStatus: () => () => {
    /* no-op */
  },
}

export const scheduledBackupBridge: ScheduledBackupBridge = {
  getStatus: async () => ({
    config: {
      enabled: false,
      frequencyDays: 7,
      destinationDir: null,
      encrypt: false,
      retainCount: 5,
    },
    lastRunAt: null,
    lastResultPath: null,
    lastError: null,
    nextRunAt: null,
    passphraseLoaded: false,
  }),
  setConfig: async (config) => ({
    config: {
      enabled: false,
      frequencyDays: 7,
      destinationDir: null,
      encrypt: false,
      retainCount: 5,
      ...config,
    },
    lastRunAt: null,
    lastResultPath: null,
    lastError: null,
    nextRunAt: null,
    passphraseLoaded: false,
  }),
  pickDestination: async () => ({ path: null }),
  setPassphrase: async () => ({ ok: false }),
  runNow: async () => ({
    config: {
      enabled: false,
      frequencyDays: 7,
      destinationDir: null,
      encrypt: false,
      retainCount: 5,
    },
    lastRunAt: null,
    lastResultPath: null,
    lastError: 'No soportado en web',
    nextRunAt: null,
    passphraseLoaded: false,
  }),
}

export const workFocusWindowBridge: WorkFocusWindowBridge = {
  open: async () => {
    /* no-op */
  },
  close: async () => {
    /* no-op */
  },
  toggle: async () => {
    /* no-op */
  },
  focusMain: async () => {
    window.focus()
  },
}
