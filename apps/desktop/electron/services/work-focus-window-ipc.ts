import { BrowserWindow, ipcMain } from 'electron'
import { pathToFileURL } from 'url'

interface WorkFocusWindowOptions {
  preloadPath: string
  rendererFile: string
  rendererUrl?: string
}

let focusWindow: BrowserWindow | null = null

function focusMainWindow(getMainWindow: () => BrowserWindow | null): void {
  const mainWindow = getMainWindow()
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function loadFocusRoute(window: BrowserWindow, options: WorkFocusWindowOptions): void {
  if (options.rendererUrl) {
    const base = options.rendererUrl.replace(/\/$/, '')
    void window.loadURL(`${base}/#/work/focus-mini`)
    return
  }

  void window.loadURL(`${pathToFileURL(options.rendererFile).toString()}#/work/focus-mini`)
}

function openFocusWindow(
  getMainWindow: () => BrowserWindow | null,
  options: WorkFocusWindowOptions,
): void {
  if (focusWindow && !focusWindow.isDestroyed()) {
    focusWindow.show()
    focusWindow.focus()
    return
  }

  focusWindow = new BrowserWindow({
    width: 376,
    height: 342,
    minWidth: 340,
    minHeight: 310,
    title: 'Nora Focus',
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: '#111111',
    show: false,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  focusWindow.setAlwaysOnTop(true, 'floating')
  focusWindow.on('ready-to-show', () => focusWindow?.show())
  focusWindow.on('closed', () => {
    focusWindow = null
  })

  loadFocusRoute(focusWindow, options)
  focusMainWindow(getMainWindow)
}

export function registerWorkFocusWindowIpc(
  getMainWindow: () => BrowserWindow | null,
  options: WorkFocusWindowOptions,
): void {
  ipcMain.handle('work-focus-window:open', () => {
    openFocusWindow(getMainWindow, options)
  })

  ipcMain.handle('work-focus-window:close', () => {
    focusWindow?.close()
  })

  ipcMain.handle('work-focus-window:toggle', () => {
    if (focusWindow && !focusWindow.isDestroyed()) {
      focusWindow.close()
      return
    }
    openFocusWindow(getMainWindow, options)
  })

  ipcMain.handle('work-focus-window:focus-main', () => {
    focusMainWindow(getMainWindow)
  })
}

export function closeWorkFocusWindow(): void {
  focusWindow?.close()
  focusWindow = null
}
