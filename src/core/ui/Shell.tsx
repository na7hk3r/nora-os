import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useCoreStore } from '../state/coreStore'
import { GamificationNotificationHub } from './GamificationNotificationHub'
import { AppUpdateBanner } from './components/AppUpdateBanner'
import { CopilotPanel } from './CopilotPanel'
import { GlobalShortcuts } from './GlobalShortcuts'
import { WorkspaceSplitView } from './WorkspaceSplitView'
import { useI18n } from '@core/i18n'

const COPILOT_COLLAPSED_KEY = 'core:copilotPanel:collapsed'

interface ShellProps {
  onGlobalShortcut?: () => void
}

export function Shell({ onGlobalShortcut }: ShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const theme = useCoreStore((s) => s.settings.theme)
  const [copilotCollapsed, setCopilotCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    if (window.matchMedia('(max-width: 1024px)').matches) return true
    return window.localStorage?.getItem(COPILOT_COLLAPSED_KEY) === 'true'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'default')
  }, [theme])

  // Auto-colapsar el copiloto cuando la pantalla es chica (≤1024px) para
  // evitar que el panel coma todo el ancho útil. Cuando el viewport vuelve a
  // ser amplio respetamos la preferencia persistida del usuario.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 1024px)')
    const apply = () => {
      if (mq.matches) {
        setCopilotCollapsed(true)
      } else {
        try {
          setCopilotCollapsed(window.localStorage?.getItem(COPILOT_COLLAPSED_KEY) === 'true')
        } catch {
          setCopilotCollapsed(false)
        }
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  // Permite que otras superficies (ej. DailyScoreScreen) abran el copiloto
  // sin acoplarse al estado local de Shell. Persiste también el flag para
  // que recargas mantengan la preferencia.
  useEffect(() => {
    const handler = () => {
      setCopilotCollapsed(false)
      try { window.localStorage?.setItem(COPILOT_COLLAPSED_KEY, 'false') } catch { /* ignore */ }
    }
    window.addEventListener('copilot:open', handler as EventListener)
    return () => window.removeEventListener('copilot:open', handler as EventListener)
  }, [])

  const toggleCopilot = () => {
    setCopilotCollapsed((prev) => {
      const next = !prev
      try { window.localStorage?.setItem(COPILOT_COLLAPSED_KEY, next ? 'true' : 'false') } catch { /* ignore */ }
      return next
    })
  }

  const canGoBack = location.key !== 'default' || location.pathname !== '/'
  const goBack = () => {
    if (location.key !== 'default') {
      navigate(-1)
    } else if (location.pathname !== '/') {
      navigate('/')
    }
  }

  return (
    <div
      className="flex h-screen overflow-hidden text-white"
      style={{ background: 'var(--bg-gradient)' }}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        {t.shell.skipToContent}
      </a>
      <GamificationNotificationHub />
      <AppUpdateBanner />
      <GlobalShortcuts onShortcutHandled={onGlobalShortcut} />
      <Sidebar />
      <main
        id="main-content"
        role="main"
        tabIndex={-1}
        className={`min-w-0 flex-1 overflow-hidden transition-all duration-200 ${
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        {canGoBack && (
          <button
            type="button"
            onClick={goBack}
            aria-label={t.shell.goBackAria}
            title={t.shell.goBackAria}
            className={`fixed top-4 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-surface-light/90 px-3 py-2 text-xs font-medium text-muted shadow-lg shadow-black/20 backdrop-blur transition-all hover:border-accent/50 hover:text-white ${
              sidebarCollapsed ? 'left-20' : 'left-60'
            }`}
          >
            <ArrowLeft size={15} />
            {t.shell.goBack}
          </button>
        )}
        <WorkspaceSplitView />
      </main>
      <CopilotPanel collapsed={copilotCollapsed} onToggle={toggleCopilot} />
    </div>
  )
}

