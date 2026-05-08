import { NavLink } from 'react-router-dom'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CalendarDays,
  Flame,
  GripVertical,
  ListTodo,
  Lock,
  TrendingUp,
  Keyboard,
  Settings,
  LogOut,
  Unlock,
} from 'lucide-react'
import type { NavItemDefinition } from '@core/types'
import { useCoreStore } from '../state/coreStore'
import { pluginManager } from '../plugins/PluginManager'
import { eventBus } from '../events/EventBus'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { getLevelTier, getLevelTitle } from '@core/gamification/gamificationUtils'
import { useAuthStore } from '@core/state/authStore'
import { APP_VERSION } from '@core/utils/version'
import { PluginIcon } from './components/PluginIcon'
import { NoraLogoMark } from './components/NoraLogo'
import { SystemSuggestions } from './SystemSuggestions'
import { FeedbackLauncher } from './FeedbackLauncher'
import {
  DEFAULT_SIDEBAR_NAV_STATE,
  SIDEBAR_NAV_SETTINGS_KEY,
  groupPluginNavItems,
  sanitizeSidebarNavState,
  type SidebarModuleGroup,
  type SidebarNavState,
} from './sidebarNav'

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

interface ModuleGroupProps {
  group: SidebarModuleGroup
  sidebarCollapsed: boolean
  orderLocked: boolean
  childrenCollapsed: boolean
  hasActivity: boolean
  onToggleChildren: (pluginId: string) => void
}

