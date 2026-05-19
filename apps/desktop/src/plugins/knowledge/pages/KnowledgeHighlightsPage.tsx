import { useMemo, useState } from 'react'
import { Highlighter, Plus, Trash2, Zap } from 'lucide-react'
import { useKnowledgeStore } from '../store'
import {
  createFlashcard,
  createHighlight,
  deleteHighlight,
  emitHighlightPromotedToTask,
} from '../operations'

export function KnowledgeHighlightsPage() {
  const resources = useKnowledgeStore((s) => s.resources)
  const highlights = useKnowledgeStore((s) => s.highlights)
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)

  const visible = useMemo(() => {
    const list =
      resourceFilter === 'all'
        ? highlights
        : highlights.filter((h) => h.resourceId === resourceFilter)
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [highlights, resourceFilter])

  const resourceById = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of resources) map.set(r.id, r.title)
    return map
  }, [resources])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-caption uppercase tracking-eyebrow text-muted">Highlights</p>
          <h1 className="text-2xl font-semibold text-white">{highlights.length}</h1>
          <p className="text-xs text-muted">Citas y notas ancladas a tus recursos</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          disabled={resources.length === 0}
          className="inline-flex items-center gap-1 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-white hover:border-accent/70 disabled:opacity-50"
        >
          <Plus size={12} aria-hidden="true" />
          {showAdd ? 'Cerrar' : 'Nuevo highlight'}
        </button>
      </header>

      {showAdd && resources.length > 0 && (
        <HighlightQuickAdd onCreated={() => setShowAdd(false)} />
      )}

      <label className="flex items-center gap-2 text-xs text-muted">
        <span>Filtrar por recurso:</span>
        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-white"
        >
          <option value="all">Todos</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
      </label>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
          {resources.length === 0
            ? 'Agregá un recurso primero para anotar highlights.'
            : 'Sin highlights todavía.'}
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {visible.map((h) => (
            <li
              key={h.id}
              className="rounded-2xl border border-border bg-surface-light/85 p-4"
            >
              <header className="flex items-start gap-2">
                <Highlighter size={14} className="mt-1 shrink-0 text-amber-300" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-caption uppercase tracking-wide text-muted">
                    {resourceById.get(h.resourceId) ?? '(recurso eliminado)'}
                    {h.page != null && ` · p.${h.page}`}
                  </p>
                </div>
              </header>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white">{h.text}</p>
              {h.note && <p className="mt-1.5 text-xs italic text-muted">{h.note}</p>}
              <footer className="mt-3 flex flex-wrap gap-1.5 text-caption">
                <button
                  type="button"
                  onClick={async () => {
                    await createFlashcard({
                      front: h.text.slice(0, 200),
                      back: h.note?.trim() || '(completá la respuesta)',
                      resourceId: h.resourceId,
                      deck: resourceById.get(h.resourceId) ?? 'general',
                    })
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-muted hover:border-accent/50 hover:text-white"
                >
                  <Zap size={10} aria-hidden="true" />
                  Convertir a flashcard
                </button>
                <button
                  type="button"
                  onClick={() => emitHighlightPromotedToTask(h.id, h.resourceId)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-muted hover:border-accent/50 hover:text-white"
                  title="Marca este highlight como tarea pendiente (evento)"
                >
                  → Tarea
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('¿Eliminar highlight?')) return
                    await deleteHighlight(h.id)
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-rose-200 hover:border-rose-500/70"
                >
                  <Trash2 size={10} aria-hidden="true" />
                  Eliminar
                </button>
              </footer>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function HighlightQuickAdd({ onCreated }: { onCreated: () => void }) {
  const resources = useKnowledgeStore((s) => s.resources)
  const inProgress = resources.filter((r) => r.status === 'in_progress')
  const initial = inProgress[0]?.id ?? resources[0]?.id ?? ''

  const [resourceId, setResourceId] = useState(initial)
  const [text, setText] = useState('')
  const [page, setPage] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !resourceId || busy) return
    setBusy(true)
    try {
      await createHighlight({
        resourceId,
        text,
        page: page ? Number(page) : null,
        note: note.trim() || null,
      })
      setText('')
      setPage('')
      setNote('')
      onCreated()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-light/80 p-4"
    >
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px]">
        <select
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white"
        >
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title}
            </option>
          ))}
        </select>
        <input
          inputMode="numeric"
          value={page}
          onChange={(e) => setPage(e.target.value.replace(/\D/g, ''))}
          placeholder="Página"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
        />
      </div>
      <textarea
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Texto del highlight"
        rows={3}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Tu nota (opcional)"
        rows={2}
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={busy || !text.trim() || !resourceId}
        className="self-end rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs text-white hover:border-accent/70 disabled:opacity-50"
      >
        Guardar
      </button>
    </form>
  )
}
