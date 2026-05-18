import { lazy, useMemo, type ComponentType } from 'react'
import type { PageDefinition } from '@core/types'
import { pluginManager } from '@core/plugins/PluginManager'
import { useCoreStore } from '@core/state/coreStore'
import { resolveI18nString, useI18n, type AppLanguage } from '@core/i18n'
import { Dashboard } from './Dashboard'

const ControlCenter = lazy(() => import('./ControlCenter').then((m) => ({ default: m.ControlCenter })))
const CoreNotesPage = lazy(() => import('./pages/NotesPage').then((m) => ({ default: m.CoreNotesPage })))
const CoreLinksPage = lazy(() => import('./pages/LinksPage').then((m) => ({ default: m.CoreLinksPage })))
const CorePlannerPage = lazy(() => import('./pages/PlannerPage').then((m) => ({ default: m.CorePlannerPage })))
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))
const ReviewPage = lazy(() => import('./pages/ReviewPage').then((m) => ({ default: m.ReviewPage })))
const ShortcutsPage = lazy(() => import('./pages/ShortcutsPage').then((m) => ({ default: m.ShortcutsPage })))
const ThemeGalleryPage = lazy(() => import('./pages/ThemeGalleryPage').then((m) => ({ default: m.ThemeGalleryPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))

export interface WorkspaceRouteDefinition {
  id: string
  pluginId?: string
  path: string
  title: string
  titleKey?: string
  icon: string
  component: ComponentType
}

export const CORE_WORKSPACE_ROUTES: WorkspaceRouteDefinition[] = [
  { id: 'core-dashboard', pluginId: 'core', path: '/', title: 'Dashboard', titleKey: 'routes.core-dashboard', icon: 'LayoutDashboard', component: Dashboard },
  { id: 'core-control', pluginId: 'core', path: '/control', title: 'Configuracion', titleKey: 'routes.core-control', icon: 'Settings', component: ControlCenter },
  { id: 'core-notes', pluginId: 'core', path: '/notes', title: 'Notas', titleKey: 'routes.core-notes', icon: 'NotebookPen', component: CoreNotesPage },
  { id: 'core-links', pluginId: 'core', path: '/links', title: 'Enlaces', titleKey: 'routes.core-links', icon: 'Link2', component: CoreLinksPage },
  { id: 'core-planner', pluginId: 'core', path: '/planner', title: 'Planner', titleKey: 'routes.core-planner', icon: 'ListTodo', component: CorePlannerPage },
  { id: 'core-calendar', pluginId: 'core', path: '/calendar', title: 'Calendario', titleKey: 'routes.core-calendar', icon: 'CalendarDays', component: CalendarPage },
  { id: 'core-review', pluginId: 'core', path: '/review', title: 'Progreso', titleKey: 'routes.core-review', icon: 'TrendingUp', component: ReviewPage },
  { id: 'core-shortcuts', pluginId: 'core', path: '/shortcuts', title: 'Atajos de teclado', titleKey: 'routes.core-shortcuts', icon: 'Keyboard', component: ShortcutsPage },
  { id: 'core-themes', pluginId: 'core', path: '/themes', title: 'Temas', titleKey: 'routes.core-themes', icon: 'Palette', component: ThemeGalleryPage },
  { id: 'core-profile', pluginId: 'core', path: '/profile', title: 'Perfil', titleKey: 'routes.core-profile', icon: 'User', component: ProfilePage },
]

export function RouteFallback() {
  const { t } = useI18n()
  return (
    <div className="space-y-4 p-2" role="status" aria-label={t.common.loading}>
      <div className="h-24 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
        <div className="h-40 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl border border-border/60 bg-surface-light/40" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  )
}

export function normalizeWorkspacePath(path: string | null | undefined): string {
  if (!path || typeof path !== 'string') return '/'
  let normalized = path.trim()
  if (!normalized) return '/'
  if (normalized.startsWith('#')) normalized = normalized.slice(1)
  if (!normalized.startsWith('/')) normalized = `/${normalized}`
  const queryIndex = normalized.indexOf('?')
  if (queryIndex >= 0) normalized = normalized.slice(0, queryIndex)
  const hashIndex = normalized.indexOf('#')
  if (hashIndex >= 0) normalized = normalized.slice(0, hashIndex)
  normalized = normalized.replace(/\/{2,}/g, '/')
  return normalized || '/'
}

export function getWorkspaceRoutes(
  pluginPages: PageDefinition[] = pluginManager.getActivePages(),
  language?: AppLanguage,
): WorkspaceRouteDefinition[] {
  const byPath = new Map<string, WorkspaceRouteDefinition>()

  for (const route of CORE_WORKSPACE_ROUTES) {
    byPath.set(route.path, {
      ...route,
      title: language ? resolveI18nString(language, route.title, route.titleKey) : route.title,
    })
  }

  for (const page of pluginPages) {
    const path = normalizeWorkspacePath(page.path)
    if (path === '/work/focus-mini') continue
    byPath.set(path, {
      id: page.id,
      pluginId: page.pluginId,
      path,
      title: language
        ? resolveI18nString(language, page.title, page.titleKey ?? `plugins.pages.${page.id}`)
        : page.title,
      titleKey: page.titleKey,
      icon: page.icon,
      component: page.component,
    })
  }

  return Array.from(byPath.values())
}

export function useWorkspaceRoutes(): WorkspaceRouteDefinition[] {
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const pluginUiVersion = useCoreStore((s) => s.pluginUiVersion)
  const { language } = useI18n()

  return useMemo(() => getWorkspaceRoutes(undefined, language), [activePlugins, pluginUiVersion, language])
}

export function findWorkspaceRoute(
  path: string,
  routes: WorkspaceRouteDefinition[],
): WorkspaceRouteDefinition | null {
  const normalized = normalizeWorkspacePath(path)
  return routes.find((route) => route.path === normalized) ?? null
}

export function defaultSecondaryWorkspacePath(primaryPath = '/'): string {
  const normalized = normalizeWorkspacePath(primaryPath)
  if (normalized === '/notes') return '/work'
  return '/notes'
}
