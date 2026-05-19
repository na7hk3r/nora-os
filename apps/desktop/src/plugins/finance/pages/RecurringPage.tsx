import { useEffect, useMemo, useState } from 'react'
import { CalendarSync, Plus, Play, Pause } from 'lucide-react'
import { useFinanceStore } from '../store'
import { createRecurring, setRecurringActive, runRecurringEngine } from '../operations'
import { parseAmountToCents, formatCents, todayISO } from '../utils'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'

type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export function RecurringPage() {
  const allAccounts = useFinanceStore((s) => s.accounts)
  const allCategories = useFinanceStore((s) => s.categories)
  const accounts = useMemo(() => allAccounts.filter((a) => !a.archived), [allAccounts])
  const categories = useMemo(() => allCategories.filter((c) => !c.archived), [allCategories])
  const recurring = useFinanceStore((s) => s.recurring)
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState<string>('')
  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [freq, setFreq] = useState<Freq>('MONTHLY')
  const [interval, setInterval] = useState(1)
  const [byMonthDay, setByMonthDay] = useState<number | ''>(1)
  const [nextRun, setNextRun] = useState(todayISO())

  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  useEffect(() => {
    if (accounts.length === 0) {
      if (accountId !== '') setAccountId('')
      return
    }
    if (!accounts.some((a) => a.id === accountId)) setAccountId(accounts[0].id)
  }, [accounts, accountId])

  useEffect(() => {
    if (!categoryId) return
    if (!categories.some((c) => c.id === categoryId)) setCategoryId('')
  }, [categories, categoryId])

  const onCreate = async () => {
    const cents = parseAmountToCents(amount)
    if (cents <= 0) return toast.error(messages.errors.financeAmountInvalid ?? 'Monto inválido.')
    if (!accountId) return toast.error(messages.errors.financeAccountMissing ?? 'Cuenta requerida.')
    const account = accountById.get(accountId)
    if (!account) return
    const parts = [`FREQ=${freq}`, `INTERVAL=${interval}`]
    if (freq === 'MONTHLY' && byMonthDay) parts.push(`BYMONTHDAY=${byMonthDay}`)
    try {
      await createRecurring({
        template: {
          accountId,
          categoryId: categoryId || null,
          kind,
          amount: cents,
          currency: account.currency,
          note: note.trim() || null,
        },
        rrule: parts.join(';'),
        nextRun,
      })
      setOpen(false)
      setAmount('')
      setNote('')
      toast.success('Recurrencia creada.')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const onRun = async () => {
    try {
      const count = await runRecurringEngine()
      if (count === 0) toast.info('No había recurrencias atrasadas.')
      else toast.success(messages.success.financeRecurringMaterialized?.(count) ?? `${count} generados.`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <div>
          <h1 className="text-sm font-semibold text-white">Recurrentes</h1>
          <p className="text-xs text-muted">Materialización local-first. Se generan al abrir la app.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void onRun()}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-white">
            <CalendarSync size={12} /> Ejecutar ahora
          </button>
          <button type="button" onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-xs text-accent-light hover:bg-accent/25">
            <Plus size={12} /> Nueva
          </button>
        </div>
      </header>

      {open && (
        <section className="space-y-3 rounded-2xl border border-border bg-surface-light/90 p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
              <option value="">Sin categoría</option>
              {categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
              <button type="button" onClick={() => setKind('expense')}
                className={`flex-1 rounded-md px-2 py-1 ${kind === 'expense' ? 'bg-rose-500/20 text-rose-100' : 'text-muted'}`}>Gasto</button>
              <button type="button" onClick={() => setKind('income')}
                className={`flex-1 rounded-md px-2 py-1 ${kind === 'income' ? 'bg-emerald-500/20 text-emerald-100' : 'text-muted'}`}>Ingreso</button>
            </div>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" inputMode="decimal"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota"
              className="md:col-span-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select value={freq} onChange={(e) => setFreq(e.target.value as Freq)}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-white">
              <option value="DAILY">Diaria</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensual</option>
            </select>
            <label className="flex items-center gap-2 text-xs text-muted">
              Cada
              <input type="number" min={1} value={interval} onChange={(e) => setInterval(Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-white" />
            </label>
            {freq === 'MONTHLY' && (
              <label className="flex items-center gap-2 text-xs text-muted">
                Día del mes
                <input type="number" min={1} max={31} value={byMonthDay}
                  onChange={(e) => setByMonthDay(e.target.value === '' ? '' : Math.min(31, Math.max(1, Number(e.target.value))))}
                  className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-white" />
              </label>
            )}
            <label className="flex items-center gap-2 text-xs text-muted">
              Próxima
              <input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-white" />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-white">Cancelar</button>
            <button type="button" onClick={() => void onCreate()}
              className="rounded-lg border border-accent bg-accent/15 px-3 py-1.5 text-xs text-accent-light hover:bg-accent/25">Crear</button>
          </div>
        </section>
      )}

      {recurring.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted">{messages.empty.financeRecurring}</p>
      ) : (
        <ul className="space-y-2">
          {recurring.map((r) => {
            const acc = accountById.get(r.template.accountId)
            const cat = r.template.categoryId ? categoryById.get(r.template.categoryId) : null
            return (
              <li key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-white">
                    {cat?.name ?? (r.template.kind === 'income' ? 'Ingreso' : 'Gasto')} · {formatCents(r.template.amount, r.template.currency)}
                  </p>
                  <p className="text-xs text-muted">
                    {acc?.name} · {r.rrule} · próxima {r.nextRun}
                  </p>
                </div>
                <button type="button" onClick={() => void setRecurringActive(r.id, !r.active)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-white">
                  {r.active ? <><Pause size={12} /> Pausar</> : <><Play size={12} /> Activar</>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
