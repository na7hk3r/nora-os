export type AccountType = 'cash' | 'bank' | 'card' | 'wallet' | 'other'
export type TransactionKind = 'income' | 'expense' | 'transfer'
export type CategoryKind = 'income' | 'expense'
export type MovementSubtype = 'regular' | 'withdrawal'

export interface Account {
  id: string
  name: string
  type: AccountType
  /** Codigo ISO 4217. */
  currency: string
  /** Saldo inicial en centavos, expresado en la moneda de la cuenta. */
  initialBalance: number
  color: string | null
  archived: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
  /** id de la categoria padre (max 2 niveles). */
  parentId: string | null
  kind: CategoryKind
  color: string | null
  archived: boolean
}

export interface Transaction {
  id: string
  accountId: string
  categoryId: string | null
  kind: TransactionKind
  /** Monto en centavos en la moneda de la cuenta. Siempre positivo. */
  amount: number
  /** Moneda del monto que impacta el saldo de la cuenta. */
  currency: string
  /** Monto escrito originalmente por el usuario, en centavos. */
  originalAmount: number
  /** Moneda escrita originalmente por el usuario. */
  originalCurrency: string
  /** Monto convertido a la moneda base para reportes, si hay tasa disponible. */
  baseAmount: number | null
  /** Moneda base usada para `baseAmount`. */
  baseCurrency: string | null
  /** Tasa manual usada: 1 originalCurrency = exchangeRate baseCurrency. */
  exchangeRate: number | null
  /** Fecha en formato YYYY-MM-DD. */
  occurredAt: string
  note: string | null
  recurringId: string | null
  /** Si es transfer, id de la transaccion par (en la otra cuenta). */
  transferPairId: string | null
  /** Agrupa los dos lados de una transferencia. */
  transferGroupId: string | null
  /** Diferencia transfers comunes de retiros a efectivo. */
  movementSubtype: MovementSubtype
  createdAt: string
}

/**
 * Plantilla almacenada como JSON en `finance_recurring.template_json`.
 * No incluye id ni occurredAt: se generan al materializar.
 */
export interface RecurringTemplate {
  accountId: string
  categoryId: string | null
  kind: TransactionKind
  amount: number
  currency: string
  note: string | null
}

export interface Recurring {
  id: string
  template: RecurringTemplate
  /** Subset de RFC5545. Soportado: FREQ=DAILY|WEEKLY|MONTHLY[;INTERVAL=N][;BYMONTHDAY=N][;BYDAY=MO..SU]. */
  rrule: string
  /** Proxima fecha de ejecucion (YYYY-MM-DD). */
  nextRun: string
  active: boolean
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  period: 'monthly'
  /** Limite en centavos. */
  limitAmount: number
  currency: string
  createdAt: string
}
