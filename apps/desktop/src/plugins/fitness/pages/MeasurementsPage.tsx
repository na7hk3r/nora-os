import { Ruler } from 'lucide-react'
import { MeasurementsForm } from '../components/MeasurementsForm'
import { MeasurementsTable } from '../components/MeasurementsTable'

export function MeasurementsPage() {
  return (
    <div className="plugin-shell plugin-shell-fitness space-y-5">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface">
          <Ruler size={20} className="text-accent-light" />
        </span>
        <div>
          <p className="text-caption uppercase tracking-eyebrow text-muted">Fitness</p>
          <h1 className="text-2xl font-bold text-white">Medidas corporales</h1>
        </div>
      </header>
      <MeasurementsForm />
      <MeasurementsTable />
    </div>
  )
}
