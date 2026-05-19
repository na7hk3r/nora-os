import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, Hash, ListTodo, Loader2, Notebook, Plus, Tag, X } from 'lucide-react'
import { tagsService, type Tag as TagModel } from '@core/services/tagsService'
import { getCurrentLocale } from '@core/i18n'
import {
  getTagConnections,
  TAG_CONNECTION_KIND_LABEL,
  type TagConnectionItem,
} from '@core/services/tagConnectionsService'

export type TagSelection = Pick<TagModel, 'id' | 'name' | 'color'>

type PopoverPosition = {
  top: number
  left: number
}

const CONNECTION_ICONS: Record<TagConnectionItem['kind'], typeof Notebook> = {
  note: Notebook,
  work_card: ListTodo,
  planner_task: CalendarDays,
  other: Hash,
}

function TagConnectionsPopover({
  tag,
  position,
  onClose,
  popoverRef,
}: {
  tag: Pick<TagSelection, 'name' | 'color'> & Partial<Pick<TagSelection, 'id'>>
  position: PopoverPosition
  onClose: () => void
  popoverRef: RefObject<HTMLDivElement | null>
}) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<TagConnectionItem[]>([])
  const [resolvedName, setResolvedName] = useState(tag.name)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    void getTagConnections(tag)
      .then((connections) => {
        if (cancelled) return
        setResolvedName(connections.tag?.name ?? (connections.queryName || tag.name))
        setItems(connections.items)
        setNotFound(!connections.tag)
      })
      .catch(() => {
        if (cancelled) return
        setItems([])
        setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tag])

  const openItem = (item: TagConnectionItem) => {
    onClose()
    navigate(item.ctaPath)
  }

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[130] w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-border bg-surface-light shadow-2xl"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={`Conexiones de tag ${resolvedName}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <Hash size={13} aria-hidden />
            <span className="truncate">{resolvedName}</span>
          </p>
          <p className="mt-0.5 text-caption text-muted">
            {loading ? 'Buscando conexiones...' : `${items.length} conexion${items.length === 1 ? '' : 'es'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-surface hover:text-white"
          aria-label="Cerrar conexiones"
        >
          <X size={14} aria-hidden />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" aria-hidden />
            Cargando conexiones
          </div>
        ) : notFound ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-3 text-xs text-muted">
            Este tag todavia no existe como tag global.
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-3 text-xs text-muted">
            No hay notas, tarjetas de Work ni tareas del Planner vinculadas.
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const Icon = CONNECTION_ICONS[item.kind]
              return (
                <button
                  key={`${item.entityType}:${item.id}`}
                  type="button"
                  onClick={() => openItem(item)}
                  className="flex w-full items-start gap-2 rounded-lg border border-transparent px-2.5 py-2 text-left text-xs text-foreground/90 hover:border-border hover:bg-surface"
                >
                  <Icon size={13} className="mt-0.5 shrink-0 text-accent-light" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-white">{item.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted">
                      {TAG_CONNECTION_KIND_LABEL[item.kind]}{item.subtitle ? ` - ${item.subtitle}` : ''}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export function GlobalTagChip({
  tag,
  selected = false,
  count,
  onClick,
  onRemove,
  title,
  className = '',
}: {
  tag: Pick<TagSelection, 'name' | 'color'> & Partial<Pick<TagSelection, 'id'>>
  selected?: boolean
  count?: number
  onClick?: () => void
  onRemove?: () => void
  title?: string
  className?: string
}) {
  const rootRef = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const borderColor = tag.color ?? undefined
  const canInspect = !onClick && Boolean(tag.name.trim())

  const updatePopoverPosition = () => {
    const rect = rootRef.current?.getBoundingClientRect()
    if (!rect || typeof window === 'undefined') return { top: 0, left: 0 }
    const width = Math.min(352, window.innerWidth - 24)
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left))
    const preferredTop = rect.bottom + 8
    const top = Math.min(preferredTop, Math.max(12, window.innerHeight - 332))
    return { top, left }
  }

  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition>(() => ({ top: 0, left: 0 }))

  useEffect(() => {
    if (!open) return undefined

    const syncPosition = () => setPopoverPosition(updatePopoverPosition())
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || popoverRef.current?.contains(target)) return
      setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    syncPosition()
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
    }
  }, [open])

  const label = (
    <>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80"
        aria-hidden
      />
      <span className="max-w-[9rem] truncate">{tag.name}</span>
      {typeof count === 'number' && (
        <span className="rounded-full bg-white/10 px-1.5 py-0 text-[9px] leading-4 opacity-80">
          {count}
        </span>
      )}
    </>
  )

  return (
    <span
      ref={rootRef}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border bg-surface px-2 py-1 text-caption font-medium shadow-sm transition-colors ${
        selected ? 'ring-1 ring-white/30' : ''
      } ${onClick || canInspect ? 'hover:bg-surface-lighter' : ''} ${className}`}
      style={borderColor ? { borderColor, color: borderColor } : undefined}
    >
      {onClick ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onClick()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="inline-flex min-w-0 items-center gap-1.5"
          title={title ?? `Filtrar por ${tag.name}`}
        >
          {label}
        </button>
      ) : canInspect ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setPopoverPosition(updatePopoverPosition())
            setOpen((current) => !current)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="inline-flex min-w-0 items-center gap-1.5"
          title={title ?? `Ver conexiones de ${tag.name}`}
          aria-expanded={open}
        >
          {label}
        </button>
      ) : (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          {label}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="rounded-full p-0.5 text-current/70 hover:bg-white/10 hover:text-white"
          aria-label={`Quitar tag ${tag.name}`}
        >
          <X size={10} aria-hidden />
        </button>
      )}
      {open && (
        <TagConnectionsPopover
          tag={tag}
          position={popoverPosition}
          onClose={() => setOpen(false)}
          popoverRef={popoverRef}
        />
      )}
    </span>
  )
}

