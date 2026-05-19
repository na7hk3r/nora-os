import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Brain } from 'lucide-react'
import { useKnowledgeStore } from '../store'
import { dueFlashcards } from '../utils'

/**
 * Widget compacto del Dashboard. Muestra recursos en progreso y flashcards
 * pendientes de repaso hoy.
 */
export function KnowledgeSummaryWidget() {
  const navigate = useNavigate()
  const resources = useKnowledgeStore((s) => s.resources)
  const flashcards = useKnowledgeStore((s) => s.flashcards)

  const summary = useMemo(() => {
    const inProgress = resources.filter((r) => r.status === 'in_progress')
    const due = dueFlashcards(flashcards).length
    return { inProgress, due, total: resources.length }
  }, [resources, flashcards])

  if (summary.total === 0 && summary.due === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/knowledge/resources')}
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted hover:text-white"
      >
        Agregar primer recurso
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/knowledge')}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 text-left shadow-xl transition-colors hover:border-accent/50"
      aria-label={`Conocimiento: ${summary.inProgress.length} en progreso, ${summary.due} para repasar`}
    >
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-accent-light" aria-hidden="true" />
        <span className="text-caption uppercase tracking-eyebrow text-muted">Conocimiento</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">
          {summary.inProgress.length}
          <span className="text-muted text-base"> en progreso</span>
        </p>
        {summary.inProgress[0] && (
          <p className="truncate text-xs text-muted">{summary.inProgress[0].title}</p>
        )}
      </div>
      {summary.due > 0 && (
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
          <Brain size={14} className="text-amber-300" aria-hidden="true" />
          <span className="text-white">Repasar</span>
          <span className="ml-auto font-medium text-white">{summary.due}</span>
        </div>
      )}
    </button>
  )
}
