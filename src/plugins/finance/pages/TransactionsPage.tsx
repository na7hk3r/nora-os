import { useMemo, useState } from 'react'
import { Edit2, Save, Search, Trash2, X } from 'lucide-react'
import { useFinanceStore } from '../store'
import { deleteTransaction, updateTransaction } from '../operations'
import {
  centsToInput,
  formatCurrencyTotals,
  formatLocalDate,
  formatTransactionAmount,
  getTransactionOriginalAmount,
  groupAmountsByCurrency,
  isIncomingTransfer,
  normalizeCurrencyCode,
  parseAmountToCents,
  previousMonth,
  startOfMonth,
} from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'
import type { Transaction } from '../types'
import { CurrencyInput } from '../components/CurrencyInput'

type RangePreset = 'this-month' | 'last-month' | 'last-90' | 'all'

interface TxDraft {
  accountId: string
  categoryId: string
  kind: 'income' | 'expense'
  amount: string
  currency: string
  occurredAt: string
  note: string
}

function draftFromTransaction(tx: Transaction): TxDraft {
  const original = getTransactionOriginalAmount(tx)
  return {
    accountId: tx.accountId,
    categoryId: tx.categoryId ?? '',
    kind: tx.kind === 'income' ? 'income' : 'expense',
    amount: centsToInput(original.amount),
    currency: original.currency,
    occurredAt: tx.occurredAt,
    note: tx.note ?? '',
  }
}

