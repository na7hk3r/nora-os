import type { ComponentType } from 'react'
import { Activity, Ban, Dumbbell, Moon, Target, Utensils } from 'lucide-react'
import { useFitnessStore } from '../store'
import { averageField, countWorkoutsLastDays, countWorkoutsMonth, getCurrentWeight, getMealCompliancePercent, getPreviousWeight } from '../utils'
import { useFitnessSettings, type FitnessPluginSettings } from '../settings'

interface KpiCardsProps {
  settingsOverride?: FitnessPluginSettings
  density?: 'compact' | 'full'
}

interface KpiCard {
  label: string
  value: string
  hint: string
  icon: ComponentType<{ size?: number; className?: string }>
  tone: string
}

export function KpiCards({ settingsOverride, density = 'compact' }: KpiCardsProps = {}) {
  if (settingsOverride) return <KpiCardsContent settings={settingsOverride} density={density} />

  return <KpiCardsWithSettings density={density} />
}

function KpiCardsWithSettings({ density }: { density: 'compact' | 'full' }) {
  const { settings } = useFitnessSettings()
  return <KpiCardsContent settings={settings} density={density} />
}

function KpiCardsContent({ settings, density }: { settings: FitnessPluginSettings; density: 'compact' | 'full' }) {
  const entries = useFitnessStore((s) => s.entries)
  const currentWeight = getCurrentWeight(entries)
  const previousWeight = getPreviousWeight(entries)
  const mealPct = getMealCompliancePercent(entries)
  const workoutsMonth = countWorkoutsMonth(entries)
  const workouts7d = countWorkoutsLastDays(entries, 7)
  const avgCigs = averageField(entries, 'cigarettes', 7)
  const avgSleep = averageField(entries, 'sleep', 7)
  const weightDelta = currentWeight != null && previousWeight != null
    ? Math.round((currentWeight - previousWeight) * 10) / 10
    : null

  const cards: KpiCard[] = [
    {
      label: 'Peso actual',
      value: currentWeight ? `${currentWeight} kg` : '--',
      hint: weightDelta == null ? 'Sin comparativa previa' : `${weightDelta > 0 ? '+' : ''}${weightDelta} kg vs anterior`,
      icon: Target,
      tone: 'text-accent-light',
    },
    {
      label: 'Comidas 30d',
      value: `${mealPct}%`,
      hint: `Meta ${settings.mealComplianceTarget}% de cumplimiento`,
      icon: Utensils,
      tone: mealPct >= settings.mealComplianceTarget ? 'text-emerald-300' : 'text-amber-300',
    },
    {
      label: 'Entrenos',
      value: String(workoutsMonth),
      hint: `${workouts7d}/7d - objetivo ${settings.workoutTargetPerWeek}/sem`,
      icon: Dumbbell,
      tone: workouts7d >= settings.workoutTargetPerWeek ? 'text-emerald-300' : 'text-warning',
    },
    {
      label: 'Sueño promedio',
      value: avgSleep > 0 ? `${avgSleep}h` : '--',
      hint: `Objetivo ${settings.sleepTargetHours}h por noche`,
      icon: Moon,
      tone: avgSleep >= settings.sleepTargetHours ? 'text-emerald-300' : 'text-sky-300',
    },
  ]

  if (settings.smokingCessationEnabled) {
    cards.push({
      label: 'Cigarrillos/dia',
      value: String(avgCigs),
      hint: `Limite diario ${settings.maxCigarettesPerDay}`,
      icon: Ban,
      tone: avgCigs <= settings.maxCigarettesPerDay ? 'text-emerald-300' : 'text-danger',
    })
  }

  const isCompact = density === 'compact'
  const gridClass = isCompact
    ? 'grid grid-cols-[repeat(auto-fit,minmax(124px,1fr))] gap-2'
    : 'grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-3'
  const cardClass = isCompact
    ? 'min-h-[78px] rounded-lg border border-border bg-surface px-2.5 py-2 shadow-sm'
    : 'min-h-[112px] rounded-xl border border-border bg-surface px-3.5 py-3 shadow-sm'
  const iconWrapClass = isCompact
    ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-light'
    : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-light'

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <article
          key={card.label}
          className={cardClass}
        >
          <div className={isCompact ? 'mb-1.5 flex items-center justify-between gap-2' : 'mb-3 flex items-center justify-between gap-2'}>
            <span className={`${iconWrapClass} ${card.tone}`}>
              <card.icon size={isCompact ? 13 : 16} />
            </span>
            {!isCompact && <Activity size={13} className="shrink-0 text-muted/50" />}
          </div>
          <p className="text-micro uppercase tracking-wider text-muted">{card.label}</p>
          <p className={isCompact ? 'mt-0.5 text-lg font-semibold leading-none text-white tabular-nums' : 'mt-1 text-2xl font-semibold leading-none text-white tabular-nums'}>
            {card.value}
          </p>
          <p className={isCompact ? 'mt-1 truncate text-micro text-muted' : 'mt-2 text-caption leading-snug text-muted'}>
            {card.hint}
          </p>
        </article>
      ))}
    </div>
  )
}
