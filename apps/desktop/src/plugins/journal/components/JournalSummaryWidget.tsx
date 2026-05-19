import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, PenLine } from 'lucide-react'
import { useJournalStore } from '../store'
import { todayISO, moodLabel } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Widget compacto del Dashboard. Muestra estado de la entrada de hoy.
 */
export function JournalSummaryWidget() {
  const navigate = useNavigate()
  const entries = useJournalStore((s) => s.entries)

  const summary = useMemo(() => {
    const today = todayISO()
    const todayEntry = entries.find((e) => e.date === today)
    const last7 = entries.filter((e) => {
      const d = new Date(e.date)
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 7)
      return d >= cutoff
    })
    return { today: todayEntry, last7Count: last7.length, totalEntries: entries.length }
  }, [entries])

  if (summary.totalEntries === 0) {
    return (
      <button
        type="button"
        onClick={() => navigate('/journal')}
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted hover:text-white"
      >
        {messages.empty.journalEntries}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/journal')}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 text-left shadow-xl transition-colors hover:border-accent/50"
      aria-label="Resumen de Journal"
    >
      <div className="flex items-center gap-2">
        <BookOpen size={16} className="text-accent-light" aria-hidden="true" />
        <span className="text-caption uppercase tracking-eyebrow text-muted">Journal</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">
          {summary.today ? `${summary.today.wordCount} palabras` : 'Sin entrada'}
        </p>
        <p className="text-xs text-muted">
          {summary.today ? `Hoy · ${moodLabel(summary.today.mood)}` : `Última: ${entries[0]?.date ?? '—'}`}
        </p>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs">
        <PenLine size={14} className="text-accent-light" aria-hidden="true" />
        <span className="text-muted">7d</span>
        <span className="ml-auto font-medium text-white">{summary.last7Count} entradas</span>
      </div>
    </button>
  )
}
