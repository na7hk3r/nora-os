import { useEffect, useMemo, useState } from 'react'
import { Pin, PinOff, Plus, Search, Trash2, Sparkles } from 'lucide-react'
import { useWorkStore } from '../store'
import { eventBus } from '@core/events/EventBus'
import { WORK_EVENTS } from '../events'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'
import { noteExtractionService } from '../noteExtractionService'

type SortMode = 'recent' | 'alpha'

export function NoteEditor() {
  const { notes, addNote, updateNote, deleteNote } = useWorkStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('recent')
  const { toast } = useToast()
  const [extracting, setExtracting] = useState(false)

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

  const selected = notes.find((n) => n.id === selectedId)

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q)),
        )
      : notes

    const sorted = [...filtered].sort((a, b) => {
      // Pinned siempre arriba.
      if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
      if (sortMode === 'alpha') return a.title.localeCompare(b.title, 'es')
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return sorted
  }, [notes, search, sortMode])

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

    window.storage.execute(
      'INSERT INTO work_notes (id, title, content, tags, created_at, updated_at, pinned) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, note.title, '', '[]', now, now],
    )

    eventBus.emit(WORK_EVENTS.NOTE_CREATED, { id, title: note.title })
  }

  // Atajo global Ctrl/Cmd + N → crea nota desde cualquier lugar.
  useEffect(() => {
    const onCreate = () => handleNew()
    window.addEventListener('work:new-note', onCreate)
    return () => window.removeEventListener('work:new-note', onCreate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = () => {
    if (!selectedId) return
    const now = new Date().toISOString()
    updateNote(selectedId, { title, content, updatedAt: now })
    window.storage.execute(
      'UPDATE work_notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
      [title, content, now, selectedId],
    )
  }

  const handleDelete = (id: string) => {
    const note = notes.find((n) => n.id === id)
    if (!note) return

    deleteNote(id)
    void window.storage.execute('DELETE FROM work_notes WHERE id = ?', [id])
    if (selectedId === id) {
      setSelectedId(null)
      setTitle('')
      setContent('')
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
    }
  }

  return (
    <div className="flex gap-4 h-[500px]">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 bg-surface-light rounded-xl border border-border overflow-hidden flex flex-col">
        <div className="p-3 border-b border-border flex justify-between items-center">
          <span className="text-sm font-semibold">Notas</span>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-1 rounded-md bg-accent/15 px-2 py-1 text-xs text-accent-light hover:bg-accent/25"
          >
            <Plus size={12} />
            Nueva
          </button>
        </div>

        <div className="p-2 border-b border-border/60 space-y-2">
          <div className="relative">
            <Search
              size={12}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full rounded-md border border-border bg-surface pl-7 pr-2 py-1.5 text-xs placeholder:text-muted/50 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setSortMode('recent')}
              className={`flex-1 rounded border px-2 py-1 text-micro transition-colors ${
                sortMode === 'recent'
                  ? 'border-accent/50 bg-accent/15 text-accent-light'
                  : 'border-border bg-surface text-muted hover:text-white'
              }`}
            >
              Recientes
            </button>
            <button
              onClick={() => setSortMode('alpha')}
              className={`flex-1 rounded border px-2 py-1 text-micro transition-colors ${
                sortMode === 'alpha'
                  ? 'border-accent/50 bg-accent/15 text-accent-light'
                  : 'border-border bg-surface text-muted hover:text-white'
              }`}
            >
              A→Z
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 && (
            <div className="text-center text-xs text-muted/60 py-6">
              {search ? 'Sin resultados' : 'No hay notas todavía'}
            </div>
          )}
          {filteredNotes.map((n) => {
            return (
              <div
                key={n.id}
                onClick={() => handleSelect(n.id)}
                className={`px-3 py-2 rounded-lg text-sm cursor-pointer group ${
                  selectedId === n.id
                    ? 'bg-accent/20 text-accent-light'
                    : 'text-muted hover:bg-surface-lighter'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {n.pinned && <Pin size={10} className="text-accent-light shrink-0" />}
                      <span className="truncate">{n.title}</span>
                    </div>
                    {n.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {n.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-surface px-1.5 py-0.5 text-[9px] text-muted/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTogglePin(n.id, Boolean(n.pinned))
                      }}
                      title={n.pinned ? 'Quitar pin' : 'Fijar nota'}
                      className="text-muted hover:text-accent-light"
                    >
                      {n.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(n.id)
                      }}
                      title={'Eliminar nota'}
                      className="text-micro font-medium flex items-center justify-center w-5 h-5 rounded text-muted hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 bg-surface-light rounded-xl border border-border flex flex-col overflow-hidden">
        {selected ? (
          <>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              className="bg-transparent border-b border-border px-4 py-3 text-lg font-semibold outline-none"
              placeholder="Título"
            />
            {(content ?? '').trim().length > 200 ? (
              <div className="flex items-center justify-end gap-2 border-b border-border/60 px-4 py-1.5">
                <button
                  type="button"
                  onClick={() => void handleExtractTasks()}
                  disabled={extracting}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-caption text-muted hover:text-accent-light hover:border-accent/40 disabled:opacity-50"
                  title="Extraer tareas accionables con IA"
                >
                  <Sparkles size={11} />
                  {extracting ? 'Extrayendo…' : 'Extraer tareas'}
                </button>
              </div>
            ) : null}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={handleSave}
              className="flex-1 bg-transparent px-4 py-3 text-sm resize-none outline-none leading-relaxed"
              placeholder="Escribí la nota…"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted text-sm">
            Selecciona o crea una nota
          </div>
        )}
      </div>
    </div>
  )
}
