import { useMemo, useState } from 'react'
import { Search, Pin } from 'lucide-react'
import { useJournalStore } from '../store'
import { matchesQuery, moodLabel } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Historial completo del Journal con búsqueda y filtros básicos.
 */
export function JournalHistoryPage() {
  const entries = useJournalStore((s) => s.entries)
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [pinnedOnly, setPinnedOnly] = useState(false)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) for (const t of e.tags) set.add(t)
    return Array.from(set).sort()
  }, [entries])

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (pinnedOnly ? e.pinned : true))
      .filter((e) => (tagFilter ? e.tags.includes(tagFilter) : true))
      .filter((e) => matchesQuery(e, query))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.date.localeCompare(a.date)
      })
  }, [entries, query, tagFilter, pinnedOnly])

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <p className="text-caption uppercase tracking-eyebrow text-muted">Journal</p>
        <h1 className="text-2xl font-semibold text-white">Historial</h1>
        <p className="text-xs text-muted">{entries.length} entradas totales · {filtered.length} visibles</p>
      </header>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface-light/80 p-3" aria-label="Filtros de historial">
        <label className="flex flex-1 min-w-[12rem] items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5">
          <Search size={14} className="text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por texto, título o tag"
            aria-label="Buscar entradas"
            className="flex-1 bg-transparent text-sm text-white outline-none"
          />
        </label>
        <select
          value={tagFilter ?? ''}
          onChange={(e) => setTagFilter(e.target.value || null)}
          className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
          aria-label="Filtrar por tag"
        >
          <option value="">Todos los tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>#{t}</option>
          ))}
        </select>
        <label className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-white">
          <input
            type="checkbox"
            checked={pinnedOnly}
            onChange={(e) => setPinnedOnly(e.target.checked)}
          />
          <Pin size={12} aria-hidden="true" /> Solo fijados
        </label>
      </section>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-8 text-center text-sm text-muted">
          {query || tagFilter || pinnedOnly ? messages.empty.journalSearch : messages.empty.journalEntries}
        </p>
      ) : (
        <ul className="space-y-2" role="list">
          {filtered.map((e) => (
            <li key={e.id}>
              <article className="rounded-2xl border border-border bg-surface-light/80 p-4">
                <header className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-white">{e.date}</span>
                  {e.pinned && <Pin size={12} className="text-amber-300" aria-label="Fijada" />}
                  <span className="ml-auto text-muted">{moodLabel(e.mood)} · {e.wordCount} palabras</span>
                </header>
                {e.title && <h2 className="mt-1 text-base font-semibold text-white">{e.title}</h2>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/90 line-clamp-6">{e.content}</p>
                {e.tags.length > 0 && (
                  <p className="mt-2 flex flex-wrap gap-1 text-caption text-accent-light">
                    {e.tags.map((t) => (
                      <span key={t} className="rounded border border-border px-1.5 py-0.5">#{t}</span>
                    ))}
                  </p>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
