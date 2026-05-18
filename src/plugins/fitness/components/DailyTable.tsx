import { useFitnessStore } from '../store'
import { useFitnessSettings } from '../settings'

export function DailyTable() {
  const entries = useFitnessStore((s) => s.entries)
  const { settings } = useFitnessSettings()
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  if (recent.length === 0) {
    return <p className="text-sm text-muted">No hay registros aun.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[680px] w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
            <th className="px-3 py-3">Fecha</th>
            <th className="px-3 py-3">Peso</th>
            <th className="px-3 py-3">Comidas</th>
            <th className="px-3 py-3">Entreno</th>
            {settings.smokingCessationEnabled && <th className="px-3 py-3">Cig.</th>}
            <th className="px-3 py-3">Sueño</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((entry) => (
            <tr key={entry.date} className="border-b border-border/50 hover:bg-surface/60">
              <td className="px-3 py-2 font-medium text-white">{entry.date.slice(5)}</td>
              <td className="px-3 py-2">{entry.weight != null ? `${entry.weight} kg` : '--'}</td>
              <td className="px-3 py-2">{entry.breakfast + entry.lunch + entry.snack + entry.dinner}/4</td>
              <td className="px-3 py-2">{entry.workout || '--'}</td>
              {settings.smokingCessationEnabled && <td className="px-3 py-2">{entry.cigarettes}</td>}
              <td className="px-3 py-2">{entry.sleep != null ? `${entry.sleep}h` : '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
