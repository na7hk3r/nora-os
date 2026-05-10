import { contextBridge, ipcRenderer } from 'electron'
import type { StorageBridge } from '../src/core/types'
import type {
  AuthBridge,
  BackupBridge,
  OllamaBridge,
  NotificationsBridge,
  DiagnosticBridge,
  AppUpdateBridge,
  AppUpdateStatus,
  ScheduledBackupBridge,
  ScheduledBackupConfig,
  DbEncryptionBridge,
  ProfileBridge,
  WorkFocusWindowBridge,
} from '../src/core/types'

const storageBridge: StorageBridge = {
  query: (sql, params) => ipcRenderer.invoke('storage:query', sql, params),
  execute: (sql, params) => ipcRenderer.invoke('storage:execute', sql, params),
  migrate: (pluginId, migrations) => ipcRenderer.invoke('storage:migrate', pluginId, migrations),
}

const authBridge: AuthBridge = {
  register: (payload) => ipcRenderer.invoke('auth:register', payload),
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  me: () => ipcRenderer.invoke('auth:me'),
  getRecoveryQuestion: (username) => ipcRenderer.invoke('auth:get-recovery-question', username),
  resetPasswordWithRecovery: (payload) => ipcRenderer.invoke('auth:reset-password-with-recovery', payload),
}

const backupBridge: BackupBridge = {
  exportPlain: () => ipcRenderer.invoke('backup:export-plain'),
  exportEncrypted: (passphrase) => ipcRenderer.invoke('backup:export-encrypted', passphrase),
  importPlain: () => ipcRenderer.invoke('backup:import-plain'),
  importEncrypted: (passphrase) => ipcRenderer.invoke('backup:import-encrypted', passphrase),
}

const profileBridge: ProfileBridge = {
  exportPlain: () => ipcRenderer.invoke('profile:export-plain'),
  exportEncrypted: (passphrase) => ipcRenderer.invoke('profile:export-encrypted', passphrase),
  importPlain: () => ipcRenderer.invoke('profile:import-plain'),
  importEncrypted: (passphrase) => ipcRenderer.invoke('profile:import-encrypted', passphrase),
}

const ollamaBridge: OllamaBridge = {
  health: () => ipcRenderer.invoke('ollama:health'),
  listModels: () => ipcRenderer.invoke('ollama:list-models'),
  pullModel: (model) => ipcRenderer.invoke('ollama:pull-model', model),
  generate: (req) => ipcRenderer.invoke('ollama:generate', req),
}

const notificationsBridge: NotificationsBridge = {
  isSupported: () => ipcRenderer.invoke('notifications:supported'),
  show: (payload) => ipcRenderer.invoke('notifications:show', payload),
}

const diagnosticBridge: DiagnosticBridge = {
  export: (payload) => ipcRenderer.invoke('diagnostic:export', payload),
}

const appUpdateBridge: AppUpdateBridge = {
  getStatus: () => ipcRenderer.invoke('app-update:get-status'),
  checkForUpdates: () => ipcRenderer.invoke('app-update:check'),
  downloadUpdate: () => ipcRenderer.invoke('app-update:download'),
  quitAndInstall: () => ipcRenderer.invoke('app-update:quit-and-install'),
  onStatus: (cb: (status: AppUpdateStatus) => void) => {
    const handler = (_event: unknown, status: AppUpdateStatus) => cb(status)
    ipcRenderer.on('app-update:status', handler)
    return () => ipcRenderer.removeListener('app-update:status', handler)
  },
}

const scheduledBackupBridge: ScheduledBackupBridge = {
  getStatus: () => ipcRenderer.invoke('scheduled-backup:get-status'),
  setConfig: (config: Partial<ScheduledBackupConfig>) =>
    ipcRenderer.invoke('scheduled-backup:set-config', config),
  pickDestination: () => ipcRenderer.invoke('scheduled-backup:pick-destination'),
  setPassphrase: (passphrase: string | null) =>
    ipcRenderer.invoke('scheduled-backup:set-passphrase', passphrase),
  runNow: () => ipcRenderer.invoke('scheduled-backup:run-now'),
}

const dbEncryptionBridge: DbEncryptionBridge = {
  status: () => ipcRenderer.invoke('dbencryption:status'),
  enable: (passphrase: string) => ipcRenderer.invoke('dbencryption:enable', passphrase),
  disable: () => ipcRenderer.invoke('dbencryption:disable'),
  checkStrength: (passphrase: string) => ipcRenderer.invoke('dbencryption:check-strength', passphrase),
  unlock: (passphrase: string) => ipcRenderer.invoke('dbencryption:unlock', passphrase),
}

const workFocusWindowBridge: WorkFocusWindowBridge = {
  open: () => ipcRenderer.invoke('work-focus-window:open'),
  close: () => ipcRenderer.invoke('work-focus-window:close'),
  toggle: () => ipcRenderer.invoke('work-focus-window:toggle'),
  focusMain: () => ipcRenderer.invoke('work-focus-window:focus-main'),
}

contextBridge.exposeInMainWorld('storage', storageBridge)
contextBridge.exposeInMainWorld('auth', authBridge)
contextBridge.exposeInMainWorld('backup', backupBridge)
contextBridge.exposeInMainWorld('profile', profileBridge)
contextBridge.exposeInMainWorld('ollama', ollamaBridge)
contextBridge.exposeInMainWorld('notifications', notificationsBridge)
contextBridge.exposeInMainWorld('diagnostic', diagnosticBridge)
contextBridge.exposeInMainWorld('appUpdate', appUpdateBridge)
contextBridge.exposeInMainWorld('scheduledBackup', scheduledBackupBridge)
contextBridge.exposeInMainWorld('dbEncryption', dbEncryptionBridge)
contextBridge.exposeInMainWorld('workFocusWindow', workFocusWindowBridge)
