import { ReactNode } from 'react'
import { AlertTriangle, Info, Zap } from 'lucide-react'

export type StateType = 'loading' | 'error' | 'empty' | 'idle'

export interface StateCardProps {
  state: StateType
  title?: string
  message?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  children?: ReactNode
}

/**
 * Unified state card component for Loading, Error, and Empty states
 * Ensures consistent styling and UX across the app
 */
export function StateCard({
  state,
  title,
  message,
  icon,
  action,
  children,
}: StateCardProps) {
  if (children && state === 'idle') {
    return children
  }

  const stateConfig: Record<
    StateType,
    {
      bg: string
      icon: ReactNode
      titleText: string
      defaultMessage: string
    }
  > = {
    loading: {
      bg: 'bg-slate-900/50 border-slate-700',
      icon: <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-500 border-t-blue-500" />,
      titleText: 'Cargando...',
      defaultMessage: 'Por favor espera',
    },
    error: {
      bg: 'bg-red-950/30 border-red-800',
      icon: icon || <AlertTriangle className="h-6 w-6 text-red-400" />,
      titleText: 'Error',
      defaultMessage: 'Algo salió mal',
    },
    empty: {
      bg: 'bg-slate-800/40 border-slate-700',
      icon: icon || <Info className="h-6 w-6 text-slate-400" />,
      titleText: 'Sin datos',
      defaultMessage: 'No hay información disponible',
    },
    idle: {
      bg: 'bg-transparent',
      icon: <Zap className="h-6 w-6 text-slate-400" />,
      titleText: 'Inactivo',
      defaultMessage: 'Listo para comenzar',
    },
  }

  const config = stateConfig[state]

  return (
    <div
      className={`rounded-lg border px-4 py-8 text-center ${config.bg} flex flex-col items-center gap-3`}
    >
      {config.icon}
      <h3 className="text-sm font-semibold text-slate-300">{title || config.titleText}</h3>
      <p className="text-xs text-slate-400">{message || config.defaultMessage}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Skeleton loader component for placeholder content
 */
export function SkeletonLoader({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-slate-800" />
      ))}
    </div>
  )
}
