import { useEffect, useMemo, useState } from 'react'
import { Edit2, Plus, Save, Trash2, WalletCards, X } from 'lucide-react'
import { useFinanceStore } from '../store'
import { createAccount, archiveAccount, updateAccount } from '../operations'
import { centsToInput, parseAmountToCents, formatCents, computeAccountBalance, normalizeCurrencyCode } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import type { Account, AccountType } from '../types'
import { CurrencyInput } from './CurrencyInput'

const TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Efectivo',
  bank: 'Banco',
  card: 'Tarjeta',
  wallet: 'Billetera',
  other: 'Otra',
}

interface AccountDraft {
  name: string
  type: AccountType
  currency: string
  initial: string
  color: string
}

function emptyDraft(defaultCurrency: string): AccountDraft {
  return {
    name: '',
    type: 'cash',
    currency: defaultCurrency,
    initial: '',
    color: '#7c3aed',
  }
}

function draftFromAccount(account: Account): AccountDraft {
  return {
    name: account.name,
    type: account.type,
    currency: account.currency,
    initial: centsToInput(account.initialBalance),
    color: account.color ?? '#7c3aed',
  }
}

export function AccountsManager() {
  const accounts = useFinanceStore((s) => s.accounts)
  const transactions = useFinanceStore((s) => s.transactions)
  const defaultCurrency = useFinanceStore((s) => s.settings.defaultCurrency)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AccountDraft>(() => emptyDraft(defaultCurrency))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open && !editingId) setDraft(emptyDraft(defaultCurrency))
  }, [defaultCurrency, open, editingId])

  const visible = useMemo(() => accounts.filter((a) => !a.archived), [accounts])

  const reset = () => {
    setOpen(false)
    setEditingId(null)
    setDraft(emptyDraft(defaultCurrency))
  }

  const onCreate = async () => {
    if (!draft.name.trim()) return
    setBusy(true)
    try {
      await createAccount({
        name: draft.name.trim(),
        type: draft.type,
        currency: normalizeCurrencyCode(draft.currency, defaultCurrency),
        initialBalance: parseAmountToCents(draft.initial),
        color: draft.color || null,
      })
      reset()
      toast.success('Cuenta creada.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSaveEdit = async () => {
    if (!editingId || !draft.name.trim()) return
    setBusy(true)
    try {
      await updateAccount(editingId, {
        name: draft.name.trim(),
        type: draft.type,
        currency: normalizeCurrencyCode(draft.currency, defaultCurrency),
        initialBalance: parseAmountToCents(draft.initial),
        color: draft.color || null,
      })
      reset()
      toast.success('Cuenta actualizada.')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onArchive = async (id: string) => {
    try {
      await archiveAccount(id)
      toast.info('Cuenta archivada.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const startEdit = (account: Account) => {
    setOpen(false)
    setEditingId(account.id)
    setDraft(draftFromAccount(account))
  }

  const formOpen = open || editingId !== null

  return (
    <section className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WalletCards size={14} className="text-accent-light" />
          <h2 className="text-sm font-semibold text-white">Cuentas</h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingId(null)
            setOpen((v) => !v)
            setDraft(emptyDraft(defaultCurrency))
          }}
          className="inline-flex items-center gap-1 rounded-lg border border-accent bg-accent/15 px-2.5 py-1 text-xs text-accent-light hover:bg-accent/25"
        >
          <Plus size={12} /> Nueva
        </button>
      </header>

      {formOpen && (
        <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl border border-border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]">
          <input
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Nombre"
            className="min-w-0 rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white outline-none focus:border-accent sm:col-span-2 lg:col-span-1"
            autoFocus
          />
          <select
            value={draft.type}
            onChange={(e) => setDraft((prev) => ({ ...prev, type: e.target.value as AccountType }))}
            className="min-w-0 rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white outline-none focus:border-accent"
          >
            {(Object.keys(TYPE_LABELS) as AccountType[]).map((type) => (
              <option key={type} value={type}>{TYPE_LABELS[type]}</option>
            ))}
          </select>
          <CurrencyInput
            value={draft.currency}
            onChange={(currency) => setDraft((prev) => ({ ...prev, currency }))}
            selectClassName="bg-surface-light py-1.5"
            inputClassName="bg-surface-light py-1.5"
          />
          <input
            value={draft.initial}
            onChange={(e) => setDraft((prev) => ({ ...prev, initial: e.target.value }))}
            placeholder="Saldo inicial"
            inputMode="decimal"
            className="w-full rounded-lg border border-border bg-surface-light px-2 py-1.5 text-sm text-white outline-none focus:border-accent lg:w-32"
          />
          <input
            type="color"
            value={draft.color}
            onChange={(e) => setDraft((prev) => ({ ...prev, color: e.target.value }))}
            className="h-9 w-full rounded-lg border border-border bg-surface-light p-1 lg:w-12"
            aria-label="Color de cuenta"
          />
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button
              type="button"
              onClick={() => void (editingId ? onSaveEdit() : onCreate())}
              disabled={busy || !draft.name.trim()}
              className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-xs text-accent-light hover:bg-accent/25 disabled:opacity-40"
            >
              <Save size={12} /> {editingId ? 'Guardar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-border px-2 py-1.5 text-xs text-muted hover:text-white"
              aria-label="Cancelar"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface/40 px-3 py-4 text-center text-xs text-muted">
          Sin cuentas. Crea la primera para arrancar.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {visible.map((account) => {
            const balance = computeAccountBalance(account, transactions)
            return (
              <li key={account.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="h-9 w-1.5 shrink-0 rounded-full bg-accent"
                    style={account.color ? { backgroundColor: account.color } : undefined}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{account.name}</p>
                    <p className="truncate text-xs text-muted">{TYPE_LABELS[account.type]} - {account.currency}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`font-mono text-sm ${balance >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>
                    {formatCents(balance, account.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(account)}
                    className="rounded p-1 text-muted hover:text-accent-light"
                    aria-label="Editar cuenta"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void onArchive(account.id)}
                    className="rounded p-1 text-muted hover:text-rose-300"
                    aria-label="Archivar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
