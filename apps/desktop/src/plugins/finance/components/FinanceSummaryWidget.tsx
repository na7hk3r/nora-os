import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useFinanceStore } from '../store'
import {
  computeAccountBalance,
  formatCents,
  formatCurrencyTotals,
  formatLocalDate,
  getTransactionBaseAmount,
  groupAmountsByCurrency,
  startOfMonth,
} from '../utils'
import { messages } from '@core/ui/messages'

export function FinanceSummaryWidget() {
  const navigate = useNavigate()
  const accounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)
  const settings = useFinanceStore((s) => s.settings)

  const summary = useMemo(() => {
    const activeAccounts = accounts.filter((a) => !a.archived)
    if (activeAccounts.length === 0) return null
    const monthStart = formatLocalDate(startOfMonth())
    let income = 0
    let expense = 0
    for (const tx of transactions) {
      if (tx.occurredAt < monthStart) continue
      const base = getTransactionBaseAmount(tx, settings.defaultCurrency, settings.exchangeRates)
      if (base == null) continue
      if (tx.kind === 'income') income += base
      else if (tx.kind === 'expense') expense += base
    }
    const balances = groupAmountsByCurrency(
      activeAccounts.map((account) => ({
        amount: computeAccountBalance(account, transactions),
        currency: account.currency,
      })),
    )
    const balance = balances.get(settings.defaultCurrency) ?? Array.from(balances.values())[0] ?? 0
    const currency = balances.has(settings.defaultCurrency)
      ? settings.defaultCurrency
      : Array.from(balances.keys())[0] ?? settings.defaultCurrency
    return { currency, income, expense, balance, balances, accountCount: activeAccounts.length }
  }, [accounts, transactions, settings])

  if (!summary) {
    return (
      <button
        type="button"
        onClick={() => navigate('/finance')}
        className="flex w-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted hover:text-white"
      >
        {messages.empty.financeAccounts ?? 'Crea una cuenta para arrancar.'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/finance')}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface-light/90 p-5 text-left shadow-xl transition-colors hover:border-accent/50"
    >
      <div className="flex items-center gap-2">
        <Landmark size={16} className="text-accent-light" />
        <span className="text-caption uppercase tracking-eyebrow text-muted">Balance del mes</span>
      </div>
      <div>
        <p className="text-2xl font-semibold text-white">{formatCents(summary.balance, summary.currency)}</p>
        <p className="text-xs text-muted">{summary.accountCount} cuentas - {formatCurrencyTotals(summary.balances, { compact: true })}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <ArrowDownRight size={14} className="text-emerald-300" />
          <span className="text-muted">Ingresos</span>
          <span className="ml-auto font-medium text-white">{formatCents(summary.income, settings.defaultCurrency, { compact: true })}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5">
          <ArrowUpRight size={14} className="text-rose-300" />
          <span className="text-muted">Gastos</span>
          <span className="ml-auto font-medium text-white">{formatCents(summary.expense, settings.defaultCurrency, { compact: true })}</span>
        </div>
      </div>
    </button>
  )
}
