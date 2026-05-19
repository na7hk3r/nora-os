import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface CollapsibleSectionProps {
  /** Identificador estable; usado para persistir el estado en localStorage. */
  id: string
  title: string
  description?: string
  /** Icono opcional a la izquierda del título. */
  icon?: ReactNode
  /** Contador / badge a la derecha del título (ej. "3 errores"). */
  badge?: ReactNode
  /** Si la sección debe estar abierta por defecto la primera vez. Default: true. */
  defaultOpen?: boolean
  /** Si está vacío/no tiene datos relevantes, podemos mostrar resumen plegado. */
  summary?: ReactNode
  className?: string
  children: ReactNode
}

const STORAGE_PREFIX = 'control-center:section-open:'

function readPersisted(id: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + id)
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch {
    /* ignore */
  }
  return fallback
}

/**
 * Wrapper plegable para secciones del Control Center.
 *
 * Diseño: header siempre visible con título, descripción, badge opcional y
 * chevron animado. El cuerpo se monta sólo cuando está abierto para no
 * costar render (especialmente para secciones pesadas como Auditoría).
 *
 * Persiste el estado abierto/cerrado por `id` en localStorage para que
 * las preferencias del usuario sobrevivan recargas.
 */
export function CollapsibleSection({
  id,
  title,
  description,
  icon,
  badge,
  defaultOpen = true,
  summary,
  className = '',
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState<boolean>(() => readPersisted(id, defaultOpen))

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + id, open ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [id, open])

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-surface-light/85 ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`cc-section-${id}`}
        className="group flex w-full items-center gap-3 px-6 py-4 text-left transition-colors hover:bg-surface-light"
      >
        {icon && <span className="shrink-0 text-accent-light">{icon}</span>}
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold">
            {title}
            {badge && <span className="shrink-0">{badge}</span>}
          </h2>
          {description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted">{description}</p>
          )}
        </div>
        {!open && summary && (
          <div className="hidden shrink-0 text-xs text-muted md:block" aria-hidden>
            {summary}
          </div>
        )}
        <ChevronDown
          size={18}
          className={`shrink-0 text-muted transition-transform duration-200 group-hover:text-accent-light ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      {open && (
        <div id={`cc-section-${id}`} className="px-6 pb-6 pt-2">
          {children}
        </div>
      )}
    </section>
  )
}
