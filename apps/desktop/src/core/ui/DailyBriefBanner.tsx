import { useEffect, useState } from 'react'
import { Sparkles, X, RefreshCw } from 'lucide-react'
import { dailyBriefService, type DailyBrief } from '@core/services/dailyBriefService'
import { messages } from '@core/ui/messages'

export function DailyBriefBanner() {
  const [brief, setBrief] = useState<DailyBrief | null>(null)
  const [loading, setLoading] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const cached = await dailyBriefService.getCached()
      if (cancelled) return
      if (cached) { setBrief(cached); return }
      setLoading(true)
      try {
        const fresh = await dailyBriefService.generate()
        if (!cancelled) setBrief(fresh)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (hidden || (!brief && !loading)) return null

  const dismiss = async () => {
    setHidden(true)
    await dailyBriefService.dismissToday()
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const fresh = await dailyBriefService.generate({ force: true })
      setBrief(fresh)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-light/90 px-4 py-3">
      <Sparkles className="mt-0.5 h-4 w-4 text-accent-light" />
      <div className="flex-1 min-w-0">
        <div className="text-caption uppercase tracking-wide text-muted">
          {messages.guidance.dailyBriefHeading}
          {brief?.source === 'fallback' ? <span className="ml-2 text-muted/70">sin IA</span> : null}
        </div>
        <p className="mt-0.5 text-sm text-accent-light">
          {loading ? 'Generando…' : brief?.text}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void refresh()}
        disabled={loading}
        className="rounded-md p-1.5 text-muted hover:text-accent-light hover:bg-surface-light disabled:opacity-50"
        title="Regenerar"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => void dismiss()}
        className="rounded-md p-1.5 text-muted hover:text-accent-light hover:bg-surface-light"
        title={messages.guidance.dailyBriefDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