export function TransactionsPage() {
  const accounts = useFinanceStore((s) => s.accounts)
  const categories = useFinanceStore((s) => s.categories)
  const transactions = useFinanceStore((s) => s.transactions)
  const defaultCurrency = useFinanceStore((s) => s.settings.defaultCurrency)
  const { toast } = useToast()

  const [range, setRange] = useState<RangePreset>('this-month')
  const [accountId, setAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [currencyFilter, setCurrencyFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TxDraft | null>(null)

  const activeAccounts = useMemo(() => accounts.filter((a) => !a.archived), [accounts])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const editingTx = editingId ? transactions.find((tx) => tx.id === editingId) ?? null : null

  const currencyOptions = useMemo(() => {
    const set = new Set<string>([defaultCurrency])
    for (const account of accounts) set.add(account.currency)
    for (const tx of transactions) {
      set.add(tx.currency)
      set.add(tx.originalCurrency ?? tx.currency)
    }
    return Array.from(set).filter(Boolean).sort()
  }, [accounts, transactions, defaultCurrency])

  const rangeBounds = useMemo(() => {
    const today = new Date()
    if (range === 'this-month') return { start: formatLocalDate(startOfMonth()), end: formatLocalDate(today) }
    if (range === 'last-month') {
      const p = previousMonth()
      return { start: formatLocalDate(p.start), end: formatLocalDate(p.end) }
    }
    if (range === 'last-90') {
      return { start: formatLocalDate(new Date(Date.now() - 90 * 86_400_000)), end: formatLocalDate(today) }
    }
    return { start: '0000-01-01', end: '9999-12-31' }
  }, [range])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return transactions
      .filter((t) => t.occurredAt >= rangeBounds.start && t.occurredAt <= rangeBounds.end)
      .filter((t) => (accountId ? t.accountId === accountId : true))
      .filter((t) => (categoryId ? t.categoryId === categoryId : true))
      .filter((t) => (currencyFilter ? t.currency === currencyFilter || (t.originalCurrency ?? t.currency) === currencyFilter : true))
      .filter((t) => (kindFilter === 'all' ? true : t.kind === kindFilter))
      .filter((t) => {
        if (!q) return true
        const cat = t.categoryId ? categoryById.get(t.categoryId)?.name?.toLowerCase() ?? '' : ''
        const acc = accountById.get(t.accountId)?.name.toLowerCase() ?? ''
        const note = t.note?.toLowerCase() ?? ''
        return cat.includes(q) || acc.includes(q) || note.includes(q)
      })
      .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : a.createdAt < b.createdAt ? 1 : -1))
  }, [transactions, rangeBounds, accountId, categoryId, currencyFilter, kindFilter, search, categoryById, accountById])

  const totals = useMemo(() => {
    const incomeItems: Array<{ amount: number; currency: string }> = []
    const expenseItems: Array<{ amount: number; currency: string }> = []
    for (const tx of filtered) {
      if (tx.kind !== 'income' && tx.kind !== 'expense') continue
      const original = getTransactionOriginalAmount(tx)
      if (tx.kind === 'income') incomeItems.push(original)
      else expenseItems.push(original)
    }
    return {
      income: groupAmountsByCurrency(incomeItems),
      expense: groupAmountsByCurrency(expenseItems),
    }
  }, [filtered])

  const startEdit = (tx: Transaction) => {
    if (tx.kind === 'transfer') return
    setEditingId(tx.id)
    setDraft(draftFromTransaction(tx))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
  }

  const saveEdit = async () => {
    if (!editingId || !draft) return
    const cents = parseAmountToCents(draft.amount)
    if (cents <= 0) {
      toast.error(messages.errors.financeAmountInvalid ?? 'Monto invalido.')
      return
    }
    try {
      await updateTransaction(editingId, {
        accountId: draft.accountId,
        categoryId: draft.categoryId || null,
        kind: draft.kind,
        amount: cents,
        currency: normalizeCurrencyCode(draft.currency, defaultCurrency),
        occurredAt: draft.occurredAt,
        note: draft.note.trim() || null,
      })
      cancelEdit()
      toast.success('Movimiento actualizado.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deleteTransaction(id)
      toast.success(messages.success.financeTransactionDeleted ?? 'Movimiento borrado.')
      if (editingId === id) cancelEdit()
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const draftCategories = categories.filter((c) => !c.archived && (!draft || c.kind === draft.kind))

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <SegPreset value={range} onChange={setRange} options={[
            { v: 'this-month', l: 'Este mes' },
            { v: 'last-month', l: 'Mes pasado' },
            { v: 'last-90', l: '90 dias' },
            { v: 'all', l: 'Todo' },
          ]} />
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-white">
            <option value="">Todas las cuentas</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-white">
            <option value="">Todas las categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={currencyFilter} onChange={(e) => setCurrencyFilter(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-white">
            <option value="">Todas las monedas</option>
            {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
          </select>
          <SegPreset value={kindFilter} onChange={setKindFilter} options={[
            { v: 'all', l: 'Todo' },
            { v: 'income', l: 'Ingresos' },
            { v: 'expense', l: 'Gastos' },
            { v: 'transfer', l: 'Transfer' },
          ]} />
          <label className="min-w-0 flex-1 basis-56 md:ml-auto md:flex-none inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2 py-1.5">
            <Search size={12} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nota, cuenta o categoria"
              className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted md:w-52"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
          <span>{filtered.length} movimientos</span>
          <span className="text-emerald-300">+ {formatCurrencyTotals(totals.income, { compact: true, empty: '0' })}</span>
          <span className="text-rose-300">- {formatCurrencyTotals(totals.expense, { compact: true, empty: '0' })}</span>
        </div>
      </header>

      {draft && editingTx && (
        <section className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Editar movimiento</h2>
            <button type="button" onClick={cancelEdit} className="rounded p-1 text-muted hover:text-white" aria-label="Cerrar editor">
              <X size={16} />
            </button>
          </div>
          <div className="workspace-form-grid gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
              <button type="button" onClick={() => setDraft((prev) => prev && { ...prev, kind: 'expense', categoryId: '' })}
                className={`flex-1 rounded-md px-2 py-1 ${draft.kind === 'expense' ? 'bg-rose-500/20 text-rose-100' : 'text-muted'}`}>Gasto</button>
              <button type="button" onClick={() => setDraft((prev) => prev && { ...prev, kind: 'income', categoryId: '' })}
                className={`flex-1 rounded-md px-2 py-1 ${draft.kind === 'income' ? 'bg-emerald-500/20 text-emerald-100' : 'text-muted'}`}>Ingreso</button>
            </div>
            <input value={draft.amount} onChange={(e) => setDraft((prev) => prev && { ...prev, amount: e.target.value })} inputMode="decimal"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent" />
            <CurrencyInput value={draft.currency} onChange={(currency) => setDraft((prev) => prev && { ...prev, currency })} />
            <input type="date" value={draft.occurredAt} onChange={(e) => setDraft((prev) => prev && { ...prev, occurredAt: e.target.value })}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent" />
            <select value={draft.accountId} onChange={(e) => setDraft((prev) => prev && { ...prev, accountId: e.target.value })}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent">
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </select>
            <select value={draft.categoryId} onChange={(e) => setDraft((prev) => prev && { ...prev, categoryId: e.target.value })}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent">
              <option value="">Sin categoria</option>
              {draftCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={draft.note} onChange={(e) => setDraft((prev) => prev && { ...prev, note: e.target.value })} placeholder="Nota"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent md:col-span-2 xl:col-span-1" />
            <button type="button" onClick={() => void saveEdit()}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-sm text-accent-light hover:bg-accent/25 md:col-span-2 xl:col-span-1">
              <Save size={14} /> Guardar
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-surface-light/90 shadow-xl">
        {filtered.length === 0 ? (
          <p className="p-6 text-sm text-muted">{messages.empty.financeTransactions}</p>
        ) : (
          <ul className="max-h-[65vh] divide-y divide-border/40 overflow-y-auto">
            {filtered.map((tx) => {
              const cat = tx.categoryId ? categoryById.get(tx.categoryId) : null
              const acc = accountById.get(tx.accountId)
              const incoming = tx.kind === 'transfer' ? isIncomingTransfer(tx, transactions) : false
              const transferLabel = tx.movementSubtype === 'withdrawal' ? 'Retiro' : 'Transferencia'
              return (
                <li key={tx.id} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[88px_1fr_auto_auto_auto] md:items-center">
                  <span className="text-xs text-muted">{tx.occurredAt}</span>
                  <div className="min-w-0">
                    <p className="truncate text-white">
                      {tx.kind === 'transfer' ? transferLabel : cat?.name ?? 'Sin categoria'}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {acc?.name ?? 'Cuenta'}{tx.note ? ` - ${tx.note}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted">{tx.kind === 'transfer' ? tx.currency : tx.originalCurrency ?? tx.currency}</span>
                  <span className={`font-mono text-sm ${
                    tx.kind === 'income' || incoming ? 'text-emerald-200' : tx.kind === 'expense' || tx.kind === 'transfer' ? 'text-rose-200' : 'text-muted'
                  }`}>
                    {tx.kind === 'income' || incoming ? '+' : tx.kind === 'expense' || tx.kind === 'transfer' ? '-' : ''}
                    {formatTransactionAmount(tx)}
                  </span>
                  <div className="flex items-center justify-end gap-1">
                    {tx.kind !== 'transfer' && (
                      <button
                        type="button"
                        onClick={() => startEdit(tx)}
                        className="rounded p-1 text-muted hover:text-accent-light"
                        aria-label="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void onDelete(tx.id)}
                      className="rounded p-1 text-muted hover:text-rose-300"
                      aria-label="Borrar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function SegPreset<T extends string>({ value, onChange, options }: {
  value: T
  onChange: (v: T) => void
  options: Array<{ v: T; l: string }>
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`rounded-md px-2 py-1 text-xs ${value === o.v ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-white'}`}
        >{o.l}</button>
      ))}
    </div>
  )
}
