import { Ruler } from 'lucide-react'
import { useFitnessStore } from '../store'
import { getMeasurementDelta } from '../utils'
import type { Measurement } from '../types'

const COLUMNS: Array<{ key: keyof Omit<Measurement, 'id' | 'date'>; label: string; unit: string }> = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'armRelaxed', label: 'Brazo R', unit: 'cm' },
  { key: 'armFlexed', label: 'Brazo F', unit: 'cm' },
  { key: 'chest', label: 'Pecho', unit: 'cm' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'leg', label: 'Pierna', unit: 'cm' },
]

export function MeasurementsTable() {
  const measurements = useFitnessStore((s) => s.measurements)

  if (measurements.length === 0) {
    return (
      <section className="plugin-panel flex min-h-[180px] items-center justify-center p-6 text-center text-sm text-muted">
        Sin medidas registradas.
      </section>
    )
  }

  const sortedAsc = [...measurements].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sortedAsc.at(-1)
  const previous = sortedAsc.at(-2)
  const sortedDesc = [...sortedAsc].reverse()

  return (
    <section className="space-y-4">
      {latest && (
        <div className="plugin-panel p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Ruler size={16} />
            Ultima medicion - {latest.date}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-3">
            {COLUMNS.map((column) => (
              <MeasurementTile key={column.key} measurement={latest} previous={previous} column={column} />
            ))}
          </div>
        </div>
      )}

      <div className="plugin-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 text-left">Fecha</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="px-4 py-3 text-right">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedDesc.map((measurement) => (
                <tr key={measurement.date} className="border-b border-border/50 hover:bg-surface/60">
                  <td className="px-4 py-2 font-medium text-white">{measurement.date}</td>
                  {COLUMNS.map((column) => (
                    <td key={column.key} className="px-4 py-2 text-right tabular-nums">
                      {formatMeasurement(measurement[column.key], column.unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function MeasurementTile({
  measurement,
  previous,
  column,
}: {
  measurement: Measurement
  previous: Measurement | undefined
  column: { key: keyof Omit<Measurement, 'id' | 'date'>; label: string; unit: string }
}) {
  const value = measurement[column.key]
  const delta = getMeasurementDelta(measurement, previous, column.key)
  return (
    <article className="rounded-xl border border-border bg-surface px-3 py-3">
      <p className="text-caption uppercase tracking-wider text-muted">{column.label}</p>
      <p className="mt-2 text-xl font-semibold text-white tabular-nums">{formatMeasurement(value, column.unit)}</p>
      <p className={`mt-1 text-caption ${delta == null ? 'text-muted' : delta <= 0 ? 'text-emerald-300' : 'text-warning'}`}>
        {delta == null ? 'Sin comparativa' : `${delta > 0 ? '+' : ''}${delta}${column.unit} vs anterior`}
      </p>
    </article>
  )
}

function formatMeasurement(value: number | null, unit: string): string {
  return typeof value === 'number' ? `${value}${unit}` : '--'
}