const DEFAULT_COLOR = '#8b5cf6'

function sortTags(tags: TagSelection[]): TagSelection[] {
  const locale = getCurrentLocale()
  return [...tags].sort((a, b) => a.name.localeCompare(b.name, locale))
}

export function GlobalTagPicker({
  selected,
  onChange,
  label = 'Tags',
  placeholder = 'Buscar o crear tag',
  className = '',
}: {
  selected: TagSelection[]
  onChange: (tags: TagSelection[]) => void
  label?: string
  placeholder?: string
  className?: string
}) {
  const [allTags, setAllTags] = useState<TagSelection[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = async () => {
    const list = await tagsService.list()
    setAllTags(sortTags(list))
  }

  useEffect(() => {
    void refresh().catch(() => setAllTags([]))
  }, [])

  const selectedIds = useMemo(() => new Set(selected.map((tag) => tag.id)), [selected])
  const normalizedQuery = query.trim().toLowerCase()
  const filtered = allTags.filter((tag) => (
    !selectedIds.has(tag.id) && (!normalizedQuery || tag.name.toLowerCase().includes(normalizedQuery))
  ))
  const canCreate = Boolean(
    normalizedQuery &&
    !allTags.some((tag) => tag.name.toLowerCase() === normalizedQuery),
  )

  const addTag = (tag: TagSelection) => {
    onChange(sortTags([...selected, tag]))
    setQuery('')
  }

  const removeTag = (tagId: number) => {
    onChange(selected.filter((tag) => tag.id !== tagId))
  }

  const createTag = async () => {
    const name = query.trim()
    if (!name) return
    setBusy(true)
    setError('')
    try {
      const tag = await tagsService.ensure(name, DEFAULT_COLOR)
      await refresh()
      addTag(tag)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el tag')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block space-y-1">
        <span className="text-xs text-muted">{label}</span>
        <div className="rounded-xl border border-border bg-surface-light/60 p-2">
          <div className="flex flex-wrap gap-1.5">
            {selected.map((tag) => (
              <GlobalTagChip
                key={tag.id}
                tag={tag}
                onRemove={() => removeTag(tag.id)}
              />
            ))}
            {selected.length === 0 && (
              <span className="px-1 py-1 text-caption text-muted/75">Sin tags</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Tag size={13} className="shrink-0 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                if (filtered[0]) addTag(filtered[0])
                else if (canCreate) void createTag()
              }}
              placeholder={placeholder}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/50"
            />
            {canCreate && (
              <button
                type="button"
                onClick={() => void createTag()}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-md border border-accent/40 px-2 py-1 text-caption text-accent-light hover:bg-accent/10 disabled:opacity-50"
              >
                <Plus size={11} aria-hidden />
                Crear
              </button>
            )}
          </div>
        </div>
      </label>

      {query && filtered.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filtered.slice(0, 8).map((tag) => (
            <GlobalTagChip
              key={tag.id}
              tag={tag}
              onClick={() => addTag(tag)}
            />
          ))}
        </div>
      )}

      {error && <p className="text-caption text-warning">{error}</p>}
    </div>
  )
}
