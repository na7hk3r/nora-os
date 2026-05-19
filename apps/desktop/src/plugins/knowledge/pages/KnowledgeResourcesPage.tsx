import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BookOpen, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useKnowledgeStore } from '../store'
import {
  createResource,
  deleteResource,
  setResourceStatus,
  updateResource,
} from '../operations'
import type { ResourceStatus, ResourceType } from '../types'

const TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'book', label: 'Libro' },
  { value: 'course', label: 'Curso' },
  { value: 'paper', label: 'Paper' },
  { value: 'article', label: 'Artículo' },
  { value: 'video', label: 'Video' },
]

const STATUS_LABEL: Record<ResourceStatus, string> = {
  queued: 'En cola',
  in_progress: 'En progreso',
  finished: 'Terminado',
  dropped: 'Abandonado',
}

const STATUS_FILTERS: Array<{ value: 'all' | ResourceStatus; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'queued', label: 'En cola' },
  { value: 'finished', label: 'Terminados' },
  { value: 'dropped', label: 'Abandonados' },
]

export function KnowledgeResourcesPage() {
  const [params] = useSearchParams()
  const focusId = params.get('focus')
  const resources = useKnowledgeStore((s) => s.resources)
  const [filter, setFilter] = useState<'all' | ResourceStatus>('all')
  const [showAdd, setShowAdd] = useState(false)

  const visible = useMemo(() => {
    const list = filter === 'all' ? resources : resources.filter((r) => r.status === filter)
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [resources, filter])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-caption uppercase tracking-eyebrow text-muted">Biblioteca</p>
          <h1 className="text-2xl font-semibold text-white">{resources.length} recursos</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs text-white hover:border-accent/70"
        >
          <Plus size={12} aria-hidden="true" />
          {showAdd ? 'Cerrar' : 'Nuevo recurso'}
        </button>
      </header>

      {showAdd && <ResourceQuickAdd onCreated={() => setShowAdd(false)} />}

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              filter === f.value
                ? 'border-accent bg-accent/15 text-white'
                : 'border-border bg-surface text-muted hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
          No hay recursos que coincidan con el filtro.
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {visible.map((r) => (
            <li key={r.id}>
              <ResourceRow resourceId={r.id} highlighted={focusId === r.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ResourceQuickAdd({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<ResourceType>('book')
  const [author, setAuthor] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await createResource({
        type,
        title,
        author: author.trim() || null,
        sourceUrl: sourceUrl.trim() || null,
      })
      setTitle('')
      setAuthor('')
      setSourceUrl('')
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
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_140px]">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ResourceType)}
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white"
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <input
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Autor (opcional)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
        />
        <input
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="URL (opcional)"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="self-end rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs text-white hover:border-accent/70 disabled:opacity-50"
      >
        Agregar
      </button>
    </form>
  )
}

function ResourceRow({ resourceId, highlighted }: { resourceId: string; highlighted: boolean }) {
  const r = useKnowledgeStore((s) => s.resources.find((x) => x.id === resourceId))
  const highlightCount = useKnowledgeStore(
    (s) => s.highlights.filter((h) => h.resourceId === resourceId).length,
  )
  const [expanded, setExpanded] = useState(highlighted)

  if (!r) return null

  async function changeStatus(next: ResourceStatus) {
    await setResourceStatus(resourceId, next)
  }
  async function changeProgress(next: number) {
    await updateResource(resourceId, { progress: next })
  }
  async function remove() {
    if (!confirm(`¿Eliminar "${r!.title}" y todos sus highlights/flashcards?`)) return
    await deleteResource(resourceId)
  }

  return (
    <article
      className={`rounded-2xl border bg-surface-light/85 p-4 transition-colors ${
        highlighted ? 'border-accent/70' : 'border-border'
      }`}
    >
      <header className="flex items-center gap-3">
        <BookOpen size={18} className="shrink-0 text-accent-light" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{r.title}</p>
          <p className="text-caption text-muted">
            {r.type}
            {r.author ? ` · ${r.author}` : ''} · {STATUS_LABEL[r.status]} · {r.progress}%
            {highlightCount > 0 && ` · ${highlightCount} highlights`}
          </p>
        </div>
        {r.sourceUrl && (
          <a
            href={r.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-surface p-1.5 text-muted hover:text-white"
            aria-label="Abrir fuente"
          >
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded-full border border-border bg-surface px-3 py-1 text-caption text-muted hover:text-white"
        >
          {expanded ? 'Cerrar' : 'Editar'}
        </button>
      </header>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1.5 text-caption">
            {(['queued', 'in_progress', 'finished', 'dropped'] as ResourceStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeStatus(s)}
                className={`rounded-full border px-2.5 py-1 ${
                  r.status === s
                    ? 'border-accent bg-accent/15 text-white'
                    : 'border-border bg-surface text-muted hover:text-white'
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-xs text-muted">
            <span className="w-16 shrink-0">Progreso</span>
            <input
              type="range"
              min={0}
              max={100}
              value={r.progress}
              onChange={(e) => changeProgress(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right text-white">{r.progress}%</span>
          </label>
          <button
            type="button"
            onClick={remove}
            className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-caption text-rose-200 hover:border-rose-500/70"
          >
            <Trash2 size={12} aria-hidden="true" />
            Eliminar recurso
          </button>
        </div>
      )}
    </article>
  )
}
