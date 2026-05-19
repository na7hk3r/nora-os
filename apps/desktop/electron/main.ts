import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'path'
import { URL } from 'url'
import { registerStorageIpc } from './services/storage-ipc'
import { DatabaseService } from './services/database'
import { AuthService } from './services/auth'
import { registerAuthIpc } from './services/auth-ipc'
import { registerBackupIpc } from './services/backup-ipc'
import { registerProfileIpc } from './services/profile-ipc'
import { registerOllamaIpc } from './services/ollama-ipc'
import { registerNotificationsIpc } from './services/notifications-ipc'
import { registerDiagnosticIpc } from './services/diagnostic-ipc'
import { registerAppUpdateIpc, shutdownAppUpdateIpc } from './services/app-update-ipc'
import { registerDbEncryptionIpc } from './services/db-encryption-ipc'
import { closeWorkFocusWindow, registerWorkFocusWindowIpc } from './services/work-focus-window-ipc'
import {
  registerScheduledBackupIpc,
  bootScheduledBackup,
  shutdownScheduledBackup,
} from './services/scheduled-backup'

let mainWindow: BrowserWindow | null = null
const rendererUrl = process.env.ELECTRON_RENDERER_URL
const isDebugDevtoolsEnabled = process.env.ELECTRON_DEBUG_DEVTOOLS === 'true'

// Marca de la app a nivel SO. Afecta título de la ventana en algunos WMs,
// el menú "Acerca de" en macOS y el nombre del proceso en Windows.
app.setName('Nora OS')

if (process.platform !== 'win32') {
  app.setAboutPanelOptions({
    applicationName: 'Nora OS',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 na7hk3r',
    iconPath: join(__dirname, '../../buildResources/icon.png'),
  })
}


/**
 * Allowed protocols for opening URLs externally via shell.openExternal.
 * Anything else is silently blocked to prevent protocol-handler abuse.
 */
const ALLOWED_EXTERNAL_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return ALLOWED_EXTERNAL_PROTOCOLS.has(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Origins the renderer is allowed to navigate to. In dev, the Vite dev server.
 * In prod, only file:// loads of the packaged renderer.
 */
function isAllowedNavigationTarget(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'file:') return true
    if (rendererUrl) {
      const dev = new URL(rendererUrl)
      return parsed.origin === dev.origin
    }
    return false
  } catch {
    return false
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Nora OS',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    titleBarStyle: 'hiddenInset',
    show: false,
  })
  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open DevTools only when explicitly requested in development.
  if (rendererUrl && isDebugDevtoolsEnabled) {
    mainWindow.webContents.openDevTools()
  }

  // Dev: load vite dev server. Prod: load built files.
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * Apply security policy to every webContents created in the app.
 * Blocks in-app navigation to untrusted origins and routes window.open
 * to the OS default browser for allowed protocols only.
 */
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    // Internal app routes can be opened by modified clicks/keyboard activation.
    // Keep those inside Nora instead of sending the dev-server URL to a browser.
    if (isAllowedNavigationTarget(url)) {
      return { action: 'deny' }
    }

    if (isSafeExternalUrl(url)) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigationTarget(url)) {
      event.preventDefault()
      if (isSafeExternalUrl(url)) {
        void shell.openExternal(url)
      }
    }
  })

  // Hard-deny attaching any webview tag; the app does not use them.
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
})

app.whenReady().then(() => {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null)
  }

  const db = DatabaseService.getInstance()
  db.initialize()
  const authService = new AuthService(db)
  registerStorageIpc(db)
  registerAuthIpc(authService)
  registerBackupIpc(db)
  registerProfileIpc(db)
  registerOllamaIpc()
  registerNotificationsIpc()
  registerDiagnosticIpc()
  registerScheduledBackupIpc(db)
  registerAppUpdateIpc(() => mainWindow)
  registerDbEncryptionIpc()
  registerWorkFocusWindowIpc(() => mainWindow, {
    preloadPath: join(__dirname, '../preload/index.js'),
    rendererFile: join(__dirname, '../renderer/index.html'),
    rendererUrl,
  })
  bootScheduledBackup(db)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeWorkFocusWindow()
  shutdownScheduledBackup()
  shutdownAppUpdateIpc()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
