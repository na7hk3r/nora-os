import { create } from 'zustand'
import type { Account, Category, Transaction, Recurring, Budget } from './types'
import { DEFAULT_FINANCE_SETTINGS, type FinancePluginSettings } from './settings'

interface FinanceState {
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  recurring: Recurring[]
  budgets: Budget[]
  settings: FinancePluginSettings

  setAccounts: (accounts: Account[]) => void
  setCategories: (categories: Category[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setRecurring: (recurring: Recurring[]) => void
  setBudgets: (budgets: Budget[]) => void
  setSettings: (settings: FinancePluginSettings) => void

  upsertAccount: (account: Account) => void
  removeAccount: (id: string) => void

  upsertCategory: (category: Category) => void
  removeCategory: (id: string) => void

  upsertTransaction: (tx: Transaction) => void
  upsertTransactions: (txs: Transaction[]) => void
  removeTransaction: (id: string) => void

  upsertRecurring: (rec: Recurring) => void
  removeRecurring: (id: string) => void

  upsertBudget: (b: Budget) => void
  removeBudget: (id: string) => void
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const idx = list.findIndex((i) => i.id === item.id)
  if (idx === -1) return [...list, item]
  const next = [...list]
  next[idx] = item
  return next
}

export const useFinanceStore = create<FinanceState>((set) => ({
  accounts: [],
  categories: [],
  transactions: [],
  recurring: [],
  budgets: [],
  settings: DEFAULT_FINANCE_SETTINGS,

  setAccounts: (accounts) => set({ accounts }),
  setCategories: (categories) => set({ categories }),
  setTransactions: (transactions) => set({ transactions }),
  setRecurring: (recurring) => set({ recurring }),
  setBudgets: (budgets) => set({ budgets }),
  setSettings: (settings) => set({ settings }),

  upsertAccount: (account) => set((s) => ({ accounts: upsertById(s.accounts, account) })),
  removeAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

  upsertCategory: (category) => set((s) => ({ categories: upsertById(s.categories, category) })),
  removeCategory: (id) =>
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      // Las transacciones conservan la categoría como null (SET NULL en DB).
      transactions: s.transactions.map((t) =>
        t.categoryId === id ? { ...t, categoryId: null } : t,
      ),
    })),

  upsertTransaction: (tx) => set((s) => ({ transactions: upsertById(s.transactions, tx) })),
  upsertTransactions: (txs) =>
    set((s) => {
      let next = s.transactions
      for (const t of txs) next = upsertById(next, t)
      return { transactions: next }
    }),
  removeTransaction: (id) => set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

  upsertRecurring: (rec) => set((s) => ({ recurring: upsertById(s.recurring, rec) })),
  removeRecurring: (id) => set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) })),

  upsertBudget: (b) => set((s) => ({ budgets: upsertById(s.budgets, b) })),
  removeBudget: (id) => set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
}))
