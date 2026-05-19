import { useState } from 'react'
import { ChartNoAxesCombined, Loader2 } from 'lucide-react'
import { generateMonthlySummary } from '../insights'
import { formatCents } from '../utils'
import { messages } from '@core/ui/messages'
import { useToast } from '@core/ui/components/ToastProvider'
import { useFinanceStore } from '../store'

interface Summary {
  monthLabel: string
  incomeCents: number
  expenseCents: number
  netCents: number
  topCategories: Array<{ name: string; amountCents: number }>
  topDeltaCategories: Array<{ name: string; deltaPct: number }>
  currency: string
  narrative: string | null
}

/**
 * Insights del plugin Finance.
 *
 * Por defecto muestra resumen DETERMINÍSTICO (sin IA). El usuario decide si
 * pide narrativa con Ollama (botón opt-in). Esto respeta el principio de
 * "IA opcional, datos siempre".
 */
export function InsightsPage() {
  const { toast } = useToast()
  const aiContextEnabled = useFinanceStore((s) => s.settings.aiContextEnabled)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async (withAI: boolean) => {
    setBusy(true)
    try {
      const s = await generateMonthlySummary({ withAI })
      setSummary(s)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <div>
          <h1 className="text-sm font-semibold text-white">Insights del mes</h1>
          <p className="text-xs text-muted">Resumen del mes en curso. La narrativa IA es opcional.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load(false)} disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-40">
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} Resumen
          </button>
          {aiContextEnabled && (
            <button type="button" onClick={() => void load(true)} disabled={busy}
              className="inline-flex items-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-xs text-accent-light hover:bg-accent/25 disabled:opacity-40">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <ChartNoAxesCombined size={12} />} Con IA
            </button>
          )}
        </div>
      </header>

      {!summary ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted">
          {messages.empty.financeInsights}
        </p>
      ) : (
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
            <p className="text-caption uppercase tracking-eyebrow text-muted">{summary.monthLabel}</p>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
              <Stat label="Ingresos" value={formatCents(summary.incomeCents, summary.currency, { compact: true })} accent="text-emerald-300" />
              <Stat label="Gastos" value={formatCents(summary.expenseCents, summary.currency, { compact: true })} accent="text-rose-300" />
              <Stat label="Neto" value={formatCents(summary.netCents, summary.currency, { compact: true })} accent={summary.netCents >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
            </div>
          </div>

          {summary.topCategories.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
              <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">Top categorías</h2>
              <ul className="space-y-1 text-sm">
                {summary.topCategories.map((c) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="text-white">{c.name}</span>
                    <span className="font-mono text-rose-200">{formatCents(c.amountCents, summary.currency)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.topDeltaCategories.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
              <h2 className="mb-2 text-xs uppercase tracking-wider text-muted">Cambios marcados vs mes anterior</h2>
              <ul className="space-y-1 text-sm">
                {summary.topDeltaCategories.map((d) => (
                  <li key={d.name} className="flex items-center justify-between">
                    <span className="text-white">{d.name}</span>
                    <span className={`font-mono ${d.deltaPct > 0 ? 'text-rose-200' : 'text-emerald-200'}`}>
                      {d.deltaPct > 0 ? '+' : ''}{d.deltaPct}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.narrative && (
            <div className="rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
              <h2 className="mb-2 flex items-center gap-1 text-xs uppercase tracking-wider text-muted">
                <ChartNoAxesCombined size={12} /> Narrativa
              </h2>
              <p className="text-sm leading-relaxed text-white/90">{summary.narrative}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <p className={`text-caption uppercase tracking-wider ${accent}`}>{label}</p>
      <p className="text-xl font-semibold text-white">{value}</p>
    </div>
  )
}
