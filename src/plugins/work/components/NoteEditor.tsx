import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Eye, PencilLine, Pin, PinOff, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'
import { noteExtractionService } from '../noteExtractionService'
import { GlobalTagChip, GlobalTagPicker, type TagSelection } from '@core/ui/components/GlobalTagPicker'
import { TAG_ENTITY_TYPES, tagsService } from '@core/services/tagsService'

type SortMode = 'recent' | 'alpha'
type NoteViewMode = 'edit' | 'preview'

const markdownComponents: Components = {
  a: ({ children, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent-light underline underline-offset-2 hover:text-white"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent/50 pl-3 text-muted">{children}</blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = Boolean(className)
    return isBlock ? (
      <code
        className={`${className ?? ''} block overflow-x-auto rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-white/85`}
      >
        {children}
      </code>
    ) : (
      <code className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-accent-light">
        {children}
      </code>
    )
  },
  h1: ({ children }) => <h1 className="text-xl font-semibold text-white">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-semibold text-white">{children}</h2>,
  h3: ({ children }) => <h3 className="text-base font-semibold text-white">{children}</h3>,
  hr: () => <hr className="border-border" />,
  input: ({ checked, type }) => (
    <input type={type} checked={checked} readOnly disabled className="mr-2 align-middle accent-accent" />
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
  p: ({ children }) => <p>{children}</p>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-white/85">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
  td: ({ children }) => <td className="border-border px-3 py-2 align-top text-white/80">{children}</td>,
  th: ({ children }) => (
    <th className="border-border bg-surface px-3 py-2 text-left font-medium text-white">{children}</th>
  ),
  thead: ({ children }) => <thead className="border-b border-border">{children}</thead>,
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
}

function formatNoteUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function noteExcerpt(content: string): string {
  const clean = content.trim().replace(/\s+/g, ' ')
  if (!clean) return 'Sin contenido'
  return clean.length > 92 ? `${clean.slice(0, 92)}...` : clean
}

export function NoteEditor() {
  const { notes, addNote, updateNote, deleteNote } = useWorkStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const [viewMode, setViewMode] = useState<NoteViewMode>('edit')
  const { toast } = useToast()
  const [extracting, setExtracting] = useState(false)
  const [selectedTags, setSelectedTags] = useState<TagSelection[]>([])

  const selected = notes.find((n) => n.id === selectedId)
  const contentWordCount = useMemo(() => {
    const clean = content.trim()
    return clean ? clean.split(/\s+/).length : 0
  }, [content])

  const handleExtractTasks = async () => {
    if (!selected) return
    const text = (content ?? '').trim()
    if (text.length <= 200) {
      toast.info('Necesitás más contenido para extraer tareas (mínimo 200 caracteres).')
      return
    }
    setExtracting(true)
    try {
      const tasks = await noteExtractionService.extract(text)
      if (tasks.length === 0) {
        toast.info('No encontré tareas accionables en la nota.')
        return
      }
      const ids = await noteExtractionService.createCards(tasks)
      toast.success(`Creé ${ids.length} ${ids.length === 1 ? 'tarea' : 'tareas'} desde la nota.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al extraer tareas'
      toast.error(msg)
    } finally {
      setExtracting(false)
    }
  }

  const loadTagsForNote = async (note: { id: string; tags: string[] }) => {
    let tags = await tagsService.forEntity(TAG_ENTITY_TYPES.WORK_NOTE, note.id)
    if (tags.length === 0 && note.tags.length > 0) {
      const ensured = await Promise.all(note.tags.map((tag) => tagsService.ensure(tag)))
      await tagsService.setForEntity(TAG_ENTITY_TYPES.WORK_NOTE, note.id, ensured.map((tag) => tag.id))
      tags = ensured
    }
    setSelectedTags(tags)
  }

  const noteTags = useMemo(() => {
    const byName = new Map<string, { name: string; count: number }>()
    for (const note of notes) {
      for (const tag of note.tags) {
        const clean = tag.trim()
        if (!clean) continue
        const key = clean.toLowerCase()
        const current = byName.get(key)
        byName.set(key, { name: current?.name ?? clean, count: (current?.count ?? 0) + 1 })
      }
    }
    return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [notes])

  const tagSearch = useMemo(() => {
    const q = search.trim()
    if (q.startsWith('#')) return q.slice(1).trim().toLowerCase()
    if (q.toLowerCase().startsWith('tag:')) return q.slice(4).trim().toLowerCase()
    return ''
  }, [search])

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = tagSearch
      ? notes.filter((n) => n.tags.some((t) => t.toLowerCase() === tagSearch || t.toLowerCase().includes(tagSearch)))
      : q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : notes

    const sorted = [...filtered].sort((a, b) => {
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
      if (sortMode === 'alpha') return a.title.localeCompare(b.title, 'es')
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return sorted
  }, [notes, search, sortMode, tagSearch])

  const handleNew = () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note = {
      id,
      title: 'Nueva nota',
      content: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
      pinned: false,
    }
    addNote(note)
    setSelectedId(id)
    setTitle(note.title)
    setContent('')
    setViewMode('edit')
    setSelectedTags([])

    void window.storage.execute(
      'INSERT INTO work_notes (id, title, content, tags, created_at, updated_at, pinned) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, note.title, '', '[]', now, now],
    )

    eventBus.emit(WORK_EVENTS.NOTE_CREATED, { id, title: note.title })
  }

  useEffect(() => {
    const onCreate = () => handleNew()
    window.addEventListener('work:new-note', onCreate)
    return () => window.removeEventListener('work:new-note', onCreate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persistNote = async (tags: TagSelection[] = selectedTags) => {
    if (!selectedId) return
    const now = new Date().toISOString()
    const tagNames = tags.map((tag) => tag.name)
    updateNote(selectedId, { title, content, tags: tagNames, updatedAt: now })
    await window.storage.execute(
      'UPDATE work_notes SET title = ?, content = ?, tags = ?, updated_at = ? WHERE id = ?',
      [title, content, JSON.stringify(tagNames), now, selectedId],
    )
    await tagsService.setForEntity(TAG_ENTITY_TYPES.WORK_NOTE, selectedId, tags.map((tag) => tag.id))
  }

  const handleSave = async () => {
    await persistNote()
  }

  const handleViewModeChange = (nextMode: NoteViewMode) => {
    setViewMode(nextMode)
    if (nextMode === 'preview') {
      void handleSave()
    }
  }

  const handleDelete = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return

    deleteNote(id)
    void window.storage.execute('DELETE FROM work_notes WHERE id = ?', [id])
    void tagsService.unlinkEntity(TAG_ENTITY_TYPES.WORK_NOTE, id)
    if (selectedId === id) {
      setSelectedId(null)
      setTitle('')
      setContent('')
      setSelectedTags([])
    }

    toast.undo({
      message: messages.confirm.deleteNote(note.title || 'Sin título'),
      onUndo: async () => {
        addNote(note)
        await window.storage.execute(
          `INSERT INTO work_notes (id, title, content, tags, created_at, updated_at, pinned)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            note.id,
            note.title,
            note.content,
            JSON.stringify(note.tags ?? []),
            note.createdAt,
            note.updatedAt,
            note.pinned ? 1 : 0,
          ],
        )
        const tags = await Promise.all((note.tags ?? []).map((tag) => tagsService.ensure(tag)))
        await tagsService.setForEntity(TAG_ENTITY_TYPES.WORK_NOTE, note.id, tags.map((tag) => tag.id))
      },
    })
  }

  const handleTogglePin = (id: string, currentPinned: boolean) => {
    const next = !currentPinned
    updateNote(id, { pinned: next })
    window.storage.execute('UPDATE work_notes SET pinned = ? WHERE id = ?', [next ? 1 : 0, id])
  }

  const handleSelect = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (note) {
      setSelectedId(id)
      setTitle(note.title)
      setContent(note.content)
      void loadTagsForNote(note)
    }
  }

  return (
    <div className="flex min-h-[640px] gap-4">
      <aside className="flex w-72 flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-surface-light/80 shadow-xl">
        <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-white">Notas</span>
            <span className="text-micro text-muted">{filteredNotes.length} visibles</span>
          </div>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs text-accent-light hover:bg-accent/25"
          >
            <Plus size={12} />
            Nueva
          </button>
        </div>

        <div className="space-y-2 border-b border-border/60 p-2.5">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar texto o #tag..."
              className="w-full rounded-lg border border-border bg-surface/80 py-2 pl-7 pr-2 text-xs placeholder:text-muted/50 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-surface/50 p-1">
            <button
              type="button"
              onClick={() => setSortMode('recent')}
              className={`rounded-md px-2 py-1 text-micro transition-colors ${
                sortMode === 'recent'
                  ? 'bg-accent/15 text-accent-light'
                  : 'text-muted hover:bg-surface-lighter hover:text-white'
              }`}
            >
              Recientes
            </button>
            <button
              type="button"
              onClick={() => setSortMode('alpha')}
              className={`rounded-md px-2 py-1 text-micro transition-colors ${
                sortMode === 'alpha'
                  ? 'bg-accent/15 text-accent-light'
                  : 'text-muted hover:bg-surface-lighter hover:text-white'
              }`}
            >
              A-Z
            </button>
          </div>
          {noteTags.length > 0 && (
            <div className="flex max-h-14 flex-wrap gap-1 overflow-y-auto pr-1">
              {noteTags.slice(0, 8).map((tag) => (
                <GlobalTagChip
                  key={tag.name}
                  tag={{ name: tag.name, color: null }}
                  count={tag.count}
                  selected={tagSearch === tag.name.toLowerCase()}
                  className="px-1.5 py-0.5 text-[10px]"
                />
              ))}
            </div>
          )}
          {tagSearch && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-caption text-muted underline-offset-2 hover:text-white hover:underline"
            >
              Limpiar filtro de tag
            </button>
          )}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredNotes.length === 0 && (
            <div className="rounded-lg border border-dashed border-border/70 px-3 py-8 text-center text-xs text-muted/60">
              {search ? 'Sin resultados' : 'No hay notas todavía'}
            </div>
          )}
          {filteredNotes.map((n) => (
            <div
              key={n.id}
              onClick={() => handleSelect(n.id)}
              className={`group cursor-pointer rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                selectedId === n.id
                  ? 'border-accent/35 bg-accent/15 text-white'
                  : 'border-transparent text-muted hover:border-border/70 hover:bg-surface/70 hover:text-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <Pin size={10} className="shrink-0 text-accent-light" />}
                    <span className="truncate font-medium">{n.title || 'Sin titulo'}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-caption leading-snug text-muted/80">
                    {noteExcerpt(n.content)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="shrink-0 text-micro text-muted/70">{formatNoteUpdatedAt(n.updatedAt)}</span>
                    {n.tags.length > 0 && (
                      <div className="flex min-w-0 justify-end gap-1 overflow-hidden">
                        {n.tags.slice(0, 2).map((tag) => (
                          <GlobalTagChip
                            key={tag}
                            tag={{ name: tag, color: null }}
                            selected={tagSearch === tag.toLowerCase()}
                            className="px-1.5 py-0.5 text-[9px]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleTogglePin(n.id, Boolean(n.pinned))
                    }}
                    title={n.pinned ? 'Quitar pin' : 'Fijar nota'}
                    className="rounded p-1 text-muted hover:bg-surface-lighter hover:text-accent-light"
                  >
                    {n.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(n.id)
                    }}
                    title="Eliminar nota"
                    className="flex h-6 w-6 items-center justify-center rounded text-micro font-medium text-muted hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-2">
        {selected && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-surface-light/60 px-2 py-1.5 shadow-sm">
            <div className="flex items-center gap-2 px-1 text-micro uppercase tracking-eyebrow text-muted">
              <span>{contentWordCount} {contentWordCount === 1 ? 'palabra' : 'palabras'}</span>
              <span aria-hidden className="h-1 w-1 rounded-full bg-muted/50" />
              <span>{viewMode === 'edit' ? 'Edicion' : 'Vista previa'}</span>
            </div>
            <div className="flex items-center gap-2">
              {(content ?? '').trim().length > 200 && (
                <button
                  type="button"
                  onClick={() => void handleExtractTasks()}
                  disabled={extracting}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-caption text-muted hover:border-accent/40 hover:text-accent-light disabled:opacity-50"
                  title="Extraer tareas accionables con IA"
                >
                  <Sparkles size={11} />
                  {extracting ? 'Extrayendo…' : 'Extraer tareas'}
                </button>
              )}
              <div className="flex rounded-md border border-border bg-surface p-0.5" aria-label="Cambiar modo de nota">
                <button
                  type="button"
                  onClick={() => handleViewModeChange('edit')}
                  aria-pressed={viewMode === 'edit'}
                  className={`inline-flex h-6 items-center gap-1 rounded px-2 text-caption transition-colors ${
                    viewMode === 'edit' ? 'bg-accent/15 text-accent-light' : 'text-muted hover:text-white'
                  }`}
                >
                  <PencilLine size={10} aria-hidden />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleViewModeChange('preview')}
                  aria-pressed={viewMode === 'preview'}
                  className={`inline-flex h-6 items-center gap-1 rounded px-2 text-caption transition-colors ${
                    viewMode === 'preview' ? 'bg-accent/15 text-accent-light' : 'text-muted hover:text-white'
                  }`}
                >
                  <Eye size={10} aria-hidden />
                  Vista
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/80 bg-surface-light/90 shadow-xl">
          {selected ? (
            <>
              <div className="border-b border-border/50 px-6 pb-3 pt-5">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => void handleSave()}
                  className="w-full bg-transparent text-2xl font-semibold leading-tight text-white outline-none placeholder:text-muted/45"
                  placeholder="Título"
                />
                <GlobalTagPicker
                  selected={selectedTags}
                  onChange={(tags) => {
                    setSelectedTags(tags)
                    void persistNote(tags)
                  }}
                  label="Tags"
                  placeholder="Buscar o crear tag para esta nota"
                  className="mt-3 max-w-3xl [&>label>div]:rounded-lg [&>label>div]:border-border/60 [&>label>div]:bg-surface/45 [&>label>div]:p-2 [&>label>span]:text-micro [&_input]:text-xs"
                />
              </div>
              {viewMode === 'edit' ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onBlur={() => void handleSave()}
                  className="min-h-[430px] flex-1 resize-none bg-transparent px-6 py-5 text-[15px] leading-7 text-white/90 outline-none placeholder:text-muted/50"
                  placeholder="Escribí la nota…"
                />
              ) : (
                <div className="min-h-[430px] flex-1 overflow-y-auto px-6 py-5 text-[15px] leading-7 text-white/85">
                  {content.trim() ? (
                    <div className="max-w-3xl space-y-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-muted">Sin contenido todavía.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full min-h-[520px] items-center justify-center px-6 text-center text-sm text-muted">
              Selecciona o crea una nota
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
