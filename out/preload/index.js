"use strict";
const electron = require("electron");
const storageBridge = {
  query: (sql, params) => electron.ipcRenderer.invoke("storage:query", sql, params),
  execute: (sql, params) => electron.ipcRenderer.invoke("storage:execute", sql, params),
  migrate: (pluginId, migrations) => electron.ipcRenderer.invoke("storage:migrate", pluginId, migrations)
};
const authBridge = {
  register: (payload) => electron.ipcRenderer.invoke("auth:register", payload),
  login: (username, password) => electron.ipcRenderer.invoke("auth:login", username, password),
  logout: () => electron.ipcRenderer.invoke("auth:logout"),
  me: () => electron.ipcRenderer.invoke("auth:me"),
  getRecoveryQuestion: (username) => electron.ipcRenderer.invoke("auth:get-recovery-question", username),
  resetPasswordWithRecovery: (payload) => electron.ipcRenderer.invoke("auth:reset-password-with-recovery", payload)
};
const backupBridge = {
  exportPlain: () => electron.ipcRenderer.invoke("backup:export-plain"),
  exportEncrypted: (passphrase) => electron.ipcRenderer.invoke("backup:export-encrypted", passphrase),
  importPlain: () => electron.ipcRenderer.invoke("backup:import-plain"),
  importEncrypted: (passphrase) => electron.ipcRenderer.invoke("backup:import-encrypted", passphrase)
};
const profileBridge = {
  exportPlain: () => electron.ipcRenderer.invoke("profile:export-plain"),
  exportEncrypted: (passphrase) => electron.ipcRenderer.invoke("profile:export-encrypted", passphrase),
  importPlain: () => electron.ipcRenderer.invoke("profile:import-plain"),
  importEncrypted: (passphrase) => electron.ipcRenderer.invoke("profile:import-encrypted", passphrase)
};
const ollamaBridge = {
  health: () => electron.ipcRenderer.invoke("ollama:health"),
  listModels: () => electron.ipcRenderer.invoke("ollama:list-models"),
  pullModel: (model) => electron.ipcRenderer.invoke("ollama:pull-model", model),
  generate: (req) => electron.ipcRenderer.invoke("ollama:generate", req)
};
const notificationsBridge = {
  isSupported: () => electron.ipcRenderer.invoke("notifications:supported"),
  show: (payload) => electron.ipcRenderer.invoke("notifications:show", payload)
};
const diagnosticBridge = {
  export: (payload) => electron.ipcRenderer.invoke("diagnostic:export", payload)
};
const appUpdateBridge = {
  getStatus: () => electron.ipcRenderer.invoke("app-update:get-status"),
  checkForUpdates: () => electron.ipcRenderer.invoke("app-update:check"),
  downloadUpdate: () => electron.ipcRenderer.invoke("app-update:download"),
  quitAndInstall: () => electron.ipcRenderer.invoke("app-update:quit-and-install"),
  onStatus: (cb) => {
    const handler = (_event, status) => cb(status);
    electron.ipcRenderer.on("app-update:status", handler);
    return () => electron.ipcRenderer.removeListener("app-update:status", handler);
  }
};
const scheduledBackupBridge = {
  getStatus: () => electron.ipcRenderer.invoke("scheduled-backup:get-status"),
  setConfig: (config) => electron.ipcRenderer.invoke("scheduled-backup:set-config", config),
  pickDestination: () => electron.ipcRenderer.invoke("scheduled-backup:pick-destination"),
  setPassphrase: (passphrase) => electron.ipcRenderer.invoke("scheduled-backup:set-passphrase", passphrase),
  runNow: () => electron.ipcRenderer.invoke("scheduled-backup:run-now")
};
const dbEncryptionBridge = {
  status: () => electron.ipcRenderer.invoke("dbencryption:status"),
  enable: (passphrase) => electron.ipcRenderer.invoke("dbencryption:enable", passphrase),
  disable: () => electron.ipcRenderer.invoke("dbencryption:disable"),
  checkStrength: (passphrase) => electron.ipcRenderer.invoke("dbencryption:check-strength", passphrase),
  unlock: (passphrase) => electron.ipcRenderer.invoke("dbencryption:unlock", passphrase)
};
const workFocusWindowBridge = {
  open: () => electron.ipcRenderer.invoke("work-focus-window:open"),
  close: () => electron.ipcRenderer.invoke("work-focus-window:close"),
  toggle: () => electron.ipcRenderer.invoke("work-focus-window:toggle"),
  focusMain: () => electron.ipcRenderer.invoke("work-focus-window:focus-main")
};
electron.contextBridge.exposeInMainWorld("storage", storageBridge);
electron.contextBridge.exposeInMainWorld("auth", authBridge);
electron.contextBridge.exposeInMainWorld("backup", backupBridge);
electron.contextBridge.exposeInMainWorld("profile", profileBridge);
electron.contextBridge.exposeInMainWorld("ollama", ollamaBridge);
electron.contextBridge.exposeInMainWorld("notifications", notificationsBridge);
electron.contextBridge.exposeInMainWorld("diagnostic", diagnosticBridge);
electron.contextBridge.exposeInMainWorld("appUpdate", appUpdateBridge);
electron.contextBridge.exposeInMainWorld("scheduledBackup", scheduledBackupBridge);
electron.contextBridge.exposeInMainWorld("dbEncryption", dbEncryptionBridge);
electron.contextBridge.exposeInMainWorld("workFocusWindow", workFocusWindowBridge);