function ChildNavLink({ item }: { item: NavItemDefinition }) {
  return (
    <NavLink
      key={item.id}
      to={item.path}
      className={({ isActive }) =>
        `relative flex items-center gap-2 rounded-md py-1.5 pl-8 pr-3 text-xs transition-all duration-200 ${
          isActive
            ? 'bg-accent/10 text-accent-light'
            : 'text-muted/70 hover:bg-surface-lighter/50 hover:text-muted'
        }`
      }
    >
      <span className="text-micro text-muted/40">-</span>
      <span className="text-muted/80">{renderNavIcon(item.icon, 14)}</span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

function ModuleGroup({
  group,
  sidebarCollapsed,
  orderLocked,
  childrenCollapsed,
  hasActivity,
  onToggleChildren,
}: ModuleGroupProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.parent.pluginId,
    disabled: orderLocked || sidebarCollapsed,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  }

  const hasChildren = group.children.length > 0

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div className="group/module flex items-center gap-1">
        {!orderLocked && !sidebarCollapsed && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            className="shrink-0 rounded-md p-1 text-muted/45 transition-colors hover:bg-surface-lighter hover:text-muted"
            aria-label={`Mover ${group.parent.label}`}
            title="Arrastrar para reordenar"
          >
            <GripVertical size={14} />
          </button>
        )}
        <NavLink
          key={group.parent.id}
          to={group.parent.path}
          end
          className={({ isActive }) =>
            `relative flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
              sidebarCollapsed ? 'justify-center' : ''
            } ${
              isActive
                ? 'bg-accent/15 text-accent font-semibold'
                : 'text-foreground/80 hover:bg-surface-lighter hover:text-foreground'
            }`
          }
        >
          <span className="relative shrink-0 text-base leading-none">
            {renderNavIcon(group.parent.icon, 18)}
            {hasActivity && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-surface-light bg-success" />
            )}
          </span>
          {!sidebarCollapsed && <span className="truncate">{group.parent.label}</span>}
        </NavLink>
        {!sidebarCollapsed && hasChildren && (
          <button
            type="button"
            onClick={() => onToggleChildren(group.parent.pluginId)}
            className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface-lighter hover:text-accent-light"
            aria-label={childrenCollapsed ? `Mostrar paginas de ${group.parent.label}` : `Ocultar paginas de ${group.parent.label}`}
            title={childrenCollapsed ? 'Mostrar paginas' : 'Ocultar paginas'}
          >
            {childrenCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
      </div>
      {!sidebarCollapsed && hasChildren && !childrenCollapsed && (
        <div className={orderLocked ? '' : 'ml-5'}>
          {group.children.map((item) => (
            <ChildNavLink key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const sidebarCollapsed = useCoreStore((s) => s.settings.sidebarCollapsed)
  const updateSettings = useCoreStore((s) => s.updateSettings)
  const profileName = useCoreStore((s) => s.profile.name)
  // Subscribed to force re-render when plugins are activated/deactivated; the
  // resulting `getActiveNavItems()` call below reads fresh data from PluginManager.
  const activePlugins = useCoreStore((s) => s.activePlugins)
  const { points, level, streak } = useGamificationStore()
  const logout = useAuthStore((s) => s.logout)
  const [sidebarNavState, setSidebarNavState] = useState<SidebarNavState>(DEFAULT_SIDEBAR_NAV_STATE)
  const [sidebarNavLoaded, setSidebarNavLoaded] = useState(false)
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
  const defaultNavGroups = useMemo(() => groupPluginNavItems(navItems), [navItems])
  const modulePluginIds = useMemo(
    () => defaultNavGroups.map((group) => group.parent.pluginId),
    [defaultNavGroups],
  )
  const modulePluginIdKey = modulePluginIds.join('|')
  const navGroups = useMemo(
    () => groupPluginNavItems(navItems, sidebarNavState.moduleOrder),
    [navItems, sidebarNavState.moduleOrder],
  )
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    let cancelled = false
    setSidebarNavLoaded(false)

    if (!window.storage) {
      setSidebarNavLoaded(true)
      return
    }

    void window.storage
      .query(
        `SELECT value FROM settings WHERE key = ? LIMIT 1`,
        [SIDEBAR_NAV_SETTINGS_KEY],
      )
      .then((rows) => {
        if (cancelled) return

        const list = rows as { value: string }[]
        const raw = list[0]?.value
        const parsed = raw ? JSON.parse(raw) as Partial<SidebarNavState> : DEFAULT_SIDEBAR_NAV_STATE
        setSidebarNavState((prev) => sanitizeSidebarNavState({ ...prev, ...parsed }, modulePluginIds))
      })
      .catch(() => {
        if (!cancelled) {
          setSidebarNavState((prev) => sanitizeSidebarNavState(prev, modulePluginIds))
        }
      })
      .finally(() => {
        if (!cancelled) setSidebarNavLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [modulePluginIdKey, modulePluginIds])

  useEffect(() => {
    setSidebarNavState((prev) => {
      const next = sanitizeSidebarNavState(prev, modulePluginIds)
      return JSON.stringify(next) === JSON.stringify(prev) ? prev : next
    })
  }, [modulePluginIdKey, modulePluginIds])

  useEffect(() => {
    if (!sidebarNavLoaded || !window.storage) return

    void window.storage.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
      [SIDEBAR_NAV_SETTINGS_KEY, JSON.stringify(sidebarNavState)],
    )
  }, [sidebarNavLoaded, sidebarNavState])

  const toggleCollapse = () => {
    updateSettings({ sidebarCollapsed: !sidebarCollapsed })
  }

  const toggleModuleOrderLock = () => {
    setSidebarNavState((prev) => ({
      ...prev,
      moduleOrderLocked: !prev.moduleOrderLocked,
    }))
  }

  const togglePluginChildren = (pluginId: string) => {
    setSidebarNavState((prev) => {
      const collapsed = new Set(prev.collapsedPluginIds)
      if (collapsed.has(pluginId)) {
        collapsed.delete(pluginId)
      } else {
        collapsed.add(pluginId)
      }

      return {
        ...prev,
        collapsedPluginIds: Array.from(collapsed),
      }
    })
  }

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (sidebarNavState.moduleOrderLocked || !over || active.id === over.id) return

    setSidebarNavState((prev) => {
      const current = sanitizeSidebarNavState(prev, modulePluginIds).moduleOrder
      const oldIndex = current.indexOf(String(active.id))
      const newIndex = current.indexOf(String(over.id))
      if (oldIndex < 0 || newIndex < 0) return prev

      return {
        ...prev,
        moduleOrder: arrayMove(current, oldIndex, newIndex),
      }
    })
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
        {navGroups.length > 0 && (
          <>
            {!sidebarCollapsed && (
              <div className="flex items-center justify-between gap-2 px-3 pb-1 pt-3">
                <p className="text-micro uppercase tracking-eyebrow text-muted">Módulos</p>
                <button
                  type="button"
                  onClick={toggleModuleOrderLock}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                  aria-label={sidebarNavState.moduleOrderLocked ? 'Desbloquear reordenamiento de modulos' : 'Bloquear reordenamiento de modulos'}
                  title={sidebarNavState.moduleOrderLocked ? 'Desbloquear reordenamiento' : 'Bloquear reordenamiento'}
                >
                  {sidebarNavState.moduleOrderLocked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleModuleDragEnd}
            >
              <SortableContext
                items={navGroups.map((group) => group.parent.pluginId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {navGroups.map((group) => (
                    <ModuleGroup
                      key={group.parent.id}
                      group={group}
                      sidebarCollapsed={sidebarCollapsed}
                      orderLocked={sidebarNavState.moduleOrderLocked}
                      childrenCollapsed={sidebarNavState.collapsedPluginIds.includes(group.parent.pluginId)}
                      hasActivity={hasPluginActivityToday(group.parent.pluginId)}
                      onToggleChildren={togglePluginChildren}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
        {sidebarCollapsed ? (
          <FeedbackLauncher collapsed />
        ) : (
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
            <FeedbackLauncher />
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
