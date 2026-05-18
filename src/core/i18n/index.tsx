import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
const TRANSLATABLE_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'] as const
const SKIP_STATIC_TRANSLATION_SELECTOR = [
  'script',
  'style',
  'textarea',
  'input',
  'select',
  'option',
  'code',
  'pre',
  '[contenteditable="true"]',
  '[data-i18n-skip]',
].join(',')

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
  const textOriginals = useRef<WeakMap<Text, string>>(new WeakMap())
  const attrOriginals = useRef<WeakMap<Element, Partial<Record<(typeof TRANSLATABLE_ATTRIBUTES)[number], string>>>>(new WeakMap())
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

  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return

    const root = document.body
    const translateTextNode = (node: Text) => {
      if (shouldSkipStaticTranslation(node)) return

      const previousOriginal = textOriginals.current.get(node)
      const expectedTranslation = previousOriginal
        ? translateStaticUiText('en', previousOriginal)
        : null

      if (previousOriginal && node.data === expectedTranslation) return

      const original = node.data
      const translated = translateStaticUiText('en', original)
      if (translated === original) return

      textOriginals.current.set(node, original)
      node.data = translated
    }

    const restoreTextNode = (node: Text) => {
      const original = textOriginals.current.get(node)
      if (original && node.data !== original) {
        node.data = original
      }
    }

    const translateAttributes = (element: Element) => {
      if (shouldSkipStaticTranslation(element)) return

      for (const attr of TRANSLATABLE_ATTRIBUTES) {
        const current = element.getAttribute(attr)
        if (!current) continue

        const stored = attrOriginals.current.get(element)?.[attr]
        const expectedTranslation = stored ? translateStaticUiText('en', stored) : null
        if (stored && current === expectedTranslation) continue

        const translated = translateStaticUiText('en', current)
        if (translated === current) continue

        const originals = attrOriginals.current.get(element) ?? {}
        originals[attr] = current
        attrOriginals.current.set(element, originals)
        element.setAttribute(attr, translated)
      }
    }

    const restoreAttributes = (element: Element) => {
      const originals = attrOriginals.current.get(element)
      if (!originals) return

      for (const attr of TRANSLATABLE_ATTRIBUTES) {
        const original = originals[attr]
        if (original && element.getAttribute(attr) !== original) {
          element.setAttribute(attr, original)
        }
      }
    }

    const walkText = (fn: (node: Text) => void) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let current = walker.nextNode()
      while (current) {
        fn(current as Text)
        current = walker.nextNode()
      }
    }

    const walkElements = (fn: (element: Element) => void) => {
      fn(root)
      root.querySelectorAll('*').forEach(fn)
    }

    if (language !== 'en') {
      walkText(restoreTextNode)
      walkElements(restoreAttributes)
      return
    }

    const translateAll = () => {
      walkText(translateTextNode)
      walkElements(translateAttributes)
    }

    translateAll()

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(mutation.target as Text)
        }

        if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
          translateAttributes(mutation.target as Element)
        }

        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            translateTextNode(node as Text)
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            translateAttributes(element)
            element.querySelectorAll('*').forEach(translateAttributes)
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
            let current = walker.nextNode()
            while (current) {
              translateTextNode(current as Text)
              current = walker.nextNode()
            }
          }
        }
      }
    })

    observer.observe(root, {
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => observer.disconnect()
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

export function translateStaticUiText(language: AppLanguage, value: string): string {
  if (language !== 'en') return value

  const leading = value.match(/^\s*/)?.[0] ?? ''
  const trailing = value.match(/\s*$/)?.[0] ?? ''
  const normalized = value.trim()
  if (!normalized) return value

  const translated = copy.en.staticText[normalized]
  return translated ? `${leading}${translated}${trailing}` : value
}

function shouldSkipStaticTranslation(node: Node): boolean {
  const element = node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement
  return Boolean(element?.closest(SKIP_STATIC_TRANSLATION_SELECTOR))
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
