import { describe, expect, it } from 'vitest'
import {
  computeAccountBalance,
  convertCurrencyAmount,
  formatTransactionAmount,
  getTransactionBaseAmount,
} from './utils'
import type { Account, Transaction } from './types'

const accountUyu: Account = {
  id: 'acc_uyu',
  name: 'Cuenta UYU',
  type: 'bank',
  currency: 'UYU',
  initialBalance: 100_00,
  color: null,
  archived: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 'tx_1',
    accountId: 'acc_uyu',
    categoryId: null,
    kind: 'expense',
    amount: 0,
    currency: 'UYU',
    originalAmount: 0,
    originalCurrency: 'UYU',
    baseAmount: null,
    baseCurrency: null,
    exchangeRate: null,
    occurredAt: '2026-05-01',
    note: null,
    recurringId: null,
    transferPairId: null,
    transferGroupId: null,
    movementSubtype: 'regular',
    createdAt: '2026-05-01T00:00:00.000Z',
    ...partial,
  }
}

describe('finance multi-currency utils', () => {
  it('converts between currencies through a manual base rate', () => {
    expect(convertCurrencyAmount(10_00, 'USD', 'UYU', { USD: 40 }, 'UYU')).toBe(400_00)
    expect(convertCurrencyAmount(400_00, 'UYU', 'USD', { USD: 40 }, 'UYU')).toBe(10_00)
    expect(convertCurrencyAmount(10_00, 'USD', 'EUR', { USD: 40, EUR: 50 }, 'UYU')).toBe(8_00)
  })

  it('keeps original amount separate from account balance amount', () => {
    const movement = tx({
      amount: 400_00,
      currency: 'UYU',
      originalAmount: 10_00,
      originalCurrency: 'USD',
      baseAmount: 400_00,
      baseCurrency: 'UYU',
      exchangeRate: 40,
    })

    expect(computeAccountBalance(accountUyu, [movement])).toBe(-300_00)
    expect(formatTransactionAmount(movement)).toContain('USD')
    expect(getTransactionBaseAmount(movement, 'UYU')).toBe(400_00)
  })

  it('handles transfer balances with different source and destination amounts', () => {
    const source = tx({
      id: 'tx_out',
      accountId: 'acc_uyu',
      kind: 'transfer',
      amount: 1_000_00,
      currency: 'UYU',
      originalAmount: 1_000_00,
      originalCurrency: 'UYU',
      transferPairId: 'tx_in',
      transferGroupId: 'trf_1',
      createdAt: '2026-05-01T00:00:00.000Z',
    })
    const destination = tx({
      id: 'tx_in',
      accountId: 'acc_usd',
      kind: 'transfer',
      amount: 25_00,
      currency: 'USD',
      originalAmount: 25_00,
      originalCurrency: 'USD',
      transferPairId: 'tx_out',
      transferGroupId: 'trf_1',
      createdAt: '2026-05-01T00:00:00.001Z',
    })

    expect(computeAccountBalance(accountUyu, [source, destination])).toBe(-900_00)
  })
})
