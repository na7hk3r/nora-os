import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain, Highlighter, Library, PlayCircle } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useKnowledgeStore } from '../store'
import { dueFlashcards, isMastered } from '../utils'

export function KnowledgeDashboard() {
  const navigate = useNavigate()
  const resources = useKnowledgeStore((s) => s.resources)
  const highlights = useKnowledgeStore((s) => s.highlights)
  const flashcards = useKnowledgeStore((s) => s.flashcards)

  const summary = useMemo(() => {
    const inProgress = resources.filter((r) => r.status === 'in_progress')
    const queued = resources.filter((r) => r.status === 'queued')
    const finished = resources.filter((r) => r.status === 'finished')
    const due = dueFlashcards(flashcards)
    const mastered = flashcards.filter(isMastered).length
    return { inProgress, queued, finished, due, mastered }
  }, [resources, flashcards])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <BrandIcon name="TomeIdea" size={44} />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">Conocimiento</p>
            <h1 className="text-2xl font-bold text-white">
              {summary.inProgress.length} en progreso · {summary.due.length} para repasar
            </h1>
            <p className="text-xs text-muted">
              {summary.finished.length} recursos terminados · {summary.mastered} flashcards dominadas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => navigate('/knowledge/resources')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <Library size={12} aria-hidden="true" />
            Biblioteca
          </button>
          <button
            type="button"
            onClick={() => navigate('/knowledge/highlights')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <Highlighter size={12} aria-hidden="true" />
            Highlights ({highlights.length})
          </button>
          <button
            type="button"
            onClick={() => navigate('/knowledge/review')}
            className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-white hover:border-accent/70"
          >
            <Brain size={12} aria-hidden="true" />
            Repasar ({summary.due.length})
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-medium text-muted">En progreso</h2>
        {summary.inProgress.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 py-10 text-center text-muted">
            <BrandIcon name="TomeIdea" size={48} tile={false} className="opacity-40" />
            <p className="text-sm">No tenés nada en progreso.</p>
            <p className="text-xs">Empezá un recurso desde la biblioteca.</p>
          </div>
        ) : (
          <ul className="grid max-h-[360px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2" role="list">
            {summary.inProgress.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/knowledge/resources?focus=${encodeURIComponent(r.id)}`)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-light/85 p-4 text-left hover:border-accent/50"
                >
                  <BookOpen size={18} className="shrink-0 text-accent-light" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{r.title}</p>
                    <p className="text-caption text-muted">
                      {r.type} · {r.progress}%{r.author ? ` · ${r.author}` : ''}
                    </p>
                  </div>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-micro uppercase tracking-wide text-muted">
                    en progreso
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {summary.queued.length > 0 && (
        <section>
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
            <PlayCircle size={14} aria-hidden="true" /> Cola ({summary.queued.length})
          </h2>
          <ul className="flex max-h-[112px] flex-wrap gap-2 overflow-y-auto pr-1" role="list">
            {summary.queued.slice(0, 8).map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/knowledge/resources?focus=${encodeURIComponent(r.id)}`)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted hover:border-accent/50 hover:text-white"
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
