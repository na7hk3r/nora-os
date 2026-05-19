import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@core/ui/components/ToastProvider'
import { DEFAULT_FINANCE_SETTINGS } from '../settings'
import { useFinanceStore } from '../store'
import type { CreateTransactionInput } from '../operations'

vi.mock('../operations', () => ({
  createTransaction: vi.fn(async (input: CreateTransactionInput) => ({
    id: 'tx_1',
    accountId: input.accountId,
    categoryId: input.categoryId,
    kind: input.kind,
    amount: input.amount,
    currency: 'UYU',
    originalAmount: input.amount,
    originalCurrency: input.currency ?? 'UYU',
    baseAmount: input.amount,
    baseCurrency: 'UYU',
    exchangeRate: 1,
    occurredAt: input.occurredAt,
    note: input.note,
    recurringId: null,
    transferPairId: null,
    transferGroupId: null,
    movementSubtype: 'regular',
    createdAt: new Date().toISOString(),
  })),
  createTransfer: vi.fn(async () => ({
    outgoing: { id: 'tx_out' },
    incoming: { id: 'tx_in' },
  })),
  createWithdrawal: vi.fn(async () => ({
    outgoing: { id: 'tx_out' },
    incoming: { id: 'tx_in' },
  })),
}))

import { createTransfer } from '../operations'
import { QuickAddTransaction } from './QuickAddTransaction'

function renderQuickAdd() {
  return render(
    <ToastProvider>
      <QuickAddTransaction />
    </ToastProvider>,
  )
}

describe('QuickAddTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    useFinanceStore.setState({
      accounts: [
        { id: 'acc_cash', name: 'Efectivo', type: 'cash', currency: 'UYU', initialBalance: 0, color: null, archived: false, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: 'acc_bank', name: 'Banco', type: 'bank', currency: 'UYU', initialBalance: 0, color: null, archived: false, createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      categories: [
        { id: 'cat_food', name: 'Comida', parentId: null, kind: 'expense', color: null, archived: false },
      ],
      transactions: [],
      recurring: [],
      budgets: [],
      settings: DEFAULT_FINANCE_SETTINGS,
    })
  })

  it('hides transfer mode when transfers are disabled', () => {
    useFinanceStore.setState({
      settings: {
        ...DEFAULT_FINANCE_SETTINGS,
        transfersEnabled: false,
      },
    })

    renderQuickAdd()

    expect(screen.queryByRole('button', { name: 'Transfer' })).not.toBeInTheDocument()
  })

  it('uses createTransfer when transfer mode is enabled', async () => {
    renderQuickAdd()

    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }))
    fireEvent.change(screen.getByPlaceholderText(/Sale/), { target: { value: '1200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cargar' }))

    await waitFor(() => {
      expect(createTransfer).toHaveBeenCalledWith(expect.objectContaining({
        fromAccountId: 'acc_cash',
        toAccountId: 'acc_bank',
        amount: 120000,
      }))
    })
  })
})
