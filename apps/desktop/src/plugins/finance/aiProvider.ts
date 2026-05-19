/**
 * Provider de contexto IA para el plugin Finance.
 *
 * Aporta un slice ligero al snapshot de Ollama: balance del mes, top
 * categorías, recurrentes que vencen pronto, anomalías recientes.
 */

import { storageAPI } from '@core/storage/StorageAPI'
import type { AIContextProvider } from '@core/services/aiContextRegistry'
import { startOfMonth, formatLocalDate } from './utils'
import { useFinanceStore } from './store'

interface FinanceSlice {
  monthIncomeCents: number
  monthExpenseCents: number
  topCategoriesMonth: Array<{ name: string; amountCents: number }>
  recurringDueSoon: number
  currency: string
}

interface CategoryRow { id: string; name: string }
interface AggRow { categoryId: string | null; total: number }

async function tableExists(table: string): Promise<boolean> {
  const rows = await storageAPI.query<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [table],
  )
  return rows.length > 0
}

export const financeAIProvider: AIContextProvider<FinanceSlice> = {
  id: 'finance',
  async collect() {
    if (!(await tableExists('finance_transactions'))) return undefined
    const monthStart = formatLocalDate(startOfMonth())
    const currency = useFinanceStore.getState().settings.defaultCurrency
    const incomeRow = await storageAPI.query<{ total: number }>(
      `SELECT COALESCE(SUM(COALESCE(base_amount, amount)), 0) as total FROM finance_transactions
        WHERE kind = 'income' AND occurred_at >= ? AND COALESCE(base_currency, currency) = ?`,
      [monthStart, currency],
    )
    const expenseRow = await storageAPI.query<{ total: number }>(
      `SELECT COALESCE(SUM(COALESCE(base_amount, amount)), 0) as total FROM finance_transactions
        WHERE kind = 'expense' AND occurred_at >= ? AND COALESCE(base_currency, currency) = ?`,
      [monthStart, currency],
    )
    const topRows = await storageAPI.query<AggRow>(
      `SELECT category_id as categoryId, SUM(COALESCE(base_amount, amount)) as total
         FROM finance_transactions
        WHERE kind = 'expense' AND occurred_at >= ? AND COALESCE(base_currency, currency) = ?
        GROUP BY category_id
        ORDER BY total DESC
        LIMIT 3`,
      [monthStart, currency],
    )
    const cats = await storageAPI.query<CategoryRow>(
      `SELECT id, name FROM finance_categories WHERE id IN (${topRows.map(() => '?').join(',') || 'NULL'})`,
      topRows.map((r) => r.categoryId).filter((x): x is string => Boolean(x)),
    )
    const catName = new Map(cats.map((c) => [c.id, c.name]))
    const today = formatLocalDate(new Date())
    const inSevenDays = formatLocalDate(new Date(Date.now() + 7 * 86_400_000))
    const dueRows = await storageAPI.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM finance_recurring WHERE active = 1 AND next_run BETWEEN ? AND ?`,
      [today, inSevenDays],
    )
    return {
      monthIncomeCents: incomeRow[0]?.total ?? 0,
      monthExpenseCents: expenseRow[0]?.total ?? 0,
      topCategoriesMonth: topRows.map((r) => ({
        name: r.categoryId ? catName.get(r.categoryId) ?? 'Sin categoría' : 'Sin categoría',
        amountCents: r.total,
      })),
      recurringDueSoon: dueRows[0]?.count ?? 0,
      currency,
    }
  },
  render(slice) {
    const lines: string[] = []
    const fmt = (cents: number) => `${slice.currency} ${(cents / 100).toFixed(0)}`
    lines.push(`Finanzas mes: ingresos=${fmt(slice.monthIncomeCents)} gastos=${fmt(slice.monthExpenseCents)}`)
    if (slice.topCategoriesMonth.length) {
      const top = slice.topCategoriesMonth
        .map((c) => `${c.name}=${fmt(c.amountCents)}`)
        .join(' ')
      lines.push(`Top categorías: ${top}`)
    }
    if (slice.recurringDueSoon > 0) {
      lines.push(`Recurrentes en 7d: ${slice.recurringDueSoon}`)
    }
    return lines
  },
}
