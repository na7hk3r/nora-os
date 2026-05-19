import { useMemo, useState } from 'react'
import { BadgeDollarSign, Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import { useFinanceStore } from '../store'
import { createCategory, deleteCategory, updateCategory } from '../operations'
import { useToast } from '@core/ui/components/ToastProvider'
import { messages } from '@core/ui/messages'
import type { Category } from '../types'

export function CategoriesPage() {
  const categories = useFinanceStore((s) => s.categories)
  const transactions = useFinanceStore((s) => s.transactions)
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [kind, setKind] = useState<'income' | 'expense'>('expense')
  const [color, setColor] = useState('#7c3aed')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const usageById = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.categoryId) map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
    }
    return map
  }, [transactions])

  const reset = () => {
    setName('')
    setKind('expense')
    setColor('#7c3aed')
    setEditingId(null)
  }

  const onCreate = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await createCategory({ name: name.trim(), kind, color })
      reset()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSave = async () => {
    if (!editingId || !name.trim()) return
    setBusy(true)
    try {
      await updateCategory(editingId, { name: name.trim(), kind, color })
      reset()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onDelete = async (id: string) => {
    try {
      await deleteCategory(id)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setName(category.name)
    setKind(category.kind)
    setColor(category.color ?? '#7c3aed')
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-border bg-surface-light/90 p-4 shadow-xl">
        <h1 className="text-sm font-semibold text-white">Categorías</h1>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void (editingId ? onSave() : onCreate())}
            placeholder="Nombre de categoria"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
          />
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1 text-xs">
            <button type="button" onClick={() => setKind('expense')}
              className={`rounded-md px-2 py-1 ${kind === 'expense' ? 'bg-rose-500/20 text-rose-100' : 'text-muted'}`}>Gasto</button>
            <button type="button" onClick={() => setKind('income')}
              className={`rounded-md px-2 py-1 ${kind === 'income' ? 'bg-emerald-500/20 text-emerald-100' : 'text-muted'}`}>Ingreso</button>
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 rounded-lg border border-border bg-surface p-1"
            aria-label="Color de categoria"
          />
          <button
            type="button"
            onClick={() => void (editingId ? onSave() : onCreate())}
            disabled={busy || !name.trim()}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-accent bg-accent/15 px-3 py-2 text-sm text-accent-light hover:bg-accent/25 disabled:opacity-40"
          >
            {editingId ? <Save size={14} /> : <Plus size={14} />}
            {editingId ? 'Guardar' : 'Crear'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-muted hover:text-white"
            >
              <X size={14} /> Cancelar
            </button>
          )}
        </div>
      </header>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-sm text-muted">{messages.empty.financeCategories}</p>
      ) : (
        <section className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {categories.map((c) => {
            const uses = usageById.get(c.id) ?? 0
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-light"
                    style={c.color ? { color: c.color } : undefined}
                  >
                    <BadgeDollarSign size={14} className={c.kind === 'income' ? 'text-emerald-300' : 'text-rose-300'} />
                  </span>
                  <span className="truncate text-white">{c.name}</span>
                  <span className="shrink-0 text-xs text-muted">- {c.kind === 'income' ? 'Ingreso' : 'Gasto'} - {uses} usos</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => startEdit(c)}
                    className="rounded p-1 text-muted hover:text-accent-light" aria-label="Editar">
                    <Edit2 size={14} />
                  </button>
                  <button type="button" onClick={() => void onDelete(c.id)}
                    className="rounded p-1 text-muted hover:text-rose-300" aria-label="Borrar">
                    <Trash2 size={14} />
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
