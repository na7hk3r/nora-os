import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FINANCE_SETTINGS,
  formatExchangeRatesText,
  normalizeFinanceSettings,
  parseExchangeRatesText,
} from './settings'
import { buildFinanceUi } from './pluginUi'

describe('finance settings', () => {
  it('normalizes feature flags and currency', () => {
    expect(normalizeFinanceSettings({
      budgetsEnabled: false,
      aiContextEnabled: true,
      defaultCurrency: 'usd',
      exchangeRates: { uyu: 0.025, eur: '1.1' as unknown as number, bad: -1 },
    })).toEqual({
      ...DEFAULT_FINANCE_SETTINGS,
      budgetsEnabled: false,
      aiContextEnabled: true,
      defaultCurrency: 'USD',
      exchangeRates: { EUR: 1.1, UYU: 0.025 },
    })

    expect(normalizeFinanceSettings({ defaultCurrency: '12' }).defaultCurrency).toBe('UYU')
  })

  it('parses exchange-rate text for manual conversions', () => {
    expect(parseExchangeRatesText('USD=40, EUR:43.5; ars=0, BRL=8, UYU=1', 'UYU')).toEqual({
      BRL: 8,
      EUR: 43.5,
      USD: 40,
    })
    expect(formatExchangeRatesText({ USD: 40, EUR: 43.5 })).toBe('EUR=43.5, USD=40')
  })

  it('omits optional finance pages and nav items when disabled', () => {
    const ui = buildFinanceUi(normalizeFinanceSettings({
      budgetsEnabled: false,
      recurringEnabled: false,
      insightsEnabled: false,
    }))

    expect(ui.pages.map((page) => page.path)).toEqual([
      '/finance',
      '/finance/transactions',
      '/finance/categories',
    ])
    expect(ui.navItems.map((item) => item.path)).toEqual([
      '/finance',
      '/finance/transactions',
      '/finance/categories',
    ])
  })
})
