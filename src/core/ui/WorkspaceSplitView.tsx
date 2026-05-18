import { Suspense, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Columns2, GripVertical, X } from 'lucide-react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PluginIcon } from './components/PluginIcon'
import {
  findWorkspaceRoute,
  normalizeWorkspacePath,
  RouteFallback,
  useWorkspaceRoutes,
  type WorkspaceRouteDefinition,
} from './workspaceRoutes'
import { useWorkspaceLayout, type WorkspacePaneId } from './WorkspaceLayoutContext'
import { useI18n } from '@core/i18n'

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true
    return window.matchMedia('(min-width: 1024px)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  return isDesktop
}

function UnavailablePane({ path }: { path: string }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-light/55 p-6 text-center">
      <Columns2 className="h-5 w-5 text-muted" aria-hidden />
      <p className="text-sm font-medium text-white">{t.workspace.unavailableTitle}</p>
      <p className="max-w-sm text-xs text-muted">
        {t.workspace.unavailableDescription(path)}
      </p>
    </div>
  )
}

function SecondaryRouteRenderer({
  path,
  routes,
}: {
  path: string
  routes: WorkspaceRouteDefinition[]
}) {
  const route = findWorkspaceRoute(path, routes)
  if (!route) return <UnavailablePane path={normalizeWorkspacePath(path)} />

  const PageComponent = route.component
  return (
    <ErrorBoundary label={`workspace-secondary:${route.id}`}>
      <Suspense fallback={<RouteFallback />}>
        <PageComponent />
      </Suspense>
    </ErrorBoundary>
  )
}

function PaneHeader({
  pane,
  title,
  icon,
  active,
  canClose,
  onClose,
}: {
  pane: WorkspacePaneId
  title: string
  icon: string
  active: boolean
  canClose?: boolean
  onClose?: () => void
}) {
  const workspace = useWorkspaceLayout()
  const { t } = useI18n()
  const label = pane === 'primary' ? t.workspace.leftPane : t.workspace.rightPane

  return (
    <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-light/75 px-3">
      <button
        type="button"
        onClick={() => workspace.setActivePane(pane)}
        className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
          active ? 'bg-accent/15 text-accent-light' : 'text-muted hover:bg-surface hover:text-white'
        }`}
        aria-pressed={active}
      >
        <PluginIcon name={icon} size={14} className="shrink-0" />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold">{title}</span>
          <span className="block text-[10px] uppercase tracking-eyebrow text-muted">{label}</span>
        </span>
      </button>
      {canClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-white"
          aria-label={t.workspace.closeDual}
          title={t.workspace.closeDual}
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </header>
  )
}

function PaneFrame({
  pane,
  title,
  icon,
  children,
  canClose,
  basis,
}: {
  pane: WorkspacePaneId
  title: string
  icon: string
  children: ReactNode
  canClose?: boolean
  basis?: string
}) {
  const workspace = useWorkspaceLayout()
  const { t } = useI18n()
  const active = workspace.activePane === pane

  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-surface/40 shadow-xl transition-colors ${
        active ? 'border-accent/55 ring-1 ring-accent/20' : 'border-border'
      }`}
      style={basis ? { flexBasis: basis } : undefined}
      aria-label={t.workspace.paneLabel(pane)}
    >
      <PaneHeader
        pane={pane}
        title={title}
        icon={icon}
        active={active}
        canClose={canClose}
        onClose={workspace.closeDual}
      />
      <div className="workspace-pane-content min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
        {children}
      </div>
    </section>
  )
}

function MobilePaneSelector({
  primaryTitle,
  secondaryTitle,
}: {
  primaryTitle: string
  secondaryTitle: string
}) {
  const workspace = useWorkspaceLayout()
  const { t } = useI18n()
  return (
    <div className="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2 lg:hidden">
      <button
        type="button"
        onClick={() => workspace.setActivePane('primary')}
        className={`rounded-md border px-3 py-2 text-xs font-medium ${
          workspace.activePane === 'primary'
            ? 'border-accent/50 bg-accent/15 text-accent-light'
            : 'border-border bg-surface text-muted'
        }`}
      >
        {primaryTitle}
      </button>
      <button
        type="button"
        onClick={() => workspace.setActivePane('secondary')}
        className={`rounded-md border px-3 py-2 text-xs font-medium ${
          workspace.activePane === 'secondary'
            ? 'border-accent/50 bg-accent/15 text-accent-light'
            : 'border-border bg-surface text-muted'
        }`}
      >
        {secondaryTitle}
      </button>
      <button
        type="button"
        onClick={workspace.closeDual}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface text-muted hover:border-accent/40 hover:text-white"
        aria-label={t.workspace.closeDual}
        title={t.workspace.closeDual}
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function WorkspaceSplitView() {
  const workspace = useWorkspaceLayout()
  const { t } = useI18n()
  const location = useLocation()
  const routes = useWorkspaceRoutes()
  const isDesktop = useIsDesktop()
  const resizeRef = useRef<HTMLDivElement | null>(null)
  const primaryRoute = findWorkspaceRoute(location.pathname, routes)
  const secondaryRoute = findWorkspaceRoute(workspace.secondaryPath, routes)

  if (!workspace.dualEnabled) {
    return (
      <div data-testid="workspace-single-view" className="workspace-view h-full overflow-y-auto">
        <div className="workspace-pane-content workspace-shell-content mx-auto max-w-7xl p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    )
  }

  const primaryTitle = primaryRoute?.title ?? t.workspace.currentView
  const primaryIcon = primaryRoute?.icon ?? 'LayoutDashboard'
  const secondaryTitle = secondaryRoute?.title ?? t.workspace.unavailable
  const secondaryIcon = secondaryRoute?.icon ?? 'Columns2'

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()

    const onMove = (moveEvent: PointerEvent) => {
      const rect = resizeRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return
      const next = ((moveEvent.clientX - rect.left) / rect.width) * 100
      workspace.setSplitRatio(next)
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const primaryPane = (
    <PaneFrame
      pane="primary"
      title={primaryTitle}
      icon={primaryIcon}
      basis={`${workspace.splitRatio}%`}
    >
      <Outlet />
    </PaneFrame>
  )

  const secondaryPane = (
    <PaneFrame
      pane="secondary"
      title={secondaryTitle}
      icon={secondaryIcon}
      canClose
      basis={`${100 - workspace.splitRatio}%`}
    >
      <SecondaryRouteRenderer path={workspace.secondaryPath} routes={routes} />
    </PaneFrame>
  )

  return (
    <div data-testid="workspace-dual-view" className="flex h-full min-h-0 flex-col p-3 md:p-4">
      {!isDesktop && <MobilePaneSelector primaryTitle={primaryTitle} secondaryTitle={secondaryTitle} />}

      {isDesktop ? (
        <div ref={resizeRef} className="hidden min-h-0 flex-1 gap-2 lg:flex">
          {primaryPane}
          <button
            type="button"
            onPointerDown={startResize}
            className="flex w-3 shrink-0 cursor-col-resize items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-light hover:text-accent-light"
            aria-label={t.workspace.resizeDual}
            title={t.workspace.resizeDual}
          >
            <GripVertical size={14} aria-hidden />
          </button>
          {secondaryPane}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden lg:hidden">
          {workspace.activePane === 'secondary' ? secondaryPane : primaryPane}
        </div>
      )}
    </div>
  )
}
