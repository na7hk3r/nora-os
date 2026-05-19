import { ipcMain, app } from 'electron'
import type { BrowserWindow } from 'electron'
import type { AppUpdateStatus } from '../../src/core/types'
import { scheduleAutoUpdateChecks, type AutoUpdateScheduleHandle } from '../updater'
import {
  getAppUpdateErrorMessage,
  isRecoverableAppUpdateError,
  toAppUpdateErrorStatus,
} from './app-update-errors'

/**
 * Auto-update wiring (electron-updater).
 *
 * Estado actual:
 *  - El paquete electron-updater es OPCIONAL en runtime: si no está instalado
 *    o no hay feed configurado, el bridge devuelve `{ state: 'disabled' }`.
 *  - La distribución comercial requiere code signing (certs Win + Mac), que se
 *    configura en electron-builder fuera de este archivo. Sin signing, Windows
 *    SmartScreen y macOS Gatekeeper bloquearán el instalador.
 *
 * Para activar auto-update en producción:
 *   1. npm install electron-updater electron-builder --save-dev
 *   2. Agregar a package.json:
 *        "build": {
 *          "appId": "com.nora-os.app",
 *          "publish": [{ "provider": "generic", "url": "https://updates.tu-dominio/" }]
 *        }
 *   3. Configurar certificados de signing en CI.
 *   4. Esta capa pasa a estado 'idle' automáticamente al detectar el módulo.
 */

const CHANNELS = {
  getStatus: 'app-update:get-status',
  check: 'app-update:check',
  download: 'app-update:download',
  quitAndInstall: 'app-update:quit-and-install',
  status: 'app-update:status',
} as const

let currentStatus: AppUpdateStatus = { state: 'idle' }
type UpdaterModule = {
  autoUpdater: {
    autoDownload: boolean
    autoInstallOnAppQuit: boolean
    on(event: string, listener: (...args: unknown[]) => void): unknown
    checkForUpdates(): Promise<unknown>
    downloadUpdate(): Promise<unknown>
    quitAndInstall(): void
  }
}
let updater: UpdaterModule['autoUpdater'] | null = null
let mainWindowGetter: (() => BrowserWindow | null) | null = null
let scheduleHandle: AutoUpdateScheduleHandle | null = null

function broadcast(status: AppUpdateStatus): void {
  currentStatus = status
  const win = mainWindowGetter?.()
  if (win && !win.isDestroyed()) {
    win.webContents.send(CHANNELS.status, status)
  }
}

function tryLoadUpdater(): UpdaterModule['autoUpdater'] | null {
  try {
    // Carga dinámica para no romper si el paquete no está instalado.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('electron-updater') as UpdaterModule
    return mod.autoUpdater
  } catch {
    return null
  }
}

function broadcastUpdateError(context: string, err: unknown): void {
  const technicalMessage = getAppUpdateErrorMessage(err)
  const recoverable = isRecoverableAppUpdateError(err)
  console.warn(`[app-update] ${context}`, { recoverable, technicalMessage, error: err })
  broadcast(toAppUpdateErrorStatus(err))
}

export function registerAppUpdateIpc(getMainWindow: () => BrowserWindow | null): void {
  mainWindowGetter = getMainWindow

  // En dev no tiene sentido el updater (no hay app empaquetada).
  if (!app.isPackaged) {
    currentStatus = { state: 'disabled', reason: 'No disponible en modo desarrollo.' }
  } else {
    updater = tryLoadUpdater()
    if (!updater) {
      currentStatus = {
        state: 'disabled',
        reason: 'electron-updater no está instalado. Instalá la dependencia para activar auto-update.',
      }
    } else {
      // Configuración por defecto: chequear sin descargar; el usuario decide.
      updater.autoDownload = false
      updater.autoInstallOnAppQuit = true

      updater.on('checking-for-update', () => broadcast({ state: 'checking' }))
      updater.on('update-not-available', (info: unknown) => {
        const version = (info as { version?: string } | undefined)?.version ?? app.getVersion()
        broadcast({ state: 'no-update', currentVersion: version })
      })
      updater.on('update-available', (info: unknown) => {
        const data = info as { version?: string; releaseNotes?: string } | undefined
        broadcast({
          state: 'available',
          version: data?.version ?? 'desconocida',
          releaseNotes: typeof data?.releaseNotes === 'string' ? data.releaseNotes : undefined,
        })
      })
      updater.on('download-progress', (progress: unknown) => {
        const p = progress as { percent?: number; transferred?: number; total?: number } | undefined
        broadcast({
          state: 'downloading',
          percent: Math.round(p?.percent ?? 0),
          transferredBytes: p?.transferred ?? 0,
          totalBytes: p?.total ?? 0,
        })
      })
      updater.on('update-downloaded', (info: unknown) => {
        const version = (info as { version?: string } | undefined)?.version ?? 'desconocida'
        broadcast({ state: 'downloaded', version })
      })
      updater.on('error', (err: unknown) => broadcastUpdateError('autoUpdater error', err))
    }
  }

  ipcMain.handle(CHANNELS.getStatus, () => currentStatus)

  ipcMain.handle(CHANNELS.check, async () => {
    if (!updater) return currentStatus
    try {
      await updater.checkForUpdates()
    } catch (err) {
      broadcastUpdateError('checkForUpdates failed', err)
    }
    return currentStatus
  })

  ipcMain.handle(CHANNELS.download, async () => {
    if (!updater) return currentStatus
    try {
      await updater.downloadUpdate()
    } catch (err) {
      broadcastUpdateError('downloadUpdate failed', err)
    }
    return currentStatus
  })

  ipcMain.handle(CHANNELS.quitAndInstall, () => {
    if (!updater) return
    updater.quitAndInstall()
  })

  // Auto-check periodico solo en builds empaquetadas con updater disponible.
  // Boot delay 10s + cada 6h. En dev no se agenda nada.
  if (updater) {
    const localUpdater = updater
    scheduleHandle = scheduleAutoUpdateChecks({
      disabled: !app.isPackaged,
      check: () => localUpdater.checkForUpdates(),
    })
  }
}

/**
 * Detiene el scheduler de auto-update. Llamar en `before-quit` si se desea
 * evitar que un check en vuelo retenga el event loop. Idempotente.
 */
export function shutdownAppUpdateIpc(): void {
  scheduleHandle?.stop()
  scheduleHandle = null
}
