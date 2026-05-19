import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, BookOpen } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useJournalStore } from '../store'
import { JournalEditor } from '../components/JournalEditor'
import { todayISO, moodLabel } from '../utils'
import { messages } from '@core/ui/messages'

/**
 * Página principal del Journal: editor del día + breve historial de últimas entradas.
 */
export function JournalDashboard() {
  const navigate = useNavigate()
  const entries = useJournalStore((s) => s.entries)
  const [selectedDate, setSelectedDate] = useState<string>(todayISO())

  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7)
  }, [entries])

  const stats = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
    const last30 = entries.filter((e) => e.date >= cutoffStr)
    const moods = last30.map((e) => e.mood).filter((m): m is number => m != null)
    const avg = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null
    return { last30: last30.length, moodAvg: avg }
  }, [entries])

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <BrandIcon name="BookJournal" size={44} />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">Journal</p>
            <h1 className="text-2xl font-bold text-white">{stats.last30} entradas en 30 días</h1>
            {stats.moodAvg != null && (
              <p className="text-xs text-muted">Mood promedio: {stats.moodAvg.toFixed(1)}/5</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Cambiar fecha de la entrada"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-white outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => navigate('/journal/history')}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-white hover:border-accent/50"
          >
            <History size={12} aria-hidden="true" />
            Historial
          </button>
        </div>
      </header>

      <JournalEditor date={selectedDate} />

      <section aria-labelledby="recent-entries">
        <h2 id="recent-entries" className="mb-2 text-sm font-semibold text-white">Recientes</h2>
        {recentEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 py-10 text-center text-muted">
            <BrandIcon name="BookJournal" size={48} tile={false} className="opacity-40" />
            <p className="text-sm">{messages.empty.journalEntries}</p>
            <p className="text-xs">Empezá escribiendo qué te pasó hoy en el editor de arriba.</p>
          </div>
        ) : (
          <ul className="max-h-[320px] space-y-1 overflow-y-auto pr-1" role="list">
            {recentEntries.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDate(e.date)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm hover:bg-surface/60 ${
                    e.date === selectedDate ? 'border-accent/50 bg-surface' : 'border-border bg-surface-light/60'
                  }`}
                  aria-current={e.date === selectedDate ? 'page' : undefined}
                >
                  <BookOpen size={14} className="text-accent-light" aria-hidden="true" />
                  <span className="font-medium text-white">{e.date}</span>
                  <span className="truncate text-muted">{e.title || `${e.wordCount} palabras`}</span>
                  <span className="ml-auto text-xs text-muted">{moodLabel(e.mood)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
