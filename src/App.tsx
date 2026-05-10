import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './core/ui/Shell'
import { Dashboard } from './core/ui/Dashboard'
const ControlCenter = lazy(() => import('./core/ui/ControlCenter').then((m) => ({ default: m.ControlCenter })))
const CoreNotesPage = lazy(() => import('./core/ui/pages/NotesPage').then((m) => ({ default: m.CoreNotesPage })))
const CoreLinksPage = lazy(() => import('./core/ui/pages/LinksPage').then((m) => ({ default: m.CoreLinksPage })))
const CorePlannerPage = lazy(() => import('./core/ui/pages/PlannerPage').then((m) => ({ default: m.CorePlannerPage })))
const CalendarPage = lazy(() => import('./core/ui/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const ReviewPage = lazy(() => import('./core/ui/pages/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const ShortcutsPage = lazy(() => import('./core/ui/pages/ShortcutsPage').then((m) => ({ default: m.ShortcutsPage })))
const ThemeGalleryPage = lazy(() => import('./core/ui/pages/ThemeGalleryPage').then((m) => ({ default: m.ThemeGalleryPage })))
const ProfilePage = lazy(() => import('./core/ui/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const WorkFocusMiniPage = lazy(() => import('./plugins/work/pages/WorkFocusMiniPage').then((m) => ({ default: m.WorkFocusMiniPage })))
import { CommandPalette } from './core/ui/CommandPalette'
import { OnboardingWizard } from './core/ui/onboarding/OnboardingWizard'
import { DailyScoreScreen } from './core/ui/DailyScoreScreen'
import { pluginManager } from './core/plugins/PluginManager'
import { getAvailablePlugins } from './core/plugins/PluginRegistry'
import { useCoreStore } from './core/state/coreStore'
import { useGamificationStore } from './core/gamification/gamificationStore'
import { useAuthStore } from './core/state/authStore'
import { AuthScreen } from './core/ui/auth/AuthScreen'
import { UnlockScreen } from './core/ui/auth/UnlockScreen'
import { ErrorBoundary } from './core/ui/components/ErrorBoundary'
import { GlobalErrorBoundary } from './core/ui/components/GlobalErrorBoundary'
import { ToastProvider } from './core/ui/components/ToastProvider'
import { NoraLogoMark } from './core/ui/components/NoraLogo'
import { messages } from './core/ui/messages'
import { automationsService } from './core/services/automationsService'
import { notificationsService } from './core/services/notificationsService'
import { WorkFocusCommandHost } from './plugins/work/components/WorkFocusCommandHost'

// Import and register plugins
import './plugins/fitness'
import './plugins/work'
import './plugins/finance'
import './plugins/habits'
import './plugins/journal'
import './plugins/goals'
import './plugins/knowledge'
import './plugins/time'

/**
 * Safe mode skips plugin initialization so the shell can boot even if a plugin
 * throws during init. Triggered via `#safe` in the hash of the URL (e.g. the
 * user can launch with `nora-os#safe`).
 */
function isSafeModeRequested(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hash.includes('safe')
}

function RouteFallback() {
  return (
    <div className="space-y-4 p-2" role="status" aria-label="Cargando contenido">
      <div className="h-24 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
        <div className="h-40 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

const DAILY_SCORE_LAST_SHOWN_KEY = 'core:dailyScore:lastShownDate'

function todayDateKey(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

function shouldShowDailyScore(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage?.getItem(DAILY_SCORE_LAST_SHOWN_KEY) !== todayDateKey()
  } catch {
    return false
  }
}

export function App() {
  const isWorkFocusMiniRoute =
    typeof window !== 'undefined' && window.location.hash.includes('/work/focus-mini')
  const [ready, setReady] = useState(false)
  const [safeMode] = useState(isSafeModeRequested)
  const [locked, setLocked] = useState(false)
  const [lockChecked, setLockChecked] = useState(false)
  const [showDailyScore, setShowDailyScore] = useState<boolean>(shouldShowDailyScore)

  const dismissDailyScore = () => {
    try { window.localStorage?.setItem(DAILY_SCORE_LAST_SHOWN_KEY, todayDateKey()) } catch { /* ignore */ }
    setShowDailyScore(false)
  }

  const openCopilotFromDailyScore = () => {
    dismissDailyScore()
    try { window.dispatchEvent(new CustomEvent('copilot:open')) } catch { /* ignore */ }
  }
  const authStatus = useAuthStore((s) => s.status)
  const initializeSession = useAuthStore((s) => s.initializeSession)
  const currentUser = useAuthStore((s) => s.currentUser)
  useCoreStore((s) => s.activePlugins)
  useCoreStore((s) => s.pluginUiVersion)
  const onboardingComplete = useCoreStore((s) => s.onboardingComplete)
  const loadFromStorage = useCoreStore((s) => s.loadFromStorage)
  const loadGamificationFromStorage = useGamificationStore((s) => s.loadFromStorage)

  const pluginPages = pluginManager.getActivePages()

  useEffect(() => {
    void initializeSession()
  }, [initializeSession])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser) {
      setReady(false)
      setLocked(false)
      setLockChecked(false)
      return
    }

    let cancelled = false
    async function checkLock() {
      try {
        const status = await window.dbEncryption.status()
        if (cancelled) return
        setLocked(Boolean(status.locked))
      } catch (err) {
        console.warn('[App] dbEncryption.status failed', err)
        if (!cancelled) setLocked(false)
      } finally {
        if (!cancelled) setLockChecked(true)
      }
    }
    void checkLock()
    return () => {
      cancelled = true
    }
  }, [authStatus, currentUser])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !currentUser) {
      setReady(false)
      return
    }
    if (!lockChecked || locked) {
      // Esperar a que se desbloquee la DB cifrada antes de inicializar plugins.
      return
    }

    async function bootstrap() {
      try {
        // Load persisted state first (onboarding flag, profile, activePlugins)
        await loadFromStorage()
        await loadGamificationFromStorage()

        // Register all plugins (but don't init yet)
        const allPlugins = getAvailablePlugins()
        for (const manifest of allPlugins) {
          pluginManager.register(manifest)
        }

        if (safeMode) {
          // Keep every plugin inactive; user can re-enable from ControlCenter.
          for (const manifest of allPlugins) {
            pluginManager.setPluginStatus(manifest.id, 'inactive')
          }
          console.warn('[App] Safe mode enabled: plugins will not be initialized.')
        } else {
          // Get active plugin IDs from store (loaded from storage)
          const activeIds = useCoreStore.getState().activePlugins

          // Initialize only the active plugins; deactivate others. Individual
          // plugin failures are captured by PluginManager and surfaced via
          // plugin.status === 'error', so one bad plugin cannot halt boot.
          for (const manifest of allPlugins) {
            if (activeIds.includes(manifest.id)) {
              await pluginManager.initPlugin(manifest.id)
            } else {
              pluginManager.setPluginStatus(manifest.id, 'inactive')
            }
          }
        }

        // Boot core services that depend on the active user DB
        await automationsService.init().catch((err) => console.error('[App] automations init failed', err))
        await notificationsService.init().catch((err) => console.error('[App] notifications init failed', err))

        // Run consistency auditor (best-effort, no bloquea boot).
        void import('@core/audit/store')
          .then(({ useAuditStore }) => useAuditStore.getState().runAudit())
          .catch((err) => console.warn('[App] audit run failed', err))
      } catch (err) {
        console.error('[App] Bootstrap failed:', err)
      } finally {
        setReady(true)
      }
    }
    void bootstrap()
  }, [authStatus, currentUser, loadFromStorage, loadGamificationFromStorage, safeMode, lockChecked, locked])

  if (authStatus === 'checking') {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1d0e3d_0%,_#110a24_42%,_#07060d_100%)] text-white">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-light/10 blur-3xl" />
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <NoraLogoMark size={56} glow className="mx-auto mb-3 animate-pulse" />
          <p className="text-base font-medium">{messages.loading.checkingSession}</p>
        </div>
      </div>
    )
  }

  if (authStatus !== 'authenticated') {
    return <AuthScreen />
  }

  if (locked) {
    return (
      <UnlockScreen
        onUnlocked={() => {
          setLocked(false)
        }}
      />
    )
  }

  if (!ready) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#1d0e3d_0%,_#110a24_42%,_#07060d_100%)] text-white">
        <div className="pointer-events-none absolute -left-32 top-1/4 h-[480px] w-[480px] rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full bg-accent-light/10 blur-3xl" />
        <div className="relative rounded-2xl border border-white/10 bg-surface-light/70 px-10 py-8 text-center shadow-2xl backdrop-blur">
          <NoraLogoMark size={64} glow className="mx-auto mb-4 animate-pulse" />
          <p className="mt-2 text-base font-medium">{messages.loading.initializing}</p>
          <p className="mt-1 text-sm text-muted">{messages.loading.initializingDetail}</p>
        </div>
      </div>
    )
  }

  return (
    <GlobalErrorBoundary>
      <ToastProvider>
        <ErrorBoundary label="app-root">
          <HashRouter>
            {ready && !onboardingComplete && !isWorkFocusMiniRoute && <OnboardingWizard />}
            {ready && onboardingComplete && showDailyScore && !isWorkFocusMiniRoute && (
              <DailyScoreScreen
                onDismiss={dismissDailyScore}
                onOpenCopilot={openCopilotFromDailyScore}
              />
            )}
            {!isWorkFocusMiniRoute && <CommandPalette />}
            {ready && !isWorkFocusMiniRoute && <WorkFocusCommandHost />}
            {safeMode && !isWorkFocusMiniRoute && (
              <div
                role="status"
                className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-amber-400/40 bg-amber-500/15 px-4 py-1.5 text-xs font-medium text-amber-100 shadow-lg backdrop-blur"
              >
                Modo seguro activo — plugins desactivados
              </div>
            )}
            <Routes>
              <Route path="/work/focus-mini" element={<Suspense fallback={<RouteFallback />}><WorkFocusMiniPage /></Suspense>} />
              <Route element={<Shell />}>
                <Route index element={<Dashboard />} />
                <Route path="/control" element={<Suspense fallback={<RouteFallback />}><ControlCenter /></Suspense>} />
                <Route path="/notes" element={<Suspense fallback={<RouteFallback />}><CoreNotesPage /></Suspense>} />
                <Route path="/links" element={<Suspense fallback={<RouteFallback />}><CoreLinksPage /></Suspense>} />
                <Route path="/planner" element={<Suspense fallback={<RouteFallback />}><CorePlannerPage /></Suspense>} />
                <Route path="/calendar" element={<Suspense fallback={<RouteFallback />}><CalendarPage /></Suspense>} />
                <Route path="/review" element={<Suspense fallback={<RouteFallback />}><ReviewPage /></Suspense>} />
                <Route path="/shortcuts" element={<Suspense fallback={<RouteFallback />}><ShortcutsPage /></Suspense>} />
                <Route path="/themes" element={<Suspense fallback={<RouteFallback />}><ThemeGalleryPage /></Suspense>} />
                <Route path="/profile" element={<Suspense fallback={<RouteFallback />}><ProfilePage /></Suspense>} />
                {pluginPages.map((page) => {
                  const PageComponent = page.component
                  return (
                    <Route
                      key={page.id}
                      path={page.path}
                      element={
                        <ErrorBoundary label={`plugin:${page.pluginId}`}>
                          <Suspense fallback={<RouteFallback />}>
                            <PageComponent />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  )
                })}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </HashRouter>
        </ErrorBoundary>
      </ToastProvider>
    </GlobalErrorBoundary>
  )
}
