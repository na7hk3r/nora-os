/**
 * Insights de Finance.
 *
 * Combina heurísticas determinísticas (no-IA) con prompts opcionales a Ollama.
 *  - `detectAnomaly`: dispara cuando un gasto recién creado supera el p90 de su
 *    categoría (mín. 5 muestras). Pura SQL/JS, sin IA.
 *  - `generateMonthlySummary`: usa Ollama para narrar 1 párrafo. Si Ollama está
 *    apagado, devuelve un fallback determinístico.
 *  - `suggestBudgets`: usa la mediana de los últimos 3 meses por categoría.
 */

import { ollamaService } from '@core/services/ollamaService'
import { storageAPI } from '@core/storage/StorageAPI'
import { getCurrentLocale } from '@core/i18n'
import { useFinanceStore } from './store'
import { categoryP90, monthlySpendMedian, formatCents, startOfMonth, endOfMonth, previousMonth, formatLocalDate } from './utils'
import type { Category } from './types'

export interface AnomalyResult {
  txId: string
  categoryName: string
  amountCents: number
  p90Cents: number
  ratio: number
}

/**
 * Devuelve anomaly si la transacción supera el p90 de su categoría por al
 * menos 1.5x. Devuelve null si no aplica (sin categoría, sin muestras, etc.).
 */
export function detectAnomaly(txId: string): AnomalyResult | null {
  const { transactions, categories, settings } = useFinanceStore.getState()
  if (!settings.anomalyAlertsEnabled) return null
  const tx = transactions.find((t) => t.id === txId)
  if (!tx || tx.kind !== 'expense' || !tx.categoryId) return null
  const p90 = categoryP90(transactions, tx.categoryId)
  if (p90 == null) return null
  const ratio = tx.amount / p90
  if (ratio < 1.5) return null
  const cat = categories.find((c) => c.id === tx.categoryId)
  return {
    txId,
    categoryName: cat?.name ?? 'Sin categoría',
    amountCents: tx.amount,
    p90Cents: p90,
    ratio,
  }
}

interface MonthSummary {
  monthLabel: string
  incomeCents: number
  expenseCents: number
  netCents: number
  topCategories: Array<{ name: string; amountCents: number }>
  topDeltaCategories: Array<{ name: string; deltaPct: number }>
  currency: string
  narrative: string | null
}

function describeMonth(date: Date): string {
  return new Intl.DateTimeFormat(getCurrentLocale(), { month: 'long', year: 'numeric' }).format(date)
}

async function fetchSummaryRaw(start: Date, end: Date): Promise<{
  income: number
  expense: number
  byCategory: Map<string, number>
}> {
  const startISO = formatLocalDate(start)
  const endISO = formatLocalDate(end)
  const currency = useFinanceStore.getState().settings.defaultCurrency
  const inc = await storageAPI.query<{ total: number }>(
    `SELECT COALESCE(SUM(COALESCE(base_amount, amount)), 0) as total FROM finance_transactions
      WHERE kind = 'income' AND occurred_at BETWEEN ? AND ? AND COALESCE(base_currency, currency) = ?`,
    [startISO, endISO, currency],
  )
  const exp = await storageAPI.query<{ total: number }>(
    `SELECT COALESCE(SUM(COALESCE(base_amount, amount)), 0) as total FROM finance_transactions
      WHERE kind = 'expense' AND occurred_at BETWEEN ? AND ? AND COALESCE(base_currency, currency) = ?`,
    [startISO, endISO, currency],
  )
  const cats = await storageAPI.query<{ categoryId: string | null; total: number }>(
    `SELECT category_id as categoryId, SUM(COALESCE(base_amount, amount)) as total
       FROM finance_transactions
      WHERE kind = 'expense' AND occurred_at BETWEEN ? AND ? AND COALESCE(base_currency, currency) = ?
      GROUP BY category_id`,
    [startISO, endISO, currency],
  )
  const byCategory = new Map<string, number>()
  for (const c of cats) {
    if (c.categoryId) byCategory.set(c.categoryId, c.total)
  }
  return { income: inc[0]?.total ?? 0, expense: exp[0]?.total ?? 0, byCategory }
}

