import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { storageAPI } from '@core/storage/StorageAPI'
import { useCoreStore } from '@core/state/coreStore'
import { Bell, Check, CheckCircle2, CheckCheck, Lightbulb, RefreshCw, Sparkles, TriangleAlert, X } from 'lucide-react'
import { buildSystemSuggestions, subscribeGuidanceRefresh, type GuidanceSuggestion } from './systemGuidance'
import { aiSuggestionsService } from '@core/services/aiSuggestionsService'
import { ollamaService } from '@core/services/ollamaService'

const READ_IDS_KEY = 'core:guidanceReadIds'
const READ_IDS_LIMIT = 200

/**
 * Persistencia local de IDs de sugerencias marcadas como leídas. Se almacena
 * en `localStorage` (no en SQLite) porque las sugerencias se regeneran desde
 * eventos en cada carga; el set de IDs leídos es efímero por diseño y
 * tolerar pérdida es aceptable. Se limita a 200 entradas (FIFO).
 */
function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(READ_IDS_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveReadIds(set: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    const arr = Array.from(set).slice(-READ_IDS_LIMIT)
    window.localStorage.setItem(READ_IDS_KEY, JSON.stringify(arr))
  } catch { /* noop */ }
}

const TYPE_STYLES: Record<
  GuidanceSuggestion['type'],
  { border: string; icon: React.ComponentType<{ size?: number; className?: string }>; text: string }
> = {
  warning: { border: 'border-warning/30 bg-warning/5', icon: TriangleAlert, text: 'text-warning' },
  info: { border: 'border-accent/30 bg-accent/5', icon: Lightbulb, text: 'text-accent-light' },
  positive: { border: 'border-success/30 bg-success/5', icon: CheckCircle2, text: 'text-success' },
}

export function SystemSuggestions() {
  const navigate = useNavigate()
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const [suggestions, setSuggestions] = useState<GuidanceSuggestion[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds())
  const [expanded, setExpanded] = useState(false)
  const [aiText, setAiText] = useState<string>('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)

  const markAsRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveReadIds(next)
      return next
    })
  }

  const markAllAsRead = () => {
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const s of suggestions) next.add(s.id)
      saveReadIds(next)
      return next
    })
  }

  useEffect(() => {
    void ollamaService.isReady().then((r) => setAiAvailable(r.enabled && r.healthy)).catch(() => setAiAvailable(false))
  }, [])

  const fetchAi = async () => {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const result = await aiSuggestionsService.generate('dailyCoach')
      setAiText(result.text)
    } catch (err) {
      setAiText(`(IA no disponible: ${(err as Error).message})`)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    if (expanded && aiAvailable && !aiText && !aiLoading) void fetchAi()
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, aiAvailable])

  useEffect(() => {
    const load = () => {
      storageAPI
        .getRecentEvents(120)
        .then((events) => setSuggestions(buildSystemSuggestions(events, activePluginIds)))
        .catch(() => {})
    }

    load()
    const unsubs = subscribeGuidanceRefresh(load)
    return () => unsubs.forEach((u) => u())
  }, [activePluginIds])

  const unreadSuggestions = suggestions.filter((s) => !readIds.has(s.id))
  const relevantSuggestions = unreadSuggestions.filter((s) => s.type !== 'positive')
  const hasRelevant = relevantSuggestions.length > 0
  const displaySuggestions = hasRelevant ? relevantSuggestions : unreadSuggestions

  if (suggestions.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="relative flex items-center justify-center rounded-md border border-border bg-surface px-2 py-1.5 text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
        title={hasRelevant ? 'Notificaciones del sistema' : 'Historial de notificaciones'}
        aria-label="Notificaciones del sistema"
      >
        <Bell size={14} />
        {hasRelevant && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-warning px-1 text-[9px] font-semibold text-slate-900">
            {relevantSuggestions.length}
          </span>
        )}
      </button>

      {expanded && (
        <section className="absolute bottom-full left-0 z-50 mb-2 w-[min(92vw,360px)] rounded-xl border border-border bg-surface-light/95 p-3 text-left shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-caption uppercase tracking-label text-muted">Centro de notificaciones</p>
              <p className="text-xs text-muted">
                {hasRelevant
                  ? `${relevantSuggestions.length} alerta${relevantSuggestions.length === 1 ? '' : 's'} pendiente${relevantSuggestions.length === 1 ? '' : 's'}`
                  : unreadSuggestions.length > 0
                    ? 'No hay alertas pendientes, mostrando historial reciente'
                    : 'Todo al día — sin notificaciones nuevas'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {unreadSuggestions.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1 text-[10px] uppercase tracking-wide text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck size={11} />
                  Todas
                </button>
              )}
              <button
                onClick={() => setExpanded(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                title="Cerrar notificaciones"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {aiAvailable && (
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-caption uppercase tracking-wider text-accent-light">
                    <Sparkles size={11} /> Coach IA local
                  </div>
                  <button
                    onClick={() => void fetchAi()}
                    disabled={aiLoading}
                    className="rounded p-1 text-muted hover:text-white disabled:opacity-50"
                    aria-label="Regenerar sugerencia"
                  ><RefreshCw size={11} className={aiLoading ? 'animate-spin' : ''} /></button>
                </div>
                <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">
                  {aiLoading ? 'Pensando...' : aiText || 'Generando sugerencia...'}
                </p>
              </div>
            )}
            {displaySuggestions.length === 0 && !aiAvailable && (
              <p className="px-3 py-6 text-center text-xs text-muted">No hay notificaciones nuevas.</p>
            )}
            {displaySuggestions.map((s) => {
              const style = TYPE_STYLES[s.type]
              const Icon = style.icon
              return (
                <div
                  key={s.id}
                  className={`flex items-start justify-between gap-3 rounded-lg border ${style.border} p-3 animate-fade-in`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Icon size={14} className="mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed text-muted">{s.message}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => {
                        navigate(s.ctaPath)
                        setExpanded(false)
                      }}
                      className={`text-xs font-medium ${style.text} transition-all hover:underline`}
                    >
                      {s.ctaLabel} →
                    </button>
                    <button
                      onClick={() => markAsRead(s.id)}
                      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted/70 transition-colors hover:bg-surface hover:text-foreground"
                      title="Marcar como leída"
                      aria-label="Marcar como leída"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
