import { NavLink } from 'react-router-dom'
import { useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Flame,
  ListTodo,
  TrendingUp,
  Keyboard,
  Settings,
  LogOut,
} from 'lucide-react'
import { useCoreStore } from '../state/coreStore'
import { pluginManager } from '../plugins/PluginManager'
import { eventBus } from '../events/EventBus'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { getLevelTier, getLevelTitle } from '@core/gamification/gamificationUtils'
import { useAuthStore } from '@core/state/authStore'
import { APP_VERSION } from '@core/utils/version'
import { PluginIcon } from './components/PluginIcon'
import { BrandIcon } from './components/BrandIcon'
import { NoraLogoMark } from './components/NoraLogo'
import { SystemSuggestions } from './SystemSuggestions'

function renderNavIcon(iconName: string, size = 18) {
  return <PluginIcon name={iconName} size={size} />
}

function hasPluginActivityToday(pluginId: string): boolean {
  const PLUGIN_EVENTS: Record<string, string[]> = {
    fitness: [
      'FITNESS_WEIGHT_RECORDED',
      'FITNESS_DAILY_ENTRY_SAVED',
      'FITNESS_MEAL_LOGGED',
      'FITNESS_WORKOUT_COMPLETED',
      'FITNESS_MEASUREMENT_SAVED',
      'WEIGHT_RECORDED',
      'DAILY_ENTRY_SAVED',
      'MEAL_LOGGED',
      'WORKOUT_COMPLETED',
      'MEASUREMENT_SAVED',
    ],
    work: [
      'WORK_TASK_CREATED',
      'WORK_TASK_COMPLETED',
      'WORK_TASK_MOVED',
      'WORK_NOTE_CREATED',
      'TASK_CREATED',
      'TASK_COMPLETED',
      'TASK_MOVED',
      'NOTE_CREATED',
    ],
  }
  const ONE_DAY = 86_400_000
  const cutoff = Date.now() - ONE_DAY
  const pluginEvents = new Set(PLUGIN_EVENTS[pluginId] ?? [])
  return eventBus
    .getHistory(100)
    .some((h) => h.timestamp >= cutoff && pluginEvents.has(h.event))
}

