import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'

const CHANNEL = 'diagnostic:export'

export interface DiagnosticPayload {
  /** Mensaje del error principal capturado por el ErrorBoundary global. */
  message?: string
  /** Stack trace serializado. */
  stack?: string
  /** Información de componente React (componentStack). */
  componentStack?: string
  /** Etiqueta del boundary o ruta donde ocurrió. */
  label?: string
  /** Eventos recientes capturados por el bus en memoria del renderer. */
  recentEvents?: Array<{ event: string; timestamp: number }>
  /** Logs de consola recientes capturados por el renderer (si los hay). */
  recentLogs?: string[]
  /** Versión visible del producto. */
  appVersion?: string
}

interface DiagnosticReport extends DiagnosticPayload {
  generatedAt: string
  electronVersion: string
  chromeVersion: string
  nodeVersion: string
  platform: string
  arch: string
  locale: string
}

function buildReport(input: DiagnosticPayload): DiagnosticReport {
  return {
    ...input,
    appVersion: input.appVersion ?? app.getVersion(),
    generatedAt: new Date().toISOString(),
    electronVersion: process.versions.electron ?? 'unknown',
    chromeVersion: process.versions.chrome ?? 'unknown',
    nodeVersion: process.versions.node ?? 'unknown',
    platform: process.platform,
    arch: process.arch,
    locale: app.getLocale(),
  }
}

export function registerDiagnosticIpc(): void {
  ipcMain.handle(CHANNEL, async (_event, raw: unknown) => {
    const payload: DiagnosticPayload =
      typeof raw === 'object' && raw !== null ? (raw as DiagnosticPayload) : {}
    const report = buildReport(payload)

    const focused = BrowserWindow.getFocusedWindow()
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const defaultName = `personal-os-diagnostic-${stamp}.json`
    const result = await dialog.showSaveDialog(focused ?? new BrowserWindow({ show: false }), {
      title: 'Exportar diagnóstico de Nora OS',
      defaultPath: join(app.getPath('downloads'), defaultName),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) {
      return { ok: false, canceled: true as const }
    }

    try {
      writeFileSync(result.filePath, JSON.stringify(report, null, 2), 'utf-8')
      return { ok: true as const, path: result.filePath }
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : 'No se pudo escribir el archivo',
      }
    }
  })
}
