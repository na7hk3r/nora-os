import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  CalendarSync,
  ChartNoAxesCombined,
  PiggyBank,
  ReceiptText,
} from 'lucide-react'
import { BrandIcon } from '@core/ui/components/BrandIcon'
import { useI18n } from '@core/i18n'
import { useFinanceStore } from '../store'
import { QuickAddTransaction } from '../components/QuickAddTransaction'
import { AccountsManager } from '../components/AccountsManager'
import {
  computeAccountBalance,
  formatCents,
  formatCurrencyTotals,
  formatLocalDate,
  formatTransactionAmount,
  getTransactionBaseAmount,
  getTransactionOriginalAmount,
  groupAmountsByCurrency,
  previousMonth,
  startOfMonth,
} from '../utils'
import { messages } from '@core/ui/messages'

export function FinanceDashboard() {
  const navigate = useNavigate()
  const { formatDate, language } = useI18n()
  const allAccounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)
  const budgets = useFinanceStore((s) => s.budgets)
  const categories = useFinanceStore((s) => s.categories)
  const settings = useFinanceStore((s) => s.settings)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.archived), [allAccounts])

  const stats = useMemo(() => {
    const monthStart = formatLocalDate(startOfMonth())
    const prev = previousMonth()
    const prevStart = formatLocalDate(prev.start)
    const prevEnd = formatLocalDate(prev.end)
    let incomeBase = 0
    let expenseBase = 0
    let prevExpenseBase = 0
    let missingBase = 0
    const incomeOriginal: Array<{ amount: number; currency: string }> = []
    const expenseOriginal: Array<{ amount: number; currency: string }> = []

    for (const tx of transactions) {
      if (tx.kind !== 'income' && tx.kind !== 'expense') continue
      const original = getTransactionOriginalAmount(tx)
      const base = getTransactionBaseAmount(tx, settings.defaultCurrency, settings.exchangeRates)
      if (tx.occurredAt >= monthStart) {
        if (tx.kind === 'income') incomeOriginal.push(original)
        else expenseOriginal.push(original)
        if (base == null) missingBase += 1
        else if (tx.kind === 'income') incomeBase += base
        else expenseBase += base
      } else if (tx.kind === 'expense' && tx.occurredAt >= prevStart && tx.occurredAt <= prevEnd && base != null) {
        prevExpenseBase += base
      }
    }

    const balanceItems = accounts.map((account) => ({
      amount: computeAccountBalance(account, transactions),
      currency: account.currency,
    }))
    const balancesByCurrency = groupAmountsByCurrency(balanceItems)
    const primaryBalance = balancesByCurrency.get(settings.defaultCurrency) ?? Array.from(balancesByCurrency.values())[0] ?? 0
    const primaryCurrency = balancesByCurrency.has(settings.defaultCurrency)
      ? settings.defaultCurrency
      : Array.from(balancesByCurrency.keys())[0] ?? settings.defaultCurrency
    const deltaPct = prevExpenseBase > 0 ? Math.round(((expenseBase - prevExpenseBase) / prevExpenseBase) * 100) : null

    return {
      incomeBase,
      expenseBase,
      incomeOriginal: groupAmountsByCurrency(incomeOriginal),
      expenseOriginal: groupAmountsByCurrency(expenseOriginal),
      primaryBalance,
      primaryCurrency,
      balancesByCurrency,
      deltaPct,
      missingBase,
    }
  }, [accounts, transactions, settings])

  const monthTxs = useMemo(() => {
    const monthStart = formatLocalDate(startOfMonth())
    return transactions
      .filter((t) => t.occurredAt >= monthStart && t.kind !== 'transfer')
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0))
      .slice(0, 30)
  }, [transactions])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof monthTxs>()
    for (const tx of monthTxs) {
      const arr = map.get(tx.occurredAt) ?? []
      arr.push(tx)
      map.set(tx.occurredAt, arr)
    }
    return Array.from(map.entries())
  }, [monthTxs])

  const budgetByCat = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b])), [budgets])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const conversionHint = stats.missingBase > 0 ? `${stats.missingBase} mov. sin tasa manual` : undefined

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <BrandIcon name="TreasureChest" size={44} />
          <div>
            <p className="text-caption uppercase tracking-eyebrow text-muted">Finanzas</p>
            <h1 className="text-2xl font-bold text-white">{formatCents(stats.primaryBalance, stats.primaryCurrency)}</h1>
            <p className="text-xs text-muted">
              {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'} - {formatCurrencyTotals(stats.balancesByCurrency, { compact: true })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <NavChip icon={<ReceiptText size={12} />} label="Movimientos" onClick={() => navigate('/finance/transactions')} />
          <NavChip icon={<BadgeDollarSign size={12} />} label="Categorías" onClick={() => navigate('/finance/categories')} />
          {settings.recurringEnabled && <NavChip icon={<CalendarSync size={12} />} label="Recurrentes" onClick={() => navigate('/finance/recurring')} />}
          {settings.budgetsEnabled && <NavChip icon={<PiggyBank size={12} />} label="Presupuestos" onClick={() => navigate('/finance/budgets')} />}
          {settings.insightsEnabled && <NavChip icon={<ChartNoAxesCombined size={12} />} label="Insights" onClick={() => navigate('/finance/insights')} />}
        </div>
      </header>

      <section className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-3">
        <Kpi
          label={`Ingresos del mes (${settings.defaultCurrency})`}
          value={formatCents(stats.incomeBase, settings.defaultCurrency, { compact: true })}
          accent="text-emerald-300"
          icon={<ArrowDownRight size={14} />}
          hint={formatCurrencyTotals(stats.incomeOriginal, { compact: true, empty: 'Sin ingresos' })}
        />
        <Kpi
          label={`Gastos del mes (${settings.defaultCurrency})`}
          value={formatCents(stats.expenseBase, settings.defaultCurrency, { compact: true })}
          accent="text-rose-300"
          icon={<ArrowUpRight size={14} />}
          hint={stats.deltaPct != null ? `${stats.deltaPct > 0 ? '+' : ''}${stats.deltaPct}% vs mes anterior` : conversionHint}
        />
        <Kpi
          label={`Saldo neto (${settings.defaultCurrency})`}
          value={formatCents(stats.incomeBase - stats.expenseBase, settings.defaultCurrency, { compact: true })}
          accent={stats.incomeBase - stats.expenseBase >= 0 ? 'text-emerald-300' : 'text-rose-300'}
          icon={<Banknote size={14} />}
          hint={conversionHint}
        />
      </section>

      <QuickAddTransaction />

      <AccountsManager />

      <section className="flex max-h-[520px] min-h-[360px] flex-col rounded-2xl border border-border bg-surface-light/90 p-5 shadow-xl">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Movimientos del mes</h2>
          <button
            type="button"
            onClick={() => navigate('/finance/transactions')}
            className="text-xs text-muted hover:text-white"
          >Ver todo</button>
        </header>
        {grouped.length === 0 && (
          <p className="text-sm text-muted">{messages.empty.financeTransactions}</p>
        )}
        <div className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto pr-1">
          {grouped.map(([date, txs]) => (
            <div key={date} className="py-2">
              <p className="mb-1 text-micro uppercase tracking-wider text-muted">{formatHumanDate(date, language, formatDate)}</p>
              <ul className="space-y-1">
                {txs.map((tx) => {
                  const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null
                  const acc = accountById.get(tx.accountId)
                  const budget = cat ? budgetByCat.get(cat.id) : null
                  return (
                    <li key={tx.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-surface/60">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex-shrink-0 ${tx.kind === 'income' ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {tx.kind === 'income' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </span>
                        <span className="truncate text-white">{cat?.name ?? 'Sin categoria'}</span>
                        {tx.note && <span className="truncate text-xs text-muted">- {tx.note}</span>}
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2 text-xs text-muted">
                        {budget && <span title="Presupuesto definido" className="text-amber-300/70">*</span>}
                        <span>{acc?.name}</span>
                        <span className={`font-mono font-medium ${tx.kind === 'income' ? 'text-emerald-200' : 'text-rose-200'}`}>
                          {tx.kind === 'income' ? '+' : '-'}{formatTransactionAmount(tx)}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, value, accent, icon, hint }: { label: string; value: string; accent: string; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="min-h-[96px] rounded-xl border border-border bg-surface px-4 py-3">
      <div className={`mb-1 flex items-center gap-1.5 text-caption uppercase tracking-wider ${accent}`}>
        {icon}<span>{label}</span>
      </div>
      <p className="text-xl font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-caption text-muted">{hint}</p>}
    </div>
  )
}

function NavChip({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-muted transition-colors hover:text-white"
    >
      {icon}<span>{label}</span>
    </button>
  )
}

function formatHumanDate(
  iso: string,
  language: 'es' | 'en',
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string,
): string {
  const today = formatLocalDate(new Date())
  const yest = formatLocalDate(new Date(Date.now() - 86_400_000))
  if (iso === today) return language === 'en' ? 'Today' : 'Hoy'
  if (iso === yest) return language === 'en' ? 'Yesterday' : 'Ayer'
  try {
    return formatDate(new Date(`${iso}T00:00:00`), { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}
