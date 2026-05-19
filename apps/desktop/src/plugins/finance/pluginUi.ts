import type { NavItemDefinition, PageDefinition, WidgetDefinition } from '@core/types'
import { FinanceSummaryWidget } from './components/FinanceSummaryWidget'
import { FinanceDashboard } from './pages/FinanceDashboard'
import { TransactionsPage } from './pages/TransactionsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { BudgetsPage } from './pages/BudgetsPage'
import { RecurringPage } from './pages/RecurringPage'
import { InsightsPage } from './pages/InsightsPage'
import type { FinancePluginSettings } from './settings'

export interface FinancePluginUi {
  widgets: WidgetDefinition[]
  pages: PageDefinition[]
  navItems: NavItemDefinition[]
}

export function buildFinanceUi(settings: FinancePluginSettings): FinancePluginUi {
  const widgets: WidgetDefinition[] = [
    {
      id: 'finance-summary',
      pluginId: 'finance',
      title: 'Finanzas',
      component: FinanceSummaryWidget,
      defaultSize: { w: 1, h: 1 },
    },
  ]

  const pages: PageDefinition[] = [
    { id: 'finance-dashboard', pluginId: 'finance', path: '/finance', title: 'Finanzas', icon: 'Landmark', component: FinanceDashboard },
    { id: 'finance-tx', pluginId: 'finance', path: '/finance/transactions', title: 'Movimientos', icon: 'ReceiptText', component: TransactionsPage },
    { id: 'finance-cat', pluginId: 'finance', path: '/finance/categories', title: 'Categorías', icon: 'BadgeDollarSign', component: CategoriesPage },
  ]

  const navItems: NavItemDefinition[] = [
    { id: 'finance-nav', pluginId: 'finance', label: 'Finanzas', icon: 'Landmark', path: '/finance', order: 30 },
    { id: 'finance-tx-nav', pluginId: 'finance', label: 'Movimientos', icon: 'ReceiptText', path: '/finance/transactions', order: 31, parentId: 'finance-nav' },
  ]

  if (settings.budgetsEnabled) {
    pages.push({ id: 'finance-bud', pluginId: 'finance', path: '/finance/budgets', title: 'Presupuestos', icon: 'PiggyBank', component: BudgetsPage })
    navItems.push({ id: 'finance-bud-nav', pluginId: 'finance', label: 'Presupuestos', icon: 'PiggyBank', path: '/finance/budgets', order: 32, parentId: 'finance-nav' })
  }

  if (settings.recurringEnabled) {
    pages.push({ id: 'finance-rec', pluginId: 'finance', path: '/finance/recurring', title: 'Recurrentes', icon: 'CalendarSync', component: RecurringPage })
    navItems.push({ id: 'finance-rec-nav', pluginId: 'finance', label: 'Recurrentes', icon: 'CalendarSync', path: '/finance/recurring', order: 33, parentId: 'finance-nav' })
  }

  navItems.push({ id: 'finance-cat-nav', pluginId: 'finance', label: 'Categorías', icon: 'BadgeDollarSign', path: '/finance/categories', order: 34, parentId: 'finance-nav' })

  if (settings.insightsEnabled) {
    pages.push({ id: 'finance-ins', pluginId: 'finance', path: '/finance/insights', title: 'Insights', icon: 'ChartNoAxesCombined', component: InsightsPage })
    navItems.push({ id: 'finance-ins-nav', pluginId: 'finance', label: 'Insights', icon: 'ChartNoAxesCombined', path: '/finance/insights', order: 35, parentId: 'finance-nav' })
  }

  return { widgets, pages, navItems }
}
