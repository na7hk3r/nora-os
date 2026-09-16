import { type KeyboardEvent as ReactKeyboardEvent, useRef, useState } from 'react'
import { Check, Folder, Plus } from 'lucide-react'
import type { Project } from '../types'

interface Props {
  /** Proyecto actualmente seleccionado (null = sin proyecto). */
  value: Project | null
  /** Proyectos disponibles para elegir (no archivados). */
  projects: Project[]
  /** Se emite al seleccionar un proyecto (null deselecciona). */
  onChange: (project: Project | null) => void
  /** Se emite al pulsar "+ Nuevo proyecto". */
  onCreate: () => void
}

/**
 * Selector de proyecto (combobox accesible). Permite elegir entre los
 * proyectos activos, deseleccionar (alternando el proyecto actual) y crear
 * uno nuevo mediante la opción "+ Nuevo proyecto" que delega en el padre.
 */
export function ProjectPicker({ value, projects, onChange, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const options = [
    ...projects.map((project) => ({ type: 'project' as const, key: project.id, project })),
    { type: 'create' as const, key: '__create__', project: null },
  ]

  const applyOption = (option: (typeof options)[number]) => {
    setOpen(false)
    setHighlightedIndex(-1)
    if (option.type === 'create') {
      onCreate()
      return
    }
    if (option.project.id === value?.id) {
      onChange(null)
      return
    }
    onChange(option.project)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === 'Escape' || event.key === ' ') {
        setOpen(true)
        setHighlightedIndex(value ? -1 : 0)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      setHighlightedIndex((prev) => (prev + 1) % options.length)
    } else if (event.key === 'ArrowUp') {
      setHighlightedIndex((prev) => (prev - 2 + options.length) % options.length)
    } else if (event.key === 'Enter') {
      const index = highlightedIndex >= 0 ? highlightedIndex : 0
      applyOption(options[index]!)
    } else if (event.key === 'Escape') {
      setOpen(false)
      setHighlightedIndex(-1)
    }
    event.preventDefault()
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Proyecto"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-white transition-colors hover:border-accent/40 focus:border-accent/60 focus:outline-none"
      >
        {value ? (
          <>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: value.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-left">{value.name}</span>
          </>
        ) : (
          <span className="min-w-0 flex-1 truncate text-left text-muted">Sin proyecto</span>
        )}
        <Folder size={14} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Proyecto"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface-light p-1 shadow-2xl"
        >
          {options.map((option, index) => (
            <li key={option.key} role="option" aria-selected={option.type === 'project' && option.project.id === value?.id}>
              <button
                type="button"
                onClick={() => applyOption(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-white transition-colors ${
                  index === highlightedIndex ? 'bg-surface' : ''
                }`}
              >
                {option.type === 'create' ? (
                  <>
                    <Plus size={14} className="shrink-0 text-accent-light" aria-hidden="true" />
                    <span>+ Nuevo proyecto</span>
                  </>
                ) : (
                  <>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: option.project.color }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{option.project.name}</span>
                    {option.project.id === value?.id && (
                      <Check size={14} className="shrink-0 text-accent-light" aria-hidden="true" />
                    )}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
