import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertOctagon, Download, RotateCcw } from 'lucide-react'
import { messages } from '../messages'
import { eventBus } from '@core/events/EventBus'

/**
 * Error boundary de último recurso que envuelve toda la app.
 * Reemplaza la pantalla en blanco por una superficie con:
 *   - mensaje claro y accionable
 *   - botón para reintentar (resetea el árbol)
 *   - botón para exportar diagnóstico (logs + versión + stack)
 *
 * No reporta a ningún servidor: la filosofía es local-first sin telemetría.
 * El usuario decide si manda el .json a soporte.
 */

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
  componentStack: string | null
  busy: boolean
  exportResult: string | null
}

const APP_VERSION = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev') as string

export class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null, busy: false, exportResult: null }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[GlobalErrorBoundary] uncaught render error', error, info)
    this.setState({ componentStack: info.componentStack ?? null })
  }

  private reset = () => {
    this.setState({ error: null, componentStack: null, exportResult: null })
  }

  private exportDiagnostic = async () => {
    if (this.state.busy) return
    this.setState({ busy: true, exportResult: null })
    try {
      const bridge = (window as unknown as { diagnostic?: { export: (p: unknown) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }> } }).diagnostic
      if (!bridge) {
        this.setState({ exportResult: messages.errors.diagnosticExportFailed })
        return
      }

      const recentEvents = eventBus.getHistory?.(50)?.map((e) => ({
        event: e.event,
        timestamp: e.timestamp,
      })) ?? []

      const result = await bridge.export({
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.componentStack ?? undefined,
        label: 'global',
        recentEvents,
        appVersion: APP_VERSION,
      })

      if (result.ok && result.path) {
        this.setState({ exportResult: messages.success.diagnosticExported(result.path) })
      } else if (result.canceled) {
        this.setState({ exportResult: null })
      } else {
        this.setState({ exportResult: result.error ?? messages.errors.diagnosticExportFailed })
      }
    } catch (err) {
      console.error('[GlobalErrorBoundary] export failed', err)
      this.setState({ exportResult: messages.errors.diagnosticExportFailed })
    } finally {
      this.setState({ busy: false })
    }
  }

  private reloadApp = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render(): ReactNode {
    const { error, busy, exportResult } = this.state
    if (!error) return this.props.children

    return (
      <div
        role="alert"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-[radial-gradient(circle_at_top,_#3b1518_0%,_#161018_55%,_#070708_100%)] p-6 text-white"
      >
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-surface-light/90 p-7 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-2 text-red-300">
            <AlertOctagon size={20} />
            <p className="text-xs uppercase tracking-eyebrow">Error inesperado</p>
          </div>
          <h1 className="mt-3 text-2xl font-semibold">La app se cayó.</h1>
          <p className="mt-1 text-sm text-muted">
            Algo en la interfaz tiró un error y no pudo recuperarse solo. Tus datos no se perdieron.
          </p>

          <div className="mt-4 max-h-32 overflow-auto rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-red-200/90">
            {error.message || 'Error sin mensaje.'}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85"
            >
              <RotateCcw size={13} /> {messages.actions.retry}
            </button>
            <button
              type="button"
              onClick={this.reloadApp}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white"
            >
              {messages.actions.restart}
            </button>
            <button
              type="button"
              onClick={() => void this.exportDiagnostic()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs text-muted hover:text-white disabled:opacity-60"
            >
              <Download size={13} /> {messages.actions.exportDiagnostic}
            </button>
          </div>

          {exportResult && (
            <p className="mt-3 text-xs text-muted">{exportResult}</p>
          )}

          <p className="mt-5 text-caption text-muted/80">
            El diagnóstico se guarda como archivo local. No se envía a ningún servidor.
          </p>
        </div>
      </div>
    )
  }
}
