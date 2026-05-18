import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
  useState,
} from 'react'
import { copy, type AppCopy, type AppLanguage } from './catalog'

export type { AppCopy, AppLanguage } from './catalog'

export const languageOptions = [
  { code: 'es', shortLabel: 'ES', labelKey: 'es', htmlLang: 'es' },
  { code: 'en', shortLabel: 'EN', labelKey: 'en', htmlLang: 'en' },
] as const

export const I18N_STORAGE_KEY = 'core:i18n:language'

export interface I18nValue {
  language: AppLanguage
  locale: string
  setLanguage: (language: AppLanguage) => void
  t: AppCopy
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  compareText: (left: string, right: string) => number
}

interface DetectLanguageOptions {
  stored?: string | null
  candidates?: readonly string[]
}

const defaultLanguage: AppLanguage = 'es'

const I18nContext = createContext<I18nValue | null>(null)
let runtimeLanguage: AppLanguage | null = null

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'es' || value === 'en'
}

export function detectLanguageFromCandidates(candidates: readonly string[] = []): AppLanguage {
  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split('-')[0]
    if (isAppLanguage(base)) return base
  }
  return defaultLanguage
}

export function detectInitialLanguage(options: DetectLanguageOptions = {}): AppLanguage {
  if (isAppLanguage(options.stored)) return options.stored
  if (options.candidates) return detectLanguageFromCandidates(options.candidates)

  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(I18N_STORAGE_KEY)
      if (isAppLanguage(stored)) return stored
    } catch {
      // localStorage can be unavailable in private/test environments.
    }
  }

  if (typeof navigator !== 'undefined') {
    const candidates = navigator.languages?.length ? navigator.languages : [navigator.language]
    return detectLanguageFromCandidates(candidates)
  }

  return defaultLanguage
}

function toDate(value: Date | string | number): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`)
  }
  return new Date(value)
}

function createFormatters(language: AppLanguage) {
  const locale = copy[language].locale
  return {
    locale,
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(toDate(value)),
    formatDateTime: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options ?? {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(toDate(value)),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(value),
    compareText: (left: string, right: string) => left.localeCompare(right, locale),
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(detectInitialLanguage)
  runtimeLanguage = language

  useEffect(() => {
    const activeCopy = copy[language]
    document.documentElement.lang = activeCopy.htmlLang
    try {
      window.localStorage.setItem(I18N_STORAGE_KEY, language)
    } catch {
      // Ignore persistence failures; the selector still works for this session.
    }
  }, [language])

  useEffect(() => () => {
    runtimeLanguage = null
  }, [])

  const value = useMemo<I18nValue>(() => {
    const formatters = createFormatters(language)
    return {
      language,
      setLanguage,
      t: copy[language],
      ...formatters,
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function getCopy(language: AppLanguage): AppCopy {
  return copy[language]
}

export function getCurrentLanguage(): AppLanguage {
  return runtimeLanguage ?? detectInitialLanguage()
}

export function getLocaleForLanguage(language: AppLanguage): string {
  return copy[language].locale
}

export function getCurrentLocale(): string {
  return getLocaleForLanguage(getCurrentLanguage())
}

export function getByPath(root: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[segment]
  }, root)
}

export function resolveI18nString(
  language: AppLanguage,
  fallback: string,
  key?: string | null,
): string {
  const activeCopy = copy[language]
  if (key) {
    const value = getByPath(activeCopy, key)
    if (typeof value === 'string') return value
  }
  if (language === 'es') return fallback
  return activeCopy.staticText[fallback] ?? fallback
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (value) return value

  const fallbackFormatters = createFormatters(defaultLanguage)
  return {
    language: defaultLanguage,
    setLanguage: () => {},
    t: copy[defaultLanguage],
    ...fallbackFormatters,
  }
}

export function useI18nText() {
  const { language } = useI18n()
  return (fallback: string, key?: string | null) => resolveI18nString(language, fallback, key)
}
