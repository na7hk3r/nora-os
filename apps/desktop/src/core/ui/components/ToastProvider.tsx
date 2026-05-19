import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertTriangle, Info, X, RotateCcw } from 'lucide-react'

/**
 * Sistema mínimo de toasts con soporte de "Deshacer" para operaciones
 * destructivas reversibles. Sin dependencias externas: cumple con la
 * filosofía local-first y evita aumentar bundle.
 *
 * Uso típico:
 *   const { toast } = useToast()
 *   toast.success('Tag creado.')
 *   toast.undo({
 *     message: 'Card borrada.',
 *     onUndo: async () => { await api.restoreCard(id) },
 *     timeoutMs: 5000,
 *   })
 *
 * Política de tono: los strings los provee el llamador desde
 * `core/ui/messages.ts`. Este componente NO contiene strings de negocio.
 */

export type ToastVariant = 'success' | 'error' | 'info' | 'undo'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  /** Callback opcional para variant === 'undo'. Si se llama, el toast se cierra. */
  onUndo?: () => void | Promise<void>
  /** Texto del botón de undo. Default: "Deshacer". */
  undoLabel?: string
  /** Tiempo en ms antes de auto-cerrar. Default: 4000 (5000 para undo). 0 = no auto-cerrar. */
  timeoutMs?: number
}

interface ToastContextValue {
  toast: {
    success: (message: string, opts?: Partial<Toast>) => string
    error: (message: string, opts?: Partial<Toast>) => string
    info: (message: string, opts?: Partial<Toast>) => string
    undo: (opts: { message: string; onUndo: () => void | Promise<void>; timeoutMs?: number; undoLabel?: string }) => string
    dismiss: (id: string) => void
  }
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_TIMEOUT = 4000
const UNDO_TIMEOUT = 5000

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
  }, [])

  const push = useCallback(
    (toast: Toast) => {
      setToasts((current) => [...current, toast])
      const timeout = toast.timeoutMs ?? (toast.variant === 'undo' ? UNDO_TIMEOUT : DEFAULT_TIMEOUT)
      if (timeout > 0) {
        const timer = setTimeout(() => dismiss(toast.id), timeout)
        timersRef.current.set(toast.id, timer)
      }
      return toast.id
    },
    [dismiss],
  )

  // Limpieza de timers al desmontar
  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t))
      timersRef.current.clear()
    },
    [],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: {
        success: (message, opts) =>
          push({ id: makeId(), variant: 'success', message, ...opts }),
        error: (message, opts) =>
          push({ id: makeId(), variant: 'error', message, ...opts }),
        info: (message, opts) =>
          push({ id: makeId(), variant: 'info', message, ...opts }),
        undo: ({ message, onUndo, timeoutMs, undoLabel }) =>
          push({
            id: makeId(),
            variant: 'undo',
            message,
            onUndo,
            timeoutMs,
            undoLabel,
          }),
        dismiss,
      },
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback noop para tests / componentes fuera del provider.
    // No tira para no romper render; loggea para debug.
    console.warn('[useToast] called outside <ToastProvider>')
    return {
      toast: {
        success: () => '',
        error: () => '',
        info: () => '',
        undo: () => '',
        dismiss: () => undefined,
      },
    }
  }
  return ctx
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { id, variant, message, onUndo, undoLabel } = toast

  const palette = (() => {
    switch (variant) {
      case 'success':
        return { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', icon: <CheckCircle2 size={16} className="text-emerald-300" /> }
      case 'error':
        return { border: 'border-red-500/40', bg: 'bg-red-500/10', icon: <AlertTriangle size={16} className="text-red-300" /> }
      case 'undo':
        return { border: 'border-amber-500/40', bg: 'bg-amber-500/10', icon: <RotateCcw size={16} className="text-amber-300" /> }
      case 'info':
      default:
        return { border: 'border-border', bg: 'bg-surface-light/90', icon: <Info size={16} className="text-muted" /> }
    }
  })()

  const handleUndo = async () => {
    try {
      await onUndo?.()
    } catch (err) {
      console.error('[Toast] undo handler failed', err)
    } finally {
      onDismiss(id)
    }
  }

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${palette.border} ${palette.bg} px-3.5 py-2.5 text-sm text-white shadow-xl backdrop-blur-md animate-fade-in`}
    >
      <span className="mt-0.5 flex-shrink-0">{palette.icon}</span>
      <p className="flex-1 leading-snug">{message}</p>
      {variant === 'undo' && onUndo && (
        <button
          type="button"
          onClick={handleUndo}
          className="flex-shrink-0 rounded-md border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-100 hover:bg-amber-500/25"
        >
          {undoLabel ?? 'Deshacer'}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Cerrar notificación"
        className="flex-shrink-0 rounded p-0.5 text-muted hover:text-white"
      >
        <X size={14} />
      </button>
    </div>
  )
}
