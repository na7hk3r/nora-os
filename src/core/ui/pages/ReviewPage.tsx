import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, BarChart3 } from 'lucide-react'
import { aiContextService, type UserContextSnapshot } from '@core/services/aiContextService'
import { aiSuggestionsService } from '@core/services/aiSuggestionsService'
import { ollamaService } from '@core/services/ollamaService'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { PULSO_NORA_COMPANION_NAME, PULSO_NORA_SYSTEM_NAME, isRewardUnlocked } from '@core/gamification/pulsoNora'
import { GlobalProgress } from '../GlobalProgress'
import { RecentActivityFeed } from '../RecentActivityFeed'

type RangeKind = 'week' | 'month'

function summarizeNumber(label: string, value: number | null | undefined, suffix = ''): React.ReactNode {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-micro uppercase tracking-wider text-muted">{label}</p>
      <p className="text-lg font-semibold">{value == null ? '—' : `${value}${suffix}`}</p>
    </div>
  )
}

export function ReviewPage() {
  const [range, setRange] = useState<RangeKind>('week')
  const [snapshot, setSnapshot] = useState<UserContextSnapshot | null>(null)
  const [aiText, setAiText] = useState<string>('')
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiError, setAiError] = useState<string>('')
  const [ollamaReady, setOllamaReady] = useState<{ enabled: boolean; healthy: boolean; reason?: string }>({ enabled: false, healthy: false })
  const level = useGamificationStore((s) => s.level)
  const weeklyReviewUnlocked = isRewardUnlocked('weekly-review', level)

  useEffect(() => {
    void aiContextService.snapshot().then(setSnapshot).catch(() => setSnapshot(null))
    void ollamaService.isReady().then(setOllamaReady).catch(() => setOllamaReady({ enabled: false, healthy: false }))
  }, [])

  const generate = async () => {
    setLoadingAi(true)
    setAiError('')
    try {
      const result = await aiSuggestionsService.generate('weeklyReview')
      setAiText(result.text)
    } catch (err) {
      setAiError((err as Error).message)
    } finally {
      setLoadingAi(false)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 size={20} className="text-accent-light" />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">Progreso</p>
            <h1 className="text-xl font-semibold">Tu evolución {range === 'week' ? 'semanal' : 'mensual'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {(['week', 'month'] as RangeKind[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-full border px-3 py-1 transition-colors ${
                range === r ? 'border-accent bg-accent/15 text-accent-light' : 'border-border text-muted hover:text-white'
              }`}
            >{r === 'week' ? 'Semana' : 'Mes'}</button>
          ))}
        </div>
      </header>

      {/* Progreso global (movido del Dashboard como hogar canónico) */}
      <GlobalProgress />

      {snapshot && (
        <>
          <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-white">Resumen Fitness</h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {summarizeNumber('Días con datos (7d)', snapshot.fitness?.daysWithDataLast7 ?? null)}
              {summarizeNumber('Entrenos (7d)', snapshot.fitness?.workoutsLast7 ?? null)}
              {summarizeNumber('Sueño promedio', snapshot.fitness?.avgSleepLast7 ?? null, 'h')}
              {snapshot.fitness?.cigarettesLast7 != null && summarizeNumber('Cigarrillos (7d)', snapshot.fitness.cigarettesLast7)}
              {summarizeNumber('Días sin entrenar', snapshot.fitness?.daysSinceLastWorkout ?? null)}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-white">Resumen Trabajo</h2>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              {summarizeNumber('Tareas activas', snapshot.work?.activeCards ?? null)}
              {summarizeNumber('Cerradas (7d)', snapshot.work?.doneLast7 ?? null)}
              {summarizeNumber('Sesiones de foco', snapshot.work?.focusSessionsLast7 ?? null)}
              {summarizeNumber('Minutos de foco', snapshot.work?.focusMinutesLast7 ?? null)}
              {summarizeNumber('Vencidas', snapshot.work?.overdueCards ?? null)}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
            <h2 className="mb-3 text-sm font-semibold text-white">{PULSO_NORA_SYSTEM_NAME}</h2>
            <div className="grid grid-cols-3 gap-2">
              {summarizeNumber(PULSO_NORA_COMPANION_NAME, snapshot.gamification.level)}
              {summarizeNumber('XP', snapshot.gamification.points)}
              {summarizeNumber('Racha', snapshot.gamification.streak, 'd')}
            </div>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-accent-light" />
            <h2 className="text-sm font-semibold text-white">Análisis del coach (Ollama local)</h2>
          </div>
          <button
            onClick={generate}
            disabled={loadingAi || !ollamaReady.enabled || !weeklyReviewUnlocked}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-muted transition-colors hover:text-white disabled:opacity-40"
          >
            <RefreshCw size={12} className={loadingAi ? 'animate-spin' : ''} />
            {loadingAi ? 'Pensando...' : 'Generar review'}
          </button>
        </div>
        {!weeklyReviewUnlocked && (
          <p className="text-xs text-muted">
            Review semanal IA se desbloquea cuando {PULSO_NORA_COMPANION_NAME} llega a nivel 5.
          </p>
        )}
        {!ollamaReady.enabled && (
          <p className="text-xs text-muted">
            Ollama está deshabilitado. Activalo desde Configuración → Ollama para obtener análisis con IA local.
          </p>
        )}
        {ollamaReady.enabled && !ollamaReady.healthy && (
          <p className="text-xs text-warning">
            Ollama no responde ({ollamaReady.reason ?? 'sin detalle'}). Revisá que el servicio esté corriendo en localhost:11434.
          </p>
        )}
        {aiError && <p className="mt-2 text-xs text-warning">{aiError}</p>}
        {aiText && <p className="mt-2 whitespace-pre-line text-sm text-foreground/80">{aiText}</p>}
      </section>

      {/* Historial completo de actividad */}
      <section className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <h2 className="mb-3 text-sm font-semibold text-white">Historial reciente</h2>
        <RecentActivityFeed />
      </section>
    </div>
  )
}
