/**
 * Operaciones CRUD de Finance. Cada operacion:
 *  - Persiste a SQLite via window.storage.execute.
 *  - Actualiza el store Zustand.
 *  - Emite el evento correspondiente via eventBus (con persist=true).
 */

import { eventBus } from '@core/events/EventBus'
import { useFinanceStore } from './store'
import { FINANCE_EVENTS } from './events'
import {
  convertCurrencyAmount,
  genId,
  getManualRate,
  materializeRecurring,
  normalizeCurrencyCode,
  todayISO,
} from './utils'
import type {
  Account,
  Category,
  Transaction,
  Recurring,
  RecurringTemplate,
  Budget,
  TransactionKind,
  AccountType,
  CategoryKind,
  MovementSubtype,
} from './types'

function exec(sql: string, params: unknown[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
  if (!window.storage) return Promise.resolve({ changes: 0, lastInsertRowid: 0 })
  return window.storage.execute(sql, params)
}

interface MoneySnapshot {
  amount: number
  currency: string
  originalAmount: number
  originalCurrency: string
  baseAmount: number | null
  baseCurrency: string
  exchangeRate: number | null
}

function buildMoneySnapshot(input: {
  amount: number
  currency: string
  accountCurrency: string
}): MoneySnapshot {
  const settings = useFinanceStore.getState().settings
  const baseCurrency = normalizeCurrencyCode(settings.defaultCurrency)
  const originalCurrency = normalizeCurrencyCode(input.currency, input.accountCurrency)
  const accountCurrency = normalizeCurrencyCode(input.accountCurrency)

  const accountAmount = convertCurrencyAmount(
    input.amount,
    originalCurrency,
    accountCurrency,
    settings.exchangeRates,
    baseCurrency,
  )

  if (accountAmount == null) {
    throw new Error(`Configura una tasa manual para convertir ${originalCurrency} a ${accountCurrency}.`)
  }

  return {
    amount: accountAmount,
    currency: accountCurrency,
    originalAmount: input.amount,
    originalCurrency,
    baseAmount: convertCurrencyAmount(
      input.amount,
      originalCurrency,
      baseCurrency,
      settings.exchangeRates,
      baseCurrency,
    ),
    baseCurrency,
    exchangeRate: getManualRate(originalCurrency, baseCurrency, settings.exchangeRates),
  }
}

function buildAccountCurrencySnapshot(amount: number, currency: string): MoneySnapshot {
  const settings = useFinanceStore.getState().settings
  const baseCurrency = normalizeCurrencyCode(settings.defaultCurrency)
  const normalizedCurrency = normalizeCurrencyCode(currency, baseCurrency)
  return {
    amount,
    currency: normalizedCurrency,
    originalAmount: amount,
    originalCurrency: normalizedCurrency,
    baseAmount: convertCurrencyAmount(
      amount,
      normalizedCurrency,
      baseCurrency,
      settings.exchangeRates,
      baseCurrency,
    ),
    baseCurrency,
    exchangeRate: getManualRate(normalizedCurrency, baseCurrency, settings.exchangeRates),
  }
}

async function insertTransactionRow(tx: Transaction): Promise<void> {
  await exec(
    `INSERT INTO finance_transactions
       (id, account_id, category_id, kind, amount, currency, original_amount, original_currency,
        base_amount, base_currency, exchange_rate, occurred_at, note, recurring_id, transfer_pair_id,
        transfer_group_id, movement_subtype, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id,
      tx.accountId,
      tx.categoryId,
      tx.kind,
      tx.amount,
      tx.currency,
      tx.originalAmount,
      tx.originalCurrency,
      tx.baseAmount,
      tx.baseCurrency,
      tx.exchangeRate,
      tx.occurredAt,
      tx.note,
      tx.recurringId,
      tx.transferPairId,
      tx.transferGroupId,
      tx.movementSubtype,
      tx.createdAt,
    ],
  )
}

// Accounts ------------------------------------------------------------------

export interface CreateAccountInput {
  name: string
  type: AccountType
  currency?: string
  initialBalance?: number
  color?: string | null
}

export async function createAccount(input: CreateAccountInput): Promise<Account> {
  const account: Account = {
    id: genId('acc'),
    name: input.name.trim(),
    type: input.type,
    currency: normalizeCurrencyCode(input.currency, useFinanceStore.getState().settings.defaultCurrency),
    initialBalance: input.initialBalance ?? 0,
    color: input.color ?? null,
    archived: false,
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_accounts (id, name, type, currency, initial_balance, color, archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [account.id, account.name, account.type, account.currency, account.initialBalance, account.color, account.createdAt],
  )
  useFinanceStore.getState().upsertAccount(account)
  eventBus.emit(FINANCE_EVENTS.ACCOUNT_CREATED, { id: account.id, name: account.name }, { source: 'finance', persist: true })
  return account
}

export async function updateAccount(
  id: string,
  patch: Partial<Pick<Account, 'name' | 'type' | 'currency' | 'initialBalance' | 'color'>>,
): Promise<void> {
  const existing = useFinanceStore.getState().accounts.find((a) => a.id === id)
  if (!existing) return
  const next: Account = {
    ...existing,
    ...patch,
    currency: patch.currency ? normalizeCurrencyCode(patch.currency, existing.currency) : existing.currency,
    color: patch.color === undefined ? existing.color : patch.color,
  }
  await exec(
    `UPDATE finance_accounts SET name = ?, type = ?, currency = ?, initial_balance = ?, color = ? WHERE id = ?`,
    [next.name, next.type, next.currency, next.initialBalance, next.color, id],
  )
  useFinanceStore.getState().upsertAccount(next)
  eventBus.emit(FINANCE_EVENTS.ACCOUNT_UPDATED, { id }, { source: 'finance', persist: true })
}

export async function archiveAccount(id: string): Promise<void> {
  await exec(`UPDATE finance_accounts SET archived = 1 WHERE id = ?`, [id])
  const existing = useFinanceStore.getState().accounts.find((a) => a.id === id)
  if (existing) useFinanceStore.getState().upsertAccount({ ...existing, archived: true })
  eventBus.emit(FINANCE_EVENTS.ACCOUNT_ARCHIVED, { id }, { source: 'finance', persist: true })
}

// Categories ----------------------------------------------------------------

export interface CreateCategoryInput {
  name: string
  kind: CategoryKind
  parentId?: string | null
  color?: string | null
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const cat: Category = {
    id: genId('cat'),
    name: input.name.trim(),
    parentId: input.parentId ?? null,
    kind: input.kind,
    color: input.color ?? null,
    archived: false,
  }
  await exec(
    `INSERT INTO finance_categories (id, name, parent_id, kind, color, archived) VALUES (?, ?, ?, ?, ?, 0)`,
    [cat.id, cat.name, cat.parentId, cat.kind, cat.color],
  )
  useFinanceStore.getState().upsertCategory(cat)
  eventBus.emit(FINANCE_EVENTS.CATEGORY_CREATED, { id: cat.id, name: cat.name }, { source: 'finance', persist: true })
  return cat
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'parentId' | 'color' | 'kind'>>): Promise<void> {
  const existing = useFinanceStore.getState().categories.find((c) => c.id === id)
  if (!existing) return
  const next: Category = { ...existing, ...patch }
  await exec(
    `UPDATE finance_categories SET name = ?, parent_id = ?, kind = ?, color = ? WHERE id = ?`,
    [next.name, next.parentId, next.kind, next.color, id],
  )
  useFinanceStore.getState().upsertCategory(next)
  eventBus.emit(FINANCE_EVENTS.CATEGORY_UPDATED, { id }, { source: 'finance', persist: true })
}

export async function deleteCategory(id: string): Promise<void> {
  await exec(`DELETE FROM finance_categories WHERE id = ?`, [id])
  useFinanceStore.getState().removeCategory(id)
  eventBus.emit(FINANCE_EVENTS.CATEGORY_DELETED, { id }, { source: 'finance', persist: true })
}

// Transactions --------------------------------------------------------------

export interface CreateTransactionInput {
  accountId: string
  categoryId: string | null
  kind: TransactionKind
  amount: number
  currency?: string
  occurredAt?: string
  note?: string | null
  recurringId?: string | null
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  if (input.amount <= 0) throw new Error('Monto invalido. Debe ser mayor a 0.')
  const account = useFinanceStore.getState().accounts.find((a) => a.id === input.accountId)
  if (!account) throw new Error('Cuenta invalida.')

  const money = buildMoneySnapshot({
    amount: input.amount,
    currency: input.currency ?? account.currency,
    accountCurrency: account.currency,
  })

  const tx: Transaction = {
    id: genId('tx'),
    accountId: input.accountId,
    categoryId: input.categoryId,
    kind: input.kind,
    ...money,
    occurredAt: input.occurredAt ?? todayISO(),
    note: input.note ?? null,
    recurringId: input.recurringId ?? null,
    transferPairId: null,
    transferGroupId: null,
    movementSubtype: 'regular',
    createdAt: new Date().toISOString(),
  }
  await insertTransactionRow(tx)
  useFinanceStore.getState().upsertTransaction(tx)
  eventBus.emit(
    FINANCE_EVENTS.TRANSACTION_CREATED,
    { id: tx.id, amount: tx.amount, kind: tx.kind, categoryId: tx.categoryId, accountId: tx.accountId },
    { source: 'finance', persist: true },
  )
  return tx
}

export async function deleteTransaction(id: string): Promise<void> {
  const tx = useFinanceStore.getState().transactions.find((t) => t.id === id)
  if (!tx) return
  if (tx.transferPairId) {
    await exec(`DELETE FROM finance_transactions WHERE id = ?`, [tx.transferPairId])
    useFinanceStore.getState().removeTransaction(tx.transferPairId)
  }
  await exec(`DELETE FROM finance_transactions WHERE id = ?`, [id])
  useFinanceStore.getState().removeTransaction(id)
  eventBus.emit(FINANCE_EVENTS.TRANSACTION_DELETED, { id }, { source: 'finance', persist: true })
}

export interface UpdateTransactionInput {
  accountId?: string
  categoryId?: string | null
  kind?: Exclude<TransactionKind, 'transfer'>
  amount?: number
  currency?: string
  occurredAt?: string
  note?: string | null
}

export async function updateTransaction(id: string, patch: UpdateTransactionInput): Promise<void> {
  const existing = useFinanceStore.getState().transactions.find((t) => t.id === id)
  if (!existing) return

  const moneyChanging = patch.accountId !== undefined || patch.amount !== undefined || patch.currency !== undefined
  if (existing.kind === 'transfer' && moneyChanging) {
    throw new Error('Para cambiar montos de una transferencia, borrala y cargala de nuevo.')
  }

  const accountId = patch.accountId ?? existing.accountId
  const account = useFinanceStore.getState().accounts.find((a) => a.id === accountId)
  if (!account) throw new Error('Cuenta invalida.')

  const money = moneyChanging
    ? buildMoneySnapshot({
        amount: patch.amount ?? existing.originalAmount ?? existing.amount,
        currency: patch.currency ?? existing.originalCurrency ?? existing.currency,
        accountCurrency: account.currency,
      })
    : {
        amount: existing.amount,
        currency: existing.currency,
        originalAmount: existing.originalAmount,
        originalCurrency: existing.originalCurrency,
        baseAmount: existing.baseAmount,
        baseCurrency: existing.baseCurrency ?? useFinanceStore.getState().settings.defaultCurrency,
        exchangeRate: existing.exchangeRate,
      }

  const next: Transaction = {
    ...existing,
    accountId,
    categoryId: patch.categoryId === undefined ? existing.categoryId : patch.categoryId,
    kind: patch.kind ?? (existing.kind === 'transfer' ? 'transfer' : existing.kind),
    ...money,
    occurredAt: patch.occurredAt ?? existing.occurredAt,
    note: patch.note === undefined ? existing.note : patch.note,
  }

  await exec(
    `UPDATE finance_transactions
        SET account_id = ?, category_id = ?, kind = ?, amount = ?, currency = ?,
            original_amount = ?, original_currency = ?, base_amount = ?, base_currency = ?,
            exchange_rate = ?, note = ?, occurred_at = ?
      WHERE id = ?`,
    [
      next.accountId,
      next.categoryId,
      next.kind,
      next.amount,
      next.currency,
      next.originalAmount,
      next.originalCurrency,
      next.baseAmount,
      next.baseCurrency,
      next.exchangeRate,
      next.note,
      next.occurredAt,
      id,
    ],
  )
  useFinanceStore.getState().upsertTransaction(next)
  eventBus.emit(FINANCE_EVENTS.TRANSACTION_UPDATED, { id }, { source: 'finance', persist: true })
}

export interface CreateTransferInput {
  fromAccountId: string
  toAccountId: string
  /** Legacy alias kept for callers/tests; interpreted as fromAmount. */
  amount?: number
  fromAmount?: number
  toAmount?: number
  occurredAt?: string
  note?: string | null
  movementSubtype?: MovementSubtype
}

export async function createTransfer(input: CreateTransferInput): Promise<{ outgoing: Transaction; incoming: Transaction }> {
  if (!useFinanceStore.getState().settings.transfersEnabled) throw new Error('Transferencias deshabilitadas.')
  if (input.fromAccountId === input.toAccountId) throw new Error('Cuentas distintas requeridas.')

  const fromAmount = input.fromAmount ?? input.amount ?? 0
  if (fromAmount <= 0) throw new Error('Monto invalido.')

  const from = useFinanceStore.getState().accounts.find((a) => a.id === input.fromAccountId)
  const to = useFinanceStore.getState().accounts.find((a) => a.id === input.toAccountId)
  if (!from || !to) throw new Error('Cuentas invalidas.')

  const settings = useFinanceStore.getState().settings
  const toAmount = input.toAmount ?? (
    from.currency === to.currency
      ? fromAmount
      : convertCurrencyAmount(fromAmount, from.currency, to.currency, settings.exchangeRates, settings.defaultCurrency)
  )
  if (toAmount == null || toAmount <= 0) {
    throw new Error(`Ingresa el monto destino para ${to.currency}.`)
  }

  const occurredAt = input.occurredAt ?? todayISO()
  const createdAt = new Date().toISOString()
  const outId = genId('tx')
  const inId = genId('tx')
  const transferGroupId = genId('trf')
  const movementSubtype = input.movementSubtype ?? 'regular'
  const outgoingMoney = buildAccountCurrencySnapshot(fromAmount, from.currency)
  const incomingMoney = buildAccountCurrencySnapshot(toAmount, to.currency)

  const outgoing: Transaction = {
    id: outId,
    accountId: from.id,
    categoryId: null,
    kind: 'transfer',
    ...outgoingMoney,
    occurredAt,
    note: input.note ?? null,
    recurringId: null,
    transferPairId: inId,
    transferGroupId,
    movementSubtype,
    createdAt,
  }
  const incoming: Transaction = {
    id: inId,
    accountId: to.id,
    categoryId: null,
    kind: 'transfer',
    ...incomingMoney,
    occurredAt,
    note: input.note ?? null,
    recurringId: null,
    transferPairId: outId,
    transferGroupId,
    movementSubtype,
    createdAt: new Date(Date.parse(createdAt) + 1).toISOString(),
  }

  await insertTransactionRow(outgoing)
  await insertTransactionRow(incoming)
  useFinanceStore.getState().upsertTransactions([outgoing, incoming])
  eventBus.emit(
    movementSubtype === 'withdrawal' ? FINANCE_EVENTS.WITHDRAWAL_CREATED : FINANCE_EVENTS.TRANSFER_CREATED,
    { from: from.id, to: to.id, amount: fromAmount, toAmount },
    { source: 'finance', persist: true },
  )
  return { outgoing, incoming }
}

export async function createWithdrawal(input: {
  fromAccountId: string
  cashAccountId: string
  amount: number
  toAmount?: number
  occurredAt?: string
  note?: string | null
}): Promise<{ outgoing: Transaction; incoming: Transaction }> {
  const cash = useFinanceStore.getState().accounts.find((a) => a.id === input.cashAccountId)
  if (!cash || cash.type !== 'cash') throw new Error('Elegi una cuenta de efectivo para el retiro.')
  return createTransfer({
    fromAccountId: input.fromAccountId,
    toAccountId: input.cashAccountId,
    amount: input.amount,
    toAmount: input.toAmount,
    occurredAt: input.occurredAt,
    note: input.note,
    movementSubtype: 'withdrawal',
  })
}

// Recurring -----------------------------------------------------------------

export async function createRecurring(input: {
  template: RecurringTemplate
  rrule: string
  nextRun: string
}): Promise<Recurring> {
  const rec: Recurring = {
    id: genId('rec'),
    template: input.template,
    rrule: input.rrule,
    nextRun: input.nextRun,
    active: true,
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_recurring (id, template_json, rrule, next_run, active, created_at)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [rec.id, JSON.stringify(rec.template), rec.rrule, rec.nextRun, rec.createdAt],
  )
  useFinanceStore.getState().upsertRecurring(rec)
  eventBus.emit(FINANCE_EVENTS.RECURRING_CREATED, { id: rec.id }, { source: 'finance', persist: true })
  return rec
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  await exec(`UPDATE finance_recurring SET active = ? WHERE id = ?`, [active ? 1 : 0, id])
  const existing = useFinanceStore.getState().recurring.find((r) => r.id === id)
  if (existing) useFinanceStore.getState().upsertRecurring({ ...existing, active })
  eventBus.emit(FINANCE_EVENTS.RECURRING_UPDATED, { id, active }, { source: 'finance', persist: true })
}

export async function runRecurringEngine(): Promise<number> {
  if (!useFinanceStore.getState().settings.recurringEnabled) return 0
  const today = todayISO()
  const recs = useFinanceStore.getState().recurring.filter((r) => r.active)
  let created = 0
  for (const rec of recs) {
    const { toCreate, nextRun } = materializeRecurring(rec, today)
    if (toCreate.length === 0) continue
    for (const occ of toCreate) {
      try {
        await createTransaction({
          accountId: occ.template.accountId,
          categoryId: occ.template.categoryId,
          kind: occ.template.kind,
          amount: occ.template.amount,
          currency: occ.template.currency,
          occurredAt: occ.occurredAt,
          note: occ.template.note,
          recurringId: rec.id,
        })
        created += 1
      } catch (err) {
        console.warn(`[finance] no pude materializar recurrencia ${rec.id}:`, err)
      }
    }
    await exec(`UPDATE finance_recurring SET next_run = ? WHERE id = ?`, [nextRun, rec.id])
    useFinanceStore.getState().upsertRecurring({ ...rec, nextRun })
  }
  if (created > 0) {
    eventBus.emit(FINANCE_EVENTS.RECURRING_MATERIALIZED, { count: created }, { source: 'finance', persist: true })
  }
  return created
}

// Budgets -------------------------------------------------------------------

export async function upsertBudget(input: { categoryId: string; limitAmount: number; currency: string }): Promise<Budget> {
  const currency = normalizeCurrencyCode(input.currency, useFinanceStore.getState().settings.defaultCurrency)
  const existing = useFinanceStore
    .getState()
    .budgets.find((b) => b.categoryId === input.categoryId && b.currency === currency)
  if (existing) {
    await exec(
      `UPDATE finance_budgets SET limit_amount = ? WHERE id = ?`,
      [input.limitAmount, existing.id],
    )
    const next: Budget = { ...existing, limitAmount: input.limitAmount }
    useFinanceStore.getState().upsertBudget(next)
    eventBus.emit(FINANCE_EVENTS.BUDGET_UPDATED, { id: next.id }, { source: 'finance', persist: true })
    return next
  }
  const budget: Budget = {
    id: genId('bud'),
    categoryId: input.categoryId,
    period: 'monthly',
    limitAmount: input.limitAmount,
    currency,
    createdAt: new Date().toISOString(),
  }
  await exec(
    `INSERT INTO finance_budgets (id, category_id, period, limit_amount, currency, created_at)
     VALUES (?, ?, 'monthly', ?, ?, ?)`,
    [budget.id, budget.categoryId, budget.limitAmount, budget.currency, budget.createdAt],
  )
  useFinanceStore.getState().upsertBudget(budget)
  eventBus.emit(FINANCE_EVENTS.BUDGET_CREATED, { id: budget.id }, { source: 'finance', persist: true })
  return budget
}

export async function deleteBudget(id: string): Promise<void> {
  await exec(`DELETE FROM finance_budgets WHERE id = ?`, [id])
  useFinanceStore.getState().removeBudget(id)
  eventBus.emit(FINANCE_EVENTS.BUDGET_DELETED, { id }, { source: 'finance', persist: true })
}
