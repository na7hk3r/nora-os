import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useFinanceStore } from '../store'
import { createTransaction, createTransfer, createWithdrawal } from '../operations'
import { detectAnomaly } from '../insights'
import { parseAmountToCents, todayISO, formatCents, normalizeCurrencyCode } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'
import { CurrencyInput } from './CurrencyInput'

const LAST_USED_KEY = 'finance:lastUsed'

type QuickAddMode = 'income' | 'expense' | 'transfer' | 'withdrawal'

interface LastUsed {
  categoryId?: string
  accountId?: string
  kind?: 'income' | 'expense'
  currency?: string
  toAccountId?: string
}

function readLastUsed(): LastUsed {
  try {
    const raw = window.localStorage.getItem(LAST_USED_KEY)
    return raw ? (JSON.parse(raw) as LastUsed) : {}
  } catch {
    return {}
  }
}

function writeLastUsed(last: LastUsed): void {
  try {
    window.localStorage.setItem(LAST_USED_KEY, JSON.stringify(last))
  } catch {
    // ignore
  }
}

export function QuickAddTransaction() {
  const allAccounts = useFinanceStore((s) => s.accounts)
  const allCategories = useFinanceStore((s) => s.categories)
  const settings = useFinanceStore((s) => s.settings)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.archived), [allAccounts])
  const categories = useMemo(() => allCategories.filter((c) => !c.archived), [allCategories])
  const { toast } = useToast()
  const initial = readLastUsed()

  const [amount, setAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [mode, setMode] = useState<QuickAddMode>(initial.kind ?? 'expense')
  const [categoryId, setCategoryId] = useState<string>(initial.categoryId ?? '')
  const [accountId, setAccountId] = useState<string>(initial.accountId ?? accounts[0]?.id ?? '')
  const [toAccountId, setToAccountId] = useState<string>(initial.toAccountId ?? accounts.find((a) => a.id !== accountId)?.id ?? '')
  const [currency, setCurrency] = useState(initial.currency ?? accounts[0]?.currency ?? settings.defaultCurrency)
  const [occurredAt, setOccurredAt] = useState(todayISO())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const amountRef = useRef<HTMLInputElement>(null)

  const account = accounts.find((a) => a.id === accountId)
  const transferAvailable = settings.transfersEnabled && accounts.length > 1
  const withdrawalAvailable = settings.transfersEnabled && accounts.length > 0

  const targetAccounts = useMemo(() => {
    const base = accounts.filter((a) => a.id !== accountId)
    return mode === 'withdrawal' ? base.filter((a) => a.type === 'cash') : base
  }, [accounts, accountId, mode])

  const targetAccount = targetAccounts.find((a) => a.id === toAccountId)
  const needsTargetAmount = (mode === 'transfer' || mode === 'withdrawal') &&
    Boolean(account && targetAccount && account.currency !== targetAccount.currency)

  const filteredCategories = useMemo(
    () => (mode === 'transfer' || mode === 'withdrawal' ? [] : categories.filter((c) => c.kind === mode)),
    [categories, mode],
  )

  useEffect(() => {
    if (accounts.length === 0) {
      if (accountId !== '') setAccountId('')
      if (toAccountId !== '') setToAccountId('')
      return
    }

    const nextAccountId = accounts.some((a) => a.id === accountId) ? accountId : accounts[0].id
    if (nextAccountId !== accountId) setAccountId(nextAccountId)

    const nextTargets = (mode === 'withdrawal'
      ? accounts.filter((a) => a.id !== nextAccountId && a.type === 'cash')
      : accounts.filter((a) => a.id !== nextAccountId))
    const validTarget = toAccountId && nextTargets.some((a) => a.id === toAccountId)
    if (!validTarget) setToAccountId(nextTargets[0]?.id ?? '')
  }, [accounts, accountId, toAccountId, mode])

  useEffect(() => {
    if (mode === 'transfer' && !transferAvailable) setMode('expense')
    if (mode === 'withdrawal' && !withdrawalAvailable) setMode('expense')
  }, [mode, transferAvailable, withdrawalAvailable])

  useEffect(() => {
    if (!categoryId) return
    const valid = filteredCategories.some((c) => c.id === categoryId)
    if (!valid) setCategoryId('')
  }, [filteredCategories, categoryId])

  useEffect(() => {
    if (!account) return
    if (!currency) setCurrency(account.currency)
  }, [account, currency])

  const reset = () => {
    setAmount('')
    setToAmount('')
    setNote('')
    setOccurredAt(todayISO())
    setTimeout(() => amountRef.current?.focus(), 0)
  }

  const submit = async () => {
    const cents = parseAmountToCents(amount)
    if (cents <= 0) {
      toast.error(messages.errors.financeAmountInvalid ?? 'Monto invalido. Usa un numero mayor a 0.')
      return
    }
    if (!accountId) {
      toast.error(messages.errors.financeAccountMissing ?? 'Elegi una cuenta.')
      return
    }
    if ((mode === 'transfer' || mode === 'withdrawal') && (!toAccountId || toAccountId === accountId)) {
      toast.error(mode === 'withdrawal' ? 'Elegi una cuenta de efectivo destino.' : 'Elegi una cuenta destino distinta.')
      return
    }

    const destinationCents = needsTargetAmount ? parseAmountToCents(toAmount) : cents
    if (needsTargetAmount && destinationCents <= 0) {
      toast.error(`Ingresa el monto destino en ${targetAccount?.currency ?? 'otra moneda'}.`)
      return
    }

    setBusy(true)
    try {
      if (mode === 'transfer') {
        await createTransfer({
          fromAccountId: accountId,
          toAccountId,
          amount: cents,
          fromAmount: cents,
          toAmount: destinationCents,
          occurredAt,
          note: note.trim() || null,
        })
        writeLastUsed({ accountId, toAccountId, kind: 'expense' })
        toast.success('Transferencia registrada.', { timeoutMs: 1800 })
      } else if (mode === 'withdrawal') {
        await createWithdrawal({
          fromAccountId: accountId,
          cashAccountId: toAccountId,
          amount: cents,
          toAmount: destinationCents,
          occurredAt,
          note: note.trim() || null,
        })
        writeLastUsed({ accountId, toAccountId, kind: 'expense' })
        toast.success('Retiro registrado.', { timeoutMs: 1800 })
      } else {
        const tx = await createTransaction({
          accountId,
          categoryId: categoryId || null,
          kind: mode,
          amount: cents,
          currency: normalizeCurrencyCode(currency, account?.currency ?? settings.defaultCurrency),
          occurredAt,
          note: note.trim() || null,
        })
        writeLastUsed({ categoryId: categoryId || undefined, accountId, kind: mode, currency })
        const anomaly = detectAnomaly(tx.id)
        if (anomaly) {
          toast.info(
            `Gasto inusual en ${anomaly.categoryName}: ${formatCents(anomaly.amountCents, tx.currency)} (~${Math.round(anomaly.ratio * 10) / 10}x el habitual).`,
            { timeoutMs: 6000 },
          )
        } else {
          toast.success(messages.success.financeTransactionCreated ?? 'Movimiento registrado.', { timeoutMs: 1800 })
        }
      }
      reset()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !busy) {
      e.preventDefault()
      void submit()
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-6 text-sm text-muted">
        {messages.empty.financeAccounts ?? 'Crea una cuenta para arrancar.'}
      </div>
    )
  }

  return (
    <div
      className="workspace-form-grid gap-2 rounded-2xl border border-border bg-surface-light/90 p-3 shadow-xl"
      onKeyDown={onKeyDown}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode('expense')}
          className={`flex-1 rounded-md px-2 py-1 xl:flex-none ${mode === 'expense' ? 'bg-rose-500/20 text-rose-100' : 'text-muted hover:text-white'}`}
        >Gasto</button>
        <button
          type="button"
          onClick={() => setMode('income')}
          className={`flex-1 rounded-md px-2 py-1 xl:flex-none ${mode === 'income' ? 'bg-emerald-500/20 text-emerald-100' : 'text-muted hover:text-white'}`}
        >Ingreso</button>
        {transferAvailable && (
          <button
            type="button"
            onClick={() => setMode('transfer')}
            className={`flex-1 rounded-md px-2 py-1 xl:flex-none ${mode === 'transfer' ? 'bg-accent/20 text-accent-light' : 'text-muted hover:text-white'}`}
          >Transfer</button>
        )}
        {withdrawalAvailable && (
          <button
            type="button"
            onClick={() => setMode('withdrawal')}
            className={`flex-1 rounded-md px-2 py-1 xl:flex-none ${mode === 'withdrawal' ? 'bg-amber-500/20 text-amber-100' : 'text-muted hover:text-white'}`}
          >Retiro</button>
        )}
      </div>
      <input
        ref={amountRef}
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder={mode === 'transfer' || mode === 'withdrawal' ? `Sale ${account?.currency ?? ''}` : 'Monto'}
        className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        autoFocus
      />
      <input
        type="date"
        value={occurredAt}
        onChange={(e) => setOccurredAt(e.target.value)}
        className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />
      {mode === 'transfer' || mode === 'withdrawal' ? (
        <select
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          className="min-w-0 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent"
        >
          {targetAccounts.length === 0 ? (
            <option value="">{mode === 'withdrawal' ? 'Crea una cuenta efectivo' : 'Sin cuenta destino'}</option>
          ) : targetAccounts.map((a) => (
            <option key={a.id} value={a.id}>A {a.name} ({a.currency})</option>
          ))}
        </select>
      ) : (
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="min-w-0 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent"
        >
          <option value="">Sin categoria</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <select
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="min-w-0 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white outline-none focus:border-accent"
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{mode === 'transfer' || mode === 'withdrawal' ? `Desde ${a.name}` : `${a.name} (${a.currency})`}</option>
        ))}
      </select>
      {mode === 'transfer' || mode === 'withdrawal' ? (
        needsTargetAmount ? (
          <input
            type="text"
            inputMode="decimal"
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
            placeholder={`Entra ${targetAccount?.currency ?? ''}`}
            className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
        ) : (
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
        )
      ) : (
        <>
          <CurrencyInput
            value={currency}
            onChange={setCurrency}
            className="min-w-0"
            selectClassName="w-full"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (opcional)"
            className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
        </>
      )}
      {needsTargetAmount && (
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opcional)"
          className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
        />
      )}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || ((mode === 'transfer' || mode === 'withdrawal') && !toAccountId)}
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-sm text-accent-light hover:bg-accent/25 disabled:opacity-40"
      >
        <Plus size={14} /> Cargar
      </button>
    </div>
  )
}
