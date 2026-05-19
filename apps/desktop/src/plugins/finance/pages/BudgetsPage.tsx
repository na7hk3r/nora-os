import { useMemo, useState } from 'react'
import { PiggyBank, Save, Trash2 } from 'lucide-react'
import { useFinanceStore } from '../store'
import { upsertBudget, deleteBudget } from '../operations'
import { suggestBudgets } from '../insights'
import { parseAmountToCents, formatCents, startOfMonth, formatLocalDate } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'

export function BudgetsPage() {
  const allAccounts = useFinanceStore((s) => s.accounts)
  const allCategories = useFinanceStore((s) => s.categories)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.archived), [allAccounts])
  const categories = useMemo(
    () => allCategories.filter((c) => c.kind === 'expense' && !c.archived),
    [allCategories],
  )
  const budgets = useFinanceStore((s) => s.budgets)
  const transactions = useFinanceStore((s) => s.transactions)
  const { toast } = useToast()

  const currency = accounts[0]?.currency ?? 'UYU'
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const monthStart = formatLocalDate(startOfMonth())
  const spentByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.kind !== 'expense' || !t.categoryId) continue
      if (t.occurredAt < monthStart) continue
      if (t.currency !== currency) continue
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    }
    return map
  }, [transactions, monthStart, currency])

  const budgetByCat = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b])), [budgets])

  const save = async (categoryId: string) => {
    const raw = drafts[categoryId]
    if (raw == null) return
    const cents = parseAmountToCents(raw)
    if (cents <= 0) {
      toast.error(messages.errors.financeAmountInvalid ?? 'Monto inválido.')
      return
    }
    try {
      await upsertBudget({ categoryId, limitAmount: cents, currency })
      setDrafts((d) => ({ ...d, [categoryId]: '' }))
      toast.success('Presupuesto guardado.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteBudget(id)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const applySuggestions = async () => {
    const suggestions = suggestBudgets()
    if (suggestions.length === 0) {
      toast.info('No hay datos suficientes para sugerir presupuestos.')
      return
    }
    let count = 0
    for (const s of suggestions) {
      try {
        await upsertBudget({ categoryId: s.category.id, limitAmount: s.suggestedCents, currency })
        count += 1
      } catch {
        // ignore individual failures
      }
    }
    toast.success(`${count} presupuestos sugeridos aplicados.`)
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <div>
          <h1 className="text-sm font-semibold text-white">Presupuestos mensuales</h1>
          <p className="text-xs text-muted">Definí límites por categoría. Sin moralina, solo awareness.</p>
        </div>
        <button type="button" onClick={() => void applySuggestions()}
          className="inline-flex items-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-xs text-accent-light hover:bg-accent/25">
          <PiggyBank size={12} /> Sugerir desde mediana 3 meses
        </button>
      </header>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted">
          {messages.empty.financeCategories}
        </p>
      ) : (
        <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {categories.map((c) => {
            const budget = budgetByCat.get(c.id)
            const spent = spentByCat.get(c.id) ?? 0
            const limit = budget?.limitAmount ?? 0
            const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0
            const over = limit > 0 && spent > limit
            return (
              <div key={c.id} className="rounded-xl border border-border bg-surface p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  {budget && (
                    <button type="button" onClick={() => void remove(budget.id)}
                      className="rounded p-1 text-muted hover:text-rose-300" aria-label="Borrar presupuesto">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                {limit > 0 && (
                  <>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted">
                      <span>{formatCents(spent, currency)} de {formatCents(limit, currency)}</span>
                      <span className={over ? 'text-rose-300' : 'text-muted'}>{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-light">
                      <div className={`h-full ${over ? 'bg-rose-400' : 'bg-accent'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={drafts[c.id] ?? ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && void save(c.id)}
                    placeholder={budget ? `Actual: ${formatCents(limit, currency)}` : 'Definir límite mensual'}
                    className="flex-1 rounded-lg border border-border bg-surface-light px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                  />
                  <button type="button" onClick={() => void save(c.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs text-muted hover:text-white">
                    <Save size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
