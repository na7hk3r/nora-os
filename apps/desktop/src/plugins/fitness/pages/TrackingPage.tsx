import { DailyEntry } from '../components/DailyEntry'
import { DailyTable } from '../components/DailyTable'
import { SquarePen } from 'lucide-react'

export function TrackingPage() {
  return (
    <div className="plugin-shell plugin-shell-fitness space-y-5">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface">
          <SquarePen size={20} className="text-accent-light" />
        </span>
        <div>
          <p className="text-caption uppercase tracking-eyebrow text-muted">Fitness</p>
          <h1 className="text-2xl font-bold text-white">Registro diario</h1>
        </div>
      </header>
      <DailyEntry />
      <section className="plugin-panel p-4">
        <h3 className="mb-3 text-sm font-medium text-muted">Ultimos registros</h3>
        <DailyTable />
      </section>
    </div>
  )
}
