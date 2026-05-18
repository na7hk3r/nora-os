import { BarChart3, CalendarCheck2, Dumbbell, Moon, Utensils } from 'lucide-react'
import { useFitnessStore } from '../store'
import { averageField, countWorkoutsMonth, getMealCompliancePercent } from '../utils'
import { useFitnessSettings } from '../settings'
import { useI18n } from '@core/i18n'

export function MonthlySummary() {
  const { formatDate } = useI18n()
  const entries = useFitnessStore((s) => s.entries)
  const { settings } = useFitnessSettings()

  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const monthEntries = entries.filter((e) => {
    const d = new Date(e.date)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const mealPct = getMealCompliancePercent(entries)
  const workouts = countWorkoutsMonth(entries)
  const avgSleep = averageField(monthEntries, 'sleep', 30)
  const avgCigs = averageField(monthEntries, 'cigarettes', 30)
  const totalDays = monthEntries.length
  const monthName = formatDate(now, { month: 'long', year: 'numeric' })

  const stats = [
    { label: 'Días registrados', value: String(totalDays), icon: CalendarCheck2, tone: 'text-accent-light' },
    { label: 'Comidas', value: `${mealPct}%`, icon: Utensils, tone: 'text-emerald-300' },
    { label: 'Entrenos', value: String(workouts), icon: Dumbbell, tone: 'text-warning' },
    { label: 'Sueño promedio', value: avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : '--', icon: Moon, tone: 'text-sky-300' },
    ...(settings.smokingCessationEnabled
      ? [{ label: 'Cigarrillos prom.', value: avgCigs.toFixed(1), icon: BarChart3, tone: 'text-orange-300' }]
      : []),
  ]

  return (
    <section className="plugin-panel p-4">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          <BarChart3 size={16} />
          Resumen de {monthName}
        </h4>
        <span className="text-caption text-muted">Ultimos datos consolidados</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-3">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-xl border border-border bg-surface px-3 py-3">
            <div className={`mb-2 flex items-center gap-1.5 text-caption uppercase tracking-wider ${stat.tone}`}>
              <stat.icon size={14} />
              <span>{stat.label}</span>
            </div>
            <p className="text-xl font-semibold text-white tabular-nums">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
