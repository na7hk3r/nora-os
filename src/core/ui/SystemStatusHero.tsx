import { useEffect, useState } from 'react'
import { storageAPI } from '@core/storage/StorageAPI'
import { useCoreStore } from '@core/state/coreStore'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { buildSystemSuggestions, computeHeroState, subscribeGuidanceRefresh } from './systemGuidance'
import { NoraLogoMark } from './components/NoraLogo'

type DayState = 'on-track' | 'unstable' | 'disconnected'

interface HeroState {
  dayState: DayState
  insight: string
  ctaLabel: string
  ctaPath: string
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  const firstName = name?.trim().split(' ')[0] || ''
  const nameStr = firstName ? `, ${firstName}` : ''

  const morning = [
    `Buenos días${nameStr}. Empezá el día con todo.`,
    `Buenos días${nameStr}. Un día más para construir algo.`,
    `Buenos días${nameStr}. ¿Qué vas a lograr hoy?`,
  ]
  const afternoon = [
    `Buenas tardes${nameStr}. ¿Cómo viene el día?`,
    `Buenas tardes${nameStr}. Ya vas por la mitad, seguí.`,
    `Buenas tardes${nameStr}. Revisá tus prioridades.`,
  ]
  const evening = [
    `Buenas noches${nameStr}. ¿Cómo fue el día?`,
    `Buenas noches${nameStr}. Buen momento para reflexionar.`,
    `Buenas noches${nameStr}. Dejá todo listo para mañana.`,
  ]

  const pool = hour >= 5 && hour < 13 ? morning : hour >= 13 && hour < 20 ? afternoon : evening
  return pool[new Date().getDate() % pool.length]
}

const STATE_CONFIG: Record<DayState, { label: string; dot: string; border: string; badge: string }> = {
  'on-track': {
    label: 'Tu día va bien',
    dot: 'bg-success',
    border: 'border-success/30',
    badge: 'bg-success/10 text-success',
  },
  unstable: {
    label: 'Tenés pendientes',
    dot: 'bg-warning',
    border: 'border-warning/30',
    badge: 'bg-warning/10 text-warning',
  },
  disconnected: {
    label: 'Sin registros hoy',
    dot: 'bg-danger',
    border: 'border-danger/30',
    badge: 'bg-danger/10 text-danger',
  },
}

export function SystemStatusHero() {
  const profileName = useCoreStore((s) => s.profile.name)
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const streak = useGamificationStore((s) => s.streak)
  const [heroState, setHeroState] = useState<HeroState>({
    dayState: 'on-track',
    insight: 'Cargando tu día…',
    ctaLabel: 'Ver fitness',
    ctaPath: '/fitness',
  })

  useEffect(() => {
    const load = () => {
      storageAPI
        .getRecentEvents(120)
        .then((events) => {
          const suggestions = buildSystemSuggestions(events, activePluginIds)
          setHeroState(computeHeroState(events, suggestions, activePluginIds))
        })
        .catch(() => {})
    }

    load()

    const unsubs = subscribeGuidanceRefresh(load)

    return () => unsubs.forEach((u) => u())
  }, [activePluginIds])

  const cfg = STATE_CONFIG[heroState.dayState]

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} bg-surface-light/90 p-6 shadow-2xl transition-all duration-300`}
    >
      {/* Background decoration: logo oficial Nora OS - ver visual-id/. */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-56 w-56 opacity-25">
        <NoraLogoMark size={224} className="h-full w-full text-foreground/60" glow />
      </div>

      <div className="relative flex flex-col gap-4">
        {/* Status + insight */}
        <div className="min-w-0 space-y-2">

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badge}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dot} animate-pulse`} />
              {cfg.label}
            </span>
            {streak >= 3 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/35 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                🔥 {streak} dias en racha - no la rompas
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-semibold leading-tight">{getGreeting(profileName)}</h1>
          <p className="max-w-xl text-sm text-muted">{heroState.insight}</p>
        </div>
      </div>
    </section>
  )
}
