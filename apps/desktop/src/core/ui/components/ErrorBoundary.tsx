import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  /** Human readable label for the guarded surface (e.g. plugin id or page name). */
  label?: string
  /** Optional callback fired when an error is caught. */
  onError?: (error: Error, info: ErrorInfo) => void
  children: ReactNode
  /** Custom fallback renderer. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Generic error boundary used to isolate plugin UI and core pages so a single
 * render failure cannot take down the whole shell.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const label = this.props.label ?? 'unknown'
    console.error(`[ErrorBoundary:${label}]`, error, info)
    this.props.onError?.(error, info)
  }

  private reset = () => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset)
    }

    return (
      <div
        role="alert"
        className="m-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-5 text-sm text-red-100"
      >
        <p className="font-semibold">Se produjo un error inesperado{this.props.label ? ` en ${this.props.label}` : ''}.</p>
        <p className="mt-1 text-red-200/80">{error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-3 rounded-md border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500/30"
        >
          Reintentar
        </button>
      </div>
    )
  }
}