const NAV_LINK_CLASS = (isActive: boolean) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
    isActive
      ? 'bg-accent/15 text-accent font-semibold'
      : 'text-foreground/75 hover:bg-surface-lighter hover:text-foreground'
  }`

export function Sidebar() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const updateSettings = useCoreStore((s) => s.updateSettings)
  const profileName = useCoreStore((s) => s.profile.name)
  // Subscribed to force re-render when plugins are activated/deactivated; the
  // resulting `getActiveNavItems()` call below reads fresh data from PluginManager.
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const { points, level, streak } = useGamificationStore()
  const logout = useAuthStore((s) => s.logout)
  const headerTitle = profileName?.trim() ? profileName.trim().split(' ')[0] : 'Nora OS'
  const tier = getLevelTier(level)
  const levelTitle = getLevelTitle(level)
  const pointsInLevel = points % 100

  const TIER_STYLE: Record<string, string> = {
    bronze: 'from-xp-bronze to-amber-300 text-[#2a1808]',
    silver: 'from-xp-silver to-slate-200 text-[#1f2937]',
    gold: 'from-xp-gold to-yellow-200 text-[#3a2a00]',
    platinum: 'from-xp-platinum to-cyan-200 text-[#08212f]',
  }

  // Re-derive nav items whenever activePlugins changes; PluginManager registers/unregisters
  // navItems inside initPlugin/deactivatePlugin, so we use activePlugins as the trigger.
  const navItems = useMemo(
    () =>
      pluginManager
        .getActiveNavItems()
        .filter((item, index, arr) => arr.findIndex((candidate) => candidate.path === item.path) === index),
    [activePlugins],
  )

  const toggleCollapse = () => {
    updateSettings({ sidebarCollapsed: !sidebarCollapsed })
  }

  return (
    <aside
      role="complementary"
      aria-label="Navegación principal"
      className={`fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-surface-light/95 backdrop-blur-md transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!sidebarCollapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Logo oficial Nora OS — ver identidadVisual-noraOS/. */}
            <NoraLogoMark size={28} className="shrink-0 text-foreground/80" />
            <div className="min-w-0">
              <p className="truncate text-xs uppercase tracking-eyebrow text-muted font-display">Nora OS</p>
              <p className="truncate text-sm font-bold text-white">{headerTitle}</p>
            </div>
          </div>
        )}
        {sidebarCollapsed && (
          <NoraLogoMark size={32} className="shrink-0 text-foreground/80" />
        )}
        <button
          onClick={toggleCollapse}
          aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          aria-expanded={!sidebarCollapsed}
          className="shrink-0 rounded p-1 text-muted hover:bg-surface-lighter"
        >
          {sidebarCollapsed ? <ChevronRight size={18} aria-hidden /> : <ChevronLeft size={18} aria-hidden />}
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Secciones de la app" className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {/* Grupo: Principal */}
        {!sidebarCollapsed && (
          <p className="px-3 pb-1 text-micro uppercase tracking-eyebrow text-muted">Principal</p>
        )}
        <NavLink to="/" end className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <PluginIcon name="LayoutDashboard" size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Dashboard</span>}
        </NavLink>
        <NavLink to="/review" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <TrendingUp size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Progreso</span>}
        </NavLink>

        {/* Grupo: Módulos (plugins activos) */}
        {navItems.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <p className="px-3 pb-1 pt-3 text-micro uppercase tracking-eyebrow text-muted">Módulos</p>
            )}
            {navItems.map((item) => {
              const hasActivity = hasPluginActivityToday(item.pluginId)
              const isChild = !!item.parentId

              if (isChild) {
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    className={({ isActive }) =>
                      `relative flex items-center gap-2 rounded-md text-xs transition-all duration-200 ${
                        sidebarCollapsed ? 'justify-center px-3 py-2' : 'py-1.5 pl-8 pr-3'
                      } ${
                        isActive
                          ? 'bg-accent/10 text-accent-light'
                          : 'text-muted/70 hover:bg-surface-lighter/50 hover:text-muted'
                      }`
                    }
                  >
                    {sidebarCollapsed ? (
                      renderNavIcon(item.icon, 18)
                    ) : (
                      <>
                        <span className="text-micro text-muted/40">└</span>
                        <span className="text-muted/80">{renderNavIcon(item.icon, 14)}</span>
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                )
              }

              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  end
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-accent/15 text-accent font-semibold'
                        : 'text-foreground/80 hover:bg-surface-lighter hover:text-foreground'
                    }`
                  }
                >
                  <span className="relative shrink-0 text-base leading-none">
                    {renderNavIcon(item.icon, 18)}
                    {hasActivity && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-surface-light bg-success" />
                    )}
                  </span>
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              )
            })}
          </>
        )}

        {/* Grupo: Herramientas (peso visual menor) */}
        {!sidebarCollapsed && (
          <p className="px-3 pb-1 pt-3 text-micro uppercase tracking-eyebrow text-muted">Herramientas</p>
        )}
        <NavLink to="/notes" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <PluginIcon name="NotebookPen" size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Notas</span>}
        </NavLink>
        <NavLink to="/links" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <PluginIcon name="Link2" size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Enlaces</span>}
        </NavLink>
        <NavLink to="/planner" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <ListTodo size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Planner</span>}
        </NavLink>
        <NavLink to="/calendar" className={({ isActive }) => NAV_LINK_CLASS(isActive)}>
          <CalendarDays size={18} className="shrink-0" />
          {!sidebarCollapsed && <span className="truncate">Calendario</span>}
        </NavLink>
      </nav>

      {/* Gamification mini widget (compacto: badge + barra + streak) */}
      {!sidebarCollapsed && (
        <NavLink
          to="/review"
          className="mx-2 mb-2 block rounded-xl border border-border bg-surface/60 p-2.5 transition-colors hover:border-accent/40"
          title={`Nivel ${level} · ${levelTitle} · ${points} puntos· Ver progreso completo`}
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br text-xs font-black shadow ${TIER_STYLE[tier]}`}
            >
              {level}
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-lighter">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
                style={{ width: `${pointsInLevel}%` }}
              />
            </div>
            {streak > 0 && (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-warning" title={`Racha de ${streak} días`}>
                <Flame size={12} />
                {streak}
              </span>
            )}
          </div>
        </NavLink>
      )}

      {/* Footer */}
      <div className="border-t border-border p-3 text-center text-xs text-muted">
        {!sidebarCollapsed && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <NavLink
                to="/control"
                className={({ isActive }) =>
                  `flex flex-1 items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    isActive
                      ? 'border-accent/60 bg-accent/15 text-accent-light'
                      : 'border-border bg-surface text-muted hover:border-accent/40 hover:text-white'
                  }`
                }
                title="Configuración"
              >
                <Settings size={14} />
                Config
              </NavLink>
              <SystemSuggestions />
              <button
                onClick={() => void logout()}
                className="flex items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-white"
                title="Salir"
                aria-label="Cerrar sesión"
              >
                <LogOut size={14} />
              </button>
            </div>
            <NavLink
              to="/shortcuts"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-white"
              title="Atajos de teclado"
            >
              <Keyboard size={14} />
              Atajos
            </NavLink>
            <div className="flex items-center justify-center gap-10 opacity-80" title={`Nora OS v${APP_VERSION}`}>
              <NoraLogoMark variant="wordmark" size={12} />
              <span>v{APP_VERSION}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
