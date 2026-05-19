import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useI18n } from '../i18n'

const STORAGE_KEY = 'nora-os:theme'

type Theme = 'dark' | 'light'

interface ThemeToggleProps {
  className?: string
}

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
  if (stored === 'dark' || stored === 'light') return stored
  const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)').matches
  return prefersLight ? 'light' : 'dark'
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('dark')
  const { t } = useI18n()

  useEffect(() => {
    setTheme(readInitial())
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={next === 'dark' ? t.common.switchToDark : t.common.switchToLight}
      className={`inline-flex items-center justify-center rounded-md border border-border bg-surface/60 text-muted transition-colors hover:bg-surface-light hover:text-foreground ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
      ) : (
        <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
      )}
    </button>
  )
}