export async function generateMonthlySummary(opts?: { withAI?: boolean; previous?: boolean }): Promise<MonthSummary> {
  const { categories, settings } = useFinanceStore.getState()
  const range = opts?.previous
    ? previousMonth()
    : { start: startOfMonth(), end: endOfMonth() }
  const current = await fetchSummaryRaw(range.start, range.end)
  // Para deltas: comparar con el mes anterior al rango actual
  const prevRange = previousMonth(range.start)
  const previous = await fetchSummaryRaw(prevRange.start, prevRange.end)

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Sin categoría'
  const top = Array.from(current.byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, total]) => ({ name: catName(id), amountCents: total }))

  const deltas: Array<{ name: string; deltaPct: number }> = []
  for (const [id, total] of current.byCategory.entries()) {
    const prev = previous.byCategory.get(id) ?? 0
    if (prev === 0) continue
    const pct = ((total - prev) / prev) * 100
    if (Math.abs(pct) >= 25) deltas.push({ name: catName(id), deltaPct: Math.round(pct) })
  }
  deltas.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))

  const summary: MonthSummary = {
    monthLabel: describeMonth(range.start),
    incomeCents: current.income,
    expenseCents: current.expense,
    netCents: current.income - current.expense,
    topCategories: top,
    topDeltaCategories: deltas.slice(0, 3),
    currency: settings.defaultCurrency,
    narrative: null,
  }

  const aiAllowed = Boolean(opts?.withAI && useFinanceStore.getState().settings.aiContextEnabled)
  if (aiAllowed) {
    summary.narrative = await tryAINarrative(summary).catch(() => fallbackNarrative(summary))
  } else {
    summary.narrative = fallbackNarrative(summary)
  }
  return summary
}

function fallbackNarrative(s: MonthSummary): string {
  const net = s.netCents
  const fmt = (c: number) => formatCents(c, s.currency)
  const lines: string[] = []
  lines.push(`En ${s.monthLabel} ingresaste ${fmt(s.incomeCents)} y gastaste ${fmt(s.expenseCents)}.`)
  lines.push(net >= 0 ? `Saldo positivo del mes: ${fmt(net)}.` : `Saldo negativo del mes: ${fmt(Math.abs(net))}.`)
  if (s.topCategories.length) {
    lines.push(`Top categorías: ${s.topCategories.map((c) => `${c.name} ${fmt(c.amountCents)}`).join(', ')}.`)
  }
  if (s.topDeltaCategories.length) {
    const moves = s.topDeltaCategories
      .map((d) => `${d.name} ${d.deltaPct > 0 ? '+' : ''}${d.deltaPct}%`)
      .join(', ')
    lines.push(`Cambios marcados vs mes anterior: ${moves}.`)
  }
  return lines.join(' ')
}

async function tryAINarrative(s: MonthSummary): Promise<string> {
  const ready = await ollamaService.isReady()
  if (!ready.enabled || !ready.healthy) return fallbackNarrative(s)
  const fmt = (c: number) => formatCents(c, s.currency)
  const facts = [
    `Mes: ${s.monthLabel}`,
    `Ingresos: ${fmt(s.incomeCents)}`,
    `Gastos: ${fmt(s.expenseCents)}`,
    `Saldo neto: ${fmt(s.netCents)}`,
    `Top categorías: ${s.topCategories.map((c) => `${c.name}=${fmt(c.amountCents)}`).join(', ') || 'sin datos'}`,
    `Cambios vs mes anterior: ${s.topDeltaCategories.map((d) => `${d.name}=${d.deltaPct}%`).join(', ') || 'sin cambios marcados'}`,
  ].join('\n')
  const prompt = [
    'Datos reales del mes del usuario:',
    facts,
    '',
    'TAREA: Escribí 1 párrafo de máximo 4 oraciones resumiendo el mes financiero del usuario.',
    'Citá al menos un dato concreto (monto o porcentaje). Sin emojis, sin markdown, sin scoring moral.',
    'Nada de "buen ahorrador" / "gastás mucho". Tono colega rioplatense, directo.',
  ].join('\n')
  return (await ollamaService.generate(prompt)).trim()
}

export interface BudgetSuggestion {
  category: Category
  suggestedCents: number
  basedOnMonths: number
}

/**
 * Sugiere un presupuesto mensual por categoría, usando mediana 3 meses.
 * Resistente a outliers. Solo categorías con al menos 1 mes de datos.
 */
export function suggestBudgets(): BudgetSuggestion[] {
  const { categories, transactions } = useFinanceStore.getState()
  const out: BudgetSuggestion[] = []
  for (const cat of categories) {
    if (cat.archived || cat.kind !== 'expense') continue
    const median = monthlySpendMedian(transactions, cat.id, 3)
    if (median == null || median === 0) continue
    out.push({ category: cat, suggestedCents: Math.round(median), basedOnMonths: 3 })
  }
  return out.sort((a, b) => b.suggestedCents - a.suggestedCents)
}
