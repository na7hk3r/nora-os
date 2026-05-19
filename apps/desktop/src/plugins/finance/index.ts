/**
 * Plugin Finance — manifest principal.
 *
 * Provee captura rápida de movimientos, presupuestos, recurrentes y un
 * proveedor de contexto IA. La filosofía es "awareness sin contabilidad":
 * cero números de débito/crédito, una sola unidad por moneda en centavos.
 */

import type { PluginManifest, CoreAPI } from '@core/types'
import { registerPlugin } from '@core/plugins/PluginRegistry'
import { useFinanceStore } from './store'
import { FINANCE_EVENTS } from './events'
import { runRecurringEngine } from './operations'
import { detectAnomaly } from './insights'
import { eventBus } from '@core/events/EventBus'
import { DEFAULT_FINANCE_SETTINGS, loadFinanceSettings } from './settings'
import { buildFinanceUi } from './pluginUi'
import { applyFinanceRuntimeSettings, clearFinanceRuntime } from './runtime'
import type { Account, Category, Transaction, Recurring, Budget, RecurringTemplate } from './types'

const defaultFinanceUi = buildFinanceUi(DEFAULT_FINANCE_SETTINGS)

const financePlugin: PluginManifest = {
  id: 'finance',
  name: 'Finanzas',
  version: '1.0.0',
  description: 'Movimientos, cuentas, presupuestos y gastos recurrentes.',
  icon: 'Landmark',
  domain: 'finance',
  domainKeywords: ['money', 'budget', 'transactions', 'recurring'],
  iconography: {
    primary: 'Landmark',
    gallery: [
      'Landmark',
      'WalletCards',
      'ReceiptText',
      'BadgeDollarSign',
      'PiggyBank',
      'CalendarSync',
      'ChartNoAxesCombined',
      'Banknote',
      'Scale',
      'HandCoins',
    ],
  },

  migrations: [
    {
      version: 1,
      up: `
        CREATE TABLE IF NOT EXISTS finance_accounts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'UYU',
          initial_balance INTEGER NOT NULL DEFAULT 0,
          archived INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS finance_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          parent_id TEXT,
          kind TEXT NOT NULL DEFAULT 'expense',
          color TEXT,
          archived INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (parent_id) REFERENCES finance_categories(id) ON DELETE SET NULL
        );
        CREATE TABLE IF NOT EXISTS finance_transactions (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          category_id TEXT,
          kind TEXT NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'UYU',
          occurred_at TEXT NOT NULL,
          note TEXT,
          recurring_id TEXT,
          transfer_pair_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES finance_accounts(id) ON DELETE RESTRICT,
          FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE SET NULL
        );
        CREATE INDEX IF NOT EXISTS idx_finance_tx_account_date ON finance_transactions(account_id, occurred_at);
        CREATE INDEX IF NOT EXISTS idx_finance_tx_category_date ON finance_transactions(category_id, occurred_at);
        CREATE TABLE IF NOT EXISTS finance_recurring (
          id TEXT PRIMARY KEY,
          template_json TEXT NOT NULL,
          rrule TEXT NOT NULL,
          next_run TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS finance_budgets (
          id TEXT PRIMARY KEY,
          category_id TEXT NOT NULL,
          period TEXT NOT NULL DEFAULT 'monthly',
          limit_amount INTEGER NOT NULL,
          currency TEXT NOT NULL DEFAULT 'UYU',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          UNIQUE (category_id, period, currency),
          FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS finance_merchant_aliases (
          id TEXT PRIMARY KEY,
          pattern TEXT NOT NULL,
          category_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE SET NULL
        );
      `,
    },
    {
      version: 2,
      up: `
        INSERT OR IGNORE INTO finance_categories (id, name, parent_id, kind, color, archived) VALUES
          ('cat_food', 'Comida', NULL, 'expense', NULL, 0),
          ('cat_transport', 'Transporte', NULL, 'expense', NULL, 0),
          ('cat_home', 'Hogar', NULL, 'expense', NULL, 0),
          ('cat_health', 'Salud', NULL, 'expense', NULL, 0),
          ('cat_entertainment', 'Ocio', NULL, 'expense', NULL, 0),
          ('cat_subscriptions', 'Suscripciones', NULL, 'expense', NULL, 0),
          ('cat_other_exp', 'Otros gastos', NULL, 'expense', NULL, 0),
          ('cat_salary', 'Sueldo', NULL, 'income', NULL, 0),
          ('cat_other_inc', 'Otros ingresos', NULL, 'income', NULL, 0);
      `,
    },
    {
      version: 3,
      up: `
        ALTER TABLE finance_accounts ADD COLUMN color TEXT;
        ALTER TABLE finance_transactions ADD COLUMN original_amount INTEGER;
        ALTER TABLE finance_transactions ADD COLUMN original_currency TEXT;
        ALTER TABLE finance_transactions ADD COLUMN base_amount INTEGER;
        ALTER TABLE finance_transactions ADD COLUMN base_currency TEXT;
        ALTER TABLE finance_transactions ADD COLUMN exchange_rate REAL;
        ALTER TABLE finance_transactions ADD COLUMN transfer_group_id TEXT;
        ALTER TABLE finance_transactions ADD COLUMN movement_subtype TEXT NOT NULL DEFAULT 'regular';
        UPDATE finance_transactions
           SET original_amount = COALESCE(original_amount, amount),
               original_currency = COALESCE(original_currency, currency),
               base_amount = COALESCE(base_amount, amount),
               base_currency = COALESCE(base_currency, currency),
               exchange_rate = COALESCE(exchange_rate, 1),
               movement_subtype = COALESCE(movement_subtype, 'regular');
      `,
    },
  ],

  widgets: defaultFinanceUi.widgets,

  pages: defaultFinanceUi.pages,

  navItems: defaultFinanceUi.navItems,

  events: {
    emits: Object.values(FINANCE_EVENTS),
    listens: [],
  },

  async init(api: CoreAPI) {
    const settings = await loadFinanceSettings()
    const ui = buildFinanceUi(settings)
    financePlugin.widgets = ui.widgets
    financePlugin.pages = ui.pages
    financePlugin.navItems = ui.navItems

    const accountsRaw = await api.storage.query('SELECT * FROM finance_accounts ORDER BY created_at ASC')
    const categoriesRaw = await api.storage.query('SELECT * FROM finance_categories ORDER BY name ASC')
    const transactionsRaw = await api.storage.query('SELECT * FROM finance_transactions ORDER BY occurred_at DESC, created_at DESC')
    const recurringRaw = await api.storage.query('SELECT * FROM finance_recurring ORDER BY next_run ASC')
    const budgetsRaw = await api.storage.query('SELECT * FROM finance_budgets ORDER BY created_at ASC')

    const accounts: Account[] = (accountsRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as Account['type'],
      currency: row.currency as string,
      initialBalance: Number(row.initial_balance ?? 0),
      color: (row.color ?? null) as string | null,
      archived: Boolean(row.archived),
      createdAt: row.created_at as string,
    }))

    const categories: Category[] = (categoriesRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      parentId: (row.parent_id ?? null) as string | null,
      kind: (row.kind ?? 'expense') as Category['kind'],
      color: (row.color ?? null) as string | null,
      archived: Boolean(row.archived),
    }))

    const transactions: Transaction[] = (transactionsRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      accountId: row.account_id as string,
      categoryId: (row.category_id ?? null) as string | null,
      kind: row.kind as Transaction['kind'],
      amount: Number(row.amount ?? 0),
      currency: row.currency as string,
      originalAmount: Number(row.original_amount ?? row.amount ?? 0),
      originalCurrency: (row.original_currency ?? row.currency) as string,
      baseAmount: row.base_amount == null ? null : Number(row.base_amount),
      baseCurrency: (row.base_currency ?? null) as string | null,
      exchangeRate: row.exchange_rate == null ? null : Number(row.exchange_rate),
      occurredAt: row.occurred_at as string,
      note: (row.note ?? null) as string | null,
      recurringId: (row.recurring_id ?? null) as string | null,
      transferPairId: (row.transfer_pair_id ?? null) as string | null,
      transferGroupId: (row.transfer_group_id ?? null) as string | null,
      movementSubtype: (row.movement_subtype ?? 'regular') as Transaction['movementSubtype'],
      createdAt: row.created_at as string,
    }))

    const recurring: Recurring[] = (recurringRaw as Record<string, unknown>[]).map((row) => {
      let template: RecurringTemplate
      try {
        template = JSON.parse(row.template_json as string) as RecurringTemplate
      } catch {
        // fallback defensivo: marcar inactiva si JSON inválido
        template = { accountId: '', categoryId: null, kind: 'expense', amount: 0, currency: 'UYU', note: null }
      }
      return {
        id: row.id as string,
        template,
        rrule: row.rrule as string,
        nextRun: row.next_run as string,
        active: Boolean(row.active),
        createdAt: row.created_at as string,
      }
    })

    const budgets: Budget[] = (budgetsRaw as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      categoryId: row.category_id as string,
      period: 'monthly',
      limitAmount: Number(row.limit_amount ?? 0),
      currency: row.currency as string,
      createdAt: row.created_at as string,
    }))

    const store = useFinanceStore.getState()
    store.setAccounts(accounts)
    store.setCategories(categories)
    store.setTransactions(transactions)
    store.setRecurring(recurring)
    store.setBudgets(budgets)
    applyFinanceRuntimeSettings(settings)

    // Materializar recurrentes atrasadas (best-effort, no bloquear init)
    if (settings.recurringEnabled) {
      void runRecurringEngine().catch((err) => console.warn('[finance] recurring engine error:', err))
    }

    // Anomaly detection sobre cada transacción nueva.
    api.events.on(FINANCE_EVENTS.TRANSACTION_CREATED, (payload) => {
      const id = (payload as { id?: string } | null)?.id
      if (!id) return
      const anomaly = detectAnomaly(id)
      if (anomaly) {
        eventBus.emit(
          FINANCE_EVENTS.ANOMALY_DETECTED,
          { txId: anomaly.txId, categoryName: anomaly.categoryName, amountCents: anomaly.amountCents, ratio: anomaly.ratio },
          { source: 'finance', persist: true },
        )
      }
    })

    // Gamificación
    api.events.on(FINANCE_EVENTS.TRANSACTION_CREATED, () => {
      api.gamification.addPoints(2, 'Movimiento registrado')
    })
    api.events.on(FINANCE_EVENTS.RECURRING_CREATED, () => {
      api.gamification.addPoints(5, 'Recurrente configurada')
    })
    api.events.on(FINANCE_EVENTS.BUDGET_CREATED, () => {
      api.gamification.addPoints(5, 'Presupuesto definido')
    })
  },

  deactivate() {
    clearFinanceRuntime()
  },
}

registerPlugin(financePlugin)

export default financePlugin
