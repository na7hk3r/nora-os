export interface FinancePluginSettings {
  budgetsEnabled: boolean
  recurringEnabled: boolean
  insightsEnabled: boolean
  transfersEnabled: boolean
  anomalyAlertsEnabled: boolean
  aiContextEnabled: boolean
  defaultCurrency: string
  /** Tasas manuales relativas a la moneda predeterminada. 1 moneda = rate defaultCurrency. */
  exchangeRates: Record<string, number>
}

export const FINANCE_SETTINGS_KEY = 'pluginSettings:finance'

export const DEFAULT_FINANCE_SETTINGS: FinancePluginSettings = {
  budgetsEnabled: true,
  recurringEnabled: true,
  insightsEnabled: true,
  transfersEnabled: true,
  anomalyAlertsEnabled: true,
  aiContextEnabled: false,
  defaultCurrency: 'UYU',
  exchangeRates: {},
}

export function normalizeFinanceSettings(
  input: Partial<FinancePluginSettings> | null | undefined,
): FinancePluginSettings {
  const defaultCurrency = normalizeCurrency(input?.defaultCurrency)
  return {
    budgetsEnabled: input?.budgetsEnabled ?? DEFAULT_FINANCE_SETTINGS.budgetsEnabled,
    recurringEnabled: input?.recurringEnabled ?? DEFAULT_FINANCE_SETTINGS.recurringEnabled,
    insightsEnabled: input?.insightsEnabled ?? DEFAULT_FINANCE_SETTINGS.insightsEnabled,
    transfersEnabled: input?.transfersEnabled ?? DEFAULT_FINANCE_SETTINGS.transfersEnabled,
    anomalyAlertsEnabled: input?.anomalyAlertsEnabled ?? DEFAULT_FINANCE_SETTINGS.anomalyAlertsEnabled,
    aiContextEnabled: input?.aiContextEnabled ?? DEFAULT_FINANCE_SETTINGS.aiContextEnabled,
    defaultCurrency,
    exchangeRates: normalizeExchangeRates(input?.exchangeRates, defaultCurrency),
  }
}

export async function loadFinanceSettings(): Promise<FinancePluginSettings> {
  if (!window.storage) return DEFAULT_FINANCE_SETTINGS

  const rows = await window.storage.query(
    `SELECT value FROM settings WHERE key = ? LIMIT 1`,
    [FINANCE_SETTINGS_KEY],
  ) as { value: string }[]

  const raw = rows[0]?.value
  if (!raw) return DEFAULT_FINANCE_SETTINGS

  try {
    return normalizeFinanceSettings(JSON.parse(raw) as Partial<FinancePluginSettings>)
  } catch {
    return DEFAULT_FINANCE_SETTINGS
  }
}

export async function saveFinanceSettings(settings: FinancePluginSettings): Promise<FinancePluginSettings> {
  const normalized = normalizeFinanceSettings(settings)
  if (!window.storage) return normalized

  await window.storage.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
    [FINANCE_SETTINGS_KEY, JSON.stringify(normalized)],
  )
  return normalized
}

export function normalizeCurrency(value: unknown, fallback = DEFAULT_FINANCE_SETTINGS.defaultCurrency): string {
  const currency = typeof value === 'string'
    ? value.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)
    : ''
  return currency.length === 3 ? currency : fallback
}

export function normalizeExchangeRates(
  value: unknown,
  baseCurrency = DEFAULT_FINANCE_SETTINGS.defaultCurrency,
): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const base = normalizeCurrency(baseCurrency)
  const out: Record<string, number> = {}
  for (const [rawCurrency, rawRate] of Object.entries(value as Record<string, unknown>)) {
    const currency = normalizeCurrency(rawCurrency, '')
    const rate = typeof rawRate === 'number' ? rawRate : Number.parseFloat(String(rawRate).replace(',', '.'))
    if (!currency || currency === base || !Number.isFinite(rate) || rate <= 0) continue
    out[currency] = Math.round(rate * 1_000_000) / 1_000_000
  }
  return out
}

export function parseExchangeRatesText(text: string, baseCurrency: string): Record<string, number> {
  const entries: Record<string, number> = {}
  for (const part of text.split(/[\n,;]/)) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [rawCurrency, rawRate] = trimmed.split(/[:=]/).map((segment) => segment.trim())
    if (!rawCurrency || !rawRate) continue
    const currency = normalizeCurrency(rawCurrency, '')
    const rate = Number.parseFloat(rawRate.replace(',', '.'))
    if (currency && Number.isFinite(rate) && rate > 0) entries[currency] = rate
  }
  return normalizeExchangeRates(entries, baseCurrency)
}

export function formatExchangeRatesText(rates: Record<string, number>): string {
  return Object.entries(rates)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([currency, rate]) => `${currency}=${rate}`)
    .join(', ')
}
