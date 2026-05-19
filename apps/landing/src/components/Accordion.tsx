import { useId, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface AccordionItem {
  /** Identificador único — usado para keys y aria. */
  id?: string
  /** Texto del trigger. */
  question: string
  /** Contenido del panel. Puede ser texto o JSX. */
  answer: ReactNode
}

export interface AccordionProps {
  items: AccordionItem[]
  /** Permitir múltiples paneles abiertos a la vez. Default false. */
  allowMultiple?: boolean
  /** Índice(s) abierto(s) por defecto. */
  defaultOpen?: number | number[]
  className?: string
}

/**
 * Acordeón accesible: expand/collapse por ítem, con animación CSS.
 * - Soporta single (default) y multi-open.
 * - Usa <button> + region pattern (ARIA), con teclado nativo.
 */
export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen,
  className = '',
}: AccordionProps) {
  const initial = new Set<number>(
    Array.isArray(defaultOpen)
      ? defaultOpen
      : typeof defaultOpen === 'number'
        ? [defaultOpen]
        : [],
  )
  const [openSet, setOpenSet] = useState<Set<number>>(initial)
  const baseId = useId()

  function toggle(idx: number) {
    setOpenSet((prev) => {
      const next = new Set(allowMultiple ? prev : [])
      if (prev.has(idx)) {
        next.delete(idx)
      } else {
        next.add(idx)
      }
      return next
    })
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, idx) => {
        const isOpen = openSet.has(idx)
        const triggerId = `${baseId}-trigger-${idx}`
        const panelId = `${baseId}-panel-${idx}`
        return (
          <div
            key={item.id ?? item.question}
            className={`rounded-xl border bg-surface/60 overflow-hidden transition-colors ${
              isOpen ? 'border-accent/50' : 'border-border hover:border-accent/40'
            }`}
          >
            <h3 className="m-0">
              <button
                id={triggerId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(idx)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 font-medium text-foreground hover:bg-surface-light/40 transition-colors"
              >
                <span>{item.question}</span>
                <ChevronDown
                  aria-hidden="true"
                  className={`w-4 h-4 shrink-0 text-accent transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              hidden={!isOpen}
              className="px-5 pb-5 text-sm text-muted leading-relaxed animate-fade-in"
            >
              {item.answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}
