import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Dumbbell, Ruler, SquarePen, TrendingUp } from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { KpiCards } from '../components/KpiCards'
import { WeightChart } from '../components/WeightChart'
import { MealChart } from '../components/MealChart'
import { SmokingChart } from '../components/SmokingChart'
import { MonthlySummary } from '../components/MonthlySummary'
import { SleepChart } from '../components/SleepChart'
import { useFitnessStore } from '../store'
import { averageField, countWorkoutsLastDays, getCurrentWeight, getMealCompliancePercent } from '../utils'
import { useFitnessSettings } from '../settings'

export function FitnessDashboard() {
  const navigate = useNavigate()
  const entries = useFitnessStore((s) => s.entries)
  const measurements = useFitnessStore((s) => s.measurements)
  const { settings } = useFitnessSettings()

  const headline = useMemo(() => {
    const currentWeight = getCurrentWeight(entries)
    const mealPct = getMealCompliancePercent(entries, 14)
    const workouts7d = countWorkoutsLastDays(entries, 7)
    const avgSleep = averageField(entries, 'sleep', 7)

    return {
      currentWeight,
      mealPct,
      workouts7d,
      avgSleep,
      lastMeasurement: measurements.at(-1)?.date ?? null,
    }
  }, [entries, measurements])

  return (
    <div className="plugin-shell plugin-shell-fitness space-y-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-light/75 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <BrandIcon name="Magic" size={44} />
          <div className="min-w-0">
            <p className="text-caption uppercase tracking-eyebrow text-muted">Fitness operativo</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
              <Dumbbell size={22} />
              Panel de control
            </h1>
            <p className="mt-1 text-sm text-muted">
              Peso, entrenos, alimentacion y recuperacion en una sola vista.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <NavChip icon={<SquarePen size={13} />} label="Registrar" onClick={() => navigate('/fitness/tracking')} />
          <NavChip icon={<Ruler size={13} />} label="Medidas" onClick={() => navigate('/fitness/measurements')} />
        </div>
      </header>

      <section className="workspace-auto-grid-sm gap-3">
        <HeroStat label="Peso actual" value={headline.currentWeight ? `${headline.currentWeight} kg` : '--'} detail="Ultimo registro" icon={<TrendingUp size={16} />} />
        <HeroStat label="Comidas" value={`${headline.mealPct}%`} detail="Cumplimiento 14 dias" icon={<Activity size={16} />} />
        <HeroStat label="Entrenos" value={`${headline.workouts7d}/7`} detail={`Meta ${settings.workoutTargetPerWeek}/sem`} icon={<Dumbbell size={16} />} />
        <HeroStat label="Sueno" value={headline.avgSleep > 0 ? `${headline.avgSleep}h` : '--'} detail="Promedio 7 dias" icon={<Activity size={16} />} />
      </section>

      <KpiCards settingsOverride={settings} density="full" />
      <MonthlySummary />

      <section className="workspace-auto-grid-lg gap-4">
        <div className="plugin-panel p-4">
          <PanelHeader title="Tendencia de peso" subtitle="Ultimos registros con peso" />
          <WeightChart />
        </div>
        <div className="plugin-panel p-4">
          <PanelHeader title="Comidas 14 dias" subtitle="Barras por dia y objetivo" />
          <MealChart />
        </div>
      </section>

      <section className="workspace-auto-grid-lg gap-4">
        <div className="plugin-panel p-4">
          <PanelHeader title="Recuperacion" subtitle="Horas de sueno registradas" />
          <SleepChart />
        </div>
        <div className="plugin-panel p-4">
          <PanelHeader title="Mediciones" subtitle={headline.lastMeasurement ? `Ultima: ${headline.lastMeasurement}` : 'Sin mediciones aun'} />
          <div className="workspace-auto-grid-sm min-h-[220px] gap-3">
            {[
              ['Peso', measurements.at(-1)?.weight, 'kg'],
              ['Cintura', measurements.at(-1)?.waist, 'cm'],
              ['Pecho', measurements.at(-1)?.chest, 'cm'],
              ['Pierna', measurements.at(-1)?.leg, 'cm'],
              ['Brazo R', measurements.at(-1)?.armRelaxed, 'cm'],
              ['Brazo F', measurements.at(-1)?.armFlexed, 'cm'],
            ].map(([label, value, unit]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-surface px-3 py-3">
                <p className="text-caption uppercase tracking-wider text-muted">{label}</p>
                <p className="mt-2 text-xl font-semibold text-white tabular-nums">
                  {typeof value === 'number' ? `${value}${unit}` : '--'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {settings.smokingCessationEnabled && <SmokingChart />}
    </div>
  )
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <span className="text-caption text-muted">{subtitle}</span>
    </div>
  )
}

function HeroStat({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-caption uppercase tracking-wider text-muted">{label}</p>
        <span className="text-accent-light">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-1 text-caption text-muted">{detail}</p>
    </article>
  )
}

function NavChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-muted transition-colors hover:text-white"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
