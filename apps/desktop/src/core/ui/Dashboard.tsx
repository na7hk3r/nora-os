import { type ComponentType, type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  closestCorners,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
  type MeasuringConfiguration,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  defaultAnimateLayoutChanges,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  type AnimateLayoutChanges,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Maximize2,
  Minimize2,
  Puzzle,
  SlidersHorizontal,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { pluginManager } from '../plugins/PluginManager'
import { SystemStatusHero } from './SystemStatusHero'
import { QuickActionsBar } from './QuickActionsBar'
import { TodayFocus } from './TodayFocus'
import { RecentActivityFeed } from './RecentActivityFeed'
import { DashboardFooter } from './DashboardFooter'
import { PluginIcon } from './components/PluginIcon'
import { useCoreStore } from '../state/coreStore'
import { resolveI18nString, useI18n } from '@core/i18n'

const DASHBOARD_LAYOUT_SETTINGS_KEY = 'dashboardLayoutState'
const PROGRESS_MOVED_NOTICE_KEY = 'core:progressMoved:notified:v1'
const ACTIVITY_TILE_ID = 'activity-feed'

export interface DashboardTileSize {
  w: number
  h: number
}

interface DashboardLayoutState {
  collapsedModules: Record<string, boolean>
  expandedModuleId: string | null
  activityCollapsed: boolean
  tileOrder?: string[]
  widgetOrder?: string[]
}

interface DashboardTile {
  id: string
  kind: 'widget' | 'activity'
  title: string
  path?: string
  component?: ComponentType
  expanded?: boolean
  compact?: boolean
  size: DashboardTileSize
}

const DEFAULT_TILE_SIZE: DashboardTileSize = { w: 1, h: 1 }
const ACTIVITY_TILE_SIZE: DashboardTileSize = { w: 1, h: 2 }
const noop = () => undefined
const DASHBOARD_SORTABLE_TRANSITION = {
  duration: 190,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
}
const DASHBOARD_DROP_ANIMATION: DropAnimation = {
  duration: 180,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.18',
      },
    },
  }),
}
const DASHBOARD_DND_MEASURING: MeasuringConfiguration = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
}

const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'dashboard-tile-w-1',
  2: 'dashboard-tile-w-2',
}

const ROW_SPAN_CLASSES: Record<number, string> = {
  1: 'row-span-3',
  2: 'row-span-6',
}

const TILE_HEIGHT_CLASSES: Record<number, string> = {
  1: 'min-h-[220px]',
  2: 'min-h-[456px]',
}
const COMPACT_TILE_HEIGHT_CLASS = 'row-span-1 min-h-[64px]'

const animateDashboardLayoutChanges: AnimateLayoutChanges = (args) => {
  if (args.isSorting) return true
  return defaultAnimateLayoutChanges(args)
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function sanitizeDashboardTileIds(validIds: string[], order: string[]): string[] {
  const valid = new Set(validIds)
  const seen = new Set<string>()
  const sanitized: string[] = []

  for (const id of order) {
    if (!valid.has(id) || seen.has(id)) continue
    sanitized.push(id)
    seen.add(id)
  }

  for (const id of validIds) {
    if (!seen.has(id)) sanitized.push(id)
  }

  return sanitized
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index])
}

function splitTileIdKey(key: string): string[] {
  return key ? key.split('|') : []
}

export function sanitizeDashboardTileOrder<T extends { id: string }>(
  tiles: T[],
  order: string[],
): string[] {
  return sanitizeDashboardTileIds(
    tiles.map((tile) => tile.id),
    order,
  )
}

export function orderDashboardTiles<T extends { id: string }>(tiles: T[], order: string[]): T[] {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]))
  return sanitizeDashboardTileOrder(tiles, order)
    .map((id) => byId.get(id))
    .filter((tile): tile is T => Boolean(tile))
}

export function reorderDashboardTileIds(
  tileIds: string[],
  activeId: string,
  overId: string,
): string[] {
  const oldIndex = tileIds.indexOf(activeId)
  const newIndex = tileIds.indexOf(overId)
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return tileIds
  return arrayMove(tileIds, oldIndex, newIndex)
}

export function getDashboardTileSize(
  size: Partial<DashboardTileSize> = DEFAULT_TILE_SIZE,
  expanded = false,
): DashboardTileSize {
  const base = {
    w: clampNumber(size.w, 1, 2, DEFAULT_TILE_SIZE.w),
    h: clampNumber(size.h, 1, 2, DEFAULT_TILE_SIZE.h),
  }

  if (!expanded) return base

  return { w: 2, h: 2 }
}

export function getDashboardTileSpanClasses(size: DashboardTileSize, compact = false): string {
  const safeSize = getDashboardTileSize(size)
  if (compact) return `${COL_SPAN_CLASSES[safeSize.w]} ${COMPACT_TILE_HEIGHT_CLASS}`

  const heightClass = TILE_HEIGHT_CLASSES[safeSize.h]
  return `${COL_SPAN_CLASSES[safeSize.w]} ${ROW_SPAN_CLASSES[safeSize.h]} ${heightClass}`
}

export function partitionWidgetsByCollapseState<T extends { id: string }>(
  widgets: T[],
  collapsedModules: Record<string, boolean>,
): { visibleWidgets: T[]; collapsedWidgets: T[] } {
  const visibleWidgets: T[] = []
  const collapsedWidgets: T[] = []

  for (const widget of widgets) {
    if (collapsedModules[widget.id]) collapsedWidgets.push(widget)
    else visibleWidgets.push(widget)
  }

  return { visibleWidgets, collapsedWidgets }
}

interface SortableDashboardTileProps {
  tile: DashboardTile
  activityCollapsed: boolean
  onNavigate: (path: string) => void
  onToggleActivity: () => void
  onToggleExpand: (id: string) => void
  onToggleModule: (id: string) => void
}

interface DashboardTileCardProps extends SortableDashboardTileProps {
  dragHandle: ReactNode
  isDragging?: boolean
  isDropTarget?: boolean
  isOverlay?: boolean
}

function DashboardTilePreview({ tile }: { tile: DashboardTile }) {
  const lineCount = tile.compact ? 1 : tile.kind === 'activity' ? 5 : tile.size.w > 1 ? 4 : 3

  return (
    <div className="mt-2 flex min-h-0 flex-1 flex-col justify-end gap-2" aria-hidden="true">
      {Array.from({ length: lineCount }).map((_, index) => (
        <div
          key={index}
          className={`h-2 rounded-full bg-muted/15 ${
            index % 3 === 0 ? 'w-10/12' : index % 3 === 1 ? 'w-7/12' : 'w-9/12'
          }`}
        />
      ))}
    </div>
  )
}

function DashboardTileCard({
  tile,
  activityCollapsed,
  onNavigate,
  onToggleActivity,
  onToggleExpand,
  onToggleModule,
  dragHandle,
  isDragging = false,
  isDropTarget = false,
  isOverlay = false,
}: DashboardTileCardProps) {
  const { t } = useI18n()
  const Component = tile.component

  return (
    <div
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg transition-[border-color,box-shadow,opacity,transform] duration-200 ease-out ${
        isOverlay
          ? 'cursor-grabbing border-accent/70 bg-surface-light shadow-2xl ring-1 ring-accent/40 scale-[1.01]'
          : isDragging
            ? 'border-accent/30 opacity-20 shadow-none'
            : isDropTarget
              ? 'border-accent/60 shadow-xl ring-1 ring-accent/35'
              : 'hover:border-accent/40 hover:shadow-xl'
      }`}
    >
      <div className="mb-3 flex w-full flex-wrap items-start justify-between gap-2 text-left">
        <div className="flex min-w-0 items-start gap-2">
          {dragHandle}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-muted transition-colors group-hover:text-accent-light">
              {tile.title}
            </h3>
            {tile.kind === 'activity' && !isOverlay && (
              <button
                type="button"
                onClick={() => onNavigate('/review')}
                className="mt-0.5 text-left text-micro text-muted/70 transition-colors hover:text-accent-light"
              >
                {t.dashboard.fullHistory}
              </button>
            )}
          </div>
        </div>

        {!isOverlay && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
            {tile.kind === 'widget' && tile.path && (
              <button
                type="button"
                onClick={() => onNavigate(tile.path!)}
                className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-micro text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
              >
                {t.dashboard.viewModule}
              </button>
            )}
            {tile.kind === 'widget' && (
              <>
                <button
                  type="button"
                  onClick={() => onToggleExpand(tile.id)}
                  className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-micro text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                  title={tile.expanded ? t.dashboard.restoreSize(tile.title) : t.dashboard.expandModule}
                  aria-label={
                    tile.expanded ? t.dashboard.restoreSize(tile.title) : t.dashboard.expandTile(tile.title)
                  }
                >
                  {tile.expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleModule(tile.id)}
                  className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-micro text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                  title={t.dashboard.collapseModule}
                  aria-label={t.dashboard.collapseTile(tile.title)}
                >
                  <ChevronUp size={13} />
                </button>
              </>
            )}
            {tile.kind === 'activity' && (
              <button
                type="button"
                onClick={onToggleActivity}
                className="shrink-0 rounded-md border border-border/70 px-2 py-1 text-micro text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                title={activityCollapsed ? t.dashboard.expandModule : t.dashboard.collapseModule}
                aria-label={
                  activityCollapsed ? t.dashboard.expandTile(t.dashboard.recentActivity) : t.dashboard.collapseTile(t.dashboard.recentActivity)
                }
              >
                {activityCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
              </button>
            )}
          </div>
        )}
      </div>

      {isOverlay && <DashboardTilePreview tile={tile} />}

      {!isOverlay && tile.kind === 'widget' && Component && (
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
        >
          <Component />
        </div>
      )}

      {!isOverlay && tile.kind === 'activity' && !activityCollapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <RecentActivityFeed compact />
        </div>
      )}
    </div>
  )
}

function SortableDashboardTile(props: SortableDashboardTileProps) {
  const { tile } = props
  const { t } = useI18n()
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id: tile.id,
    animateLayoutChanges: animateDashboardLayoutChanges,
    transition: DASHBOARD_SORTABLE_TRANSITION,
  })

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
    willChange: transform ? 'transform' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`min-h-0 ${getDashboardTileSpanClasses(tile.size, tile.compact)} ${isDragging ? 'relative' : ''}`}
      data-dashboard-tile={tile.id}
    >
      <DashboardTileCard
        {...props}
        isDragging={isDragging}
        isDropTarget={isOver && !isDragging}
        dragHandle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 text-muted/55 transition-colors hover:bg-surface-lighter hover:text-accent-light active:cursor-grabbing"
            aria-label={t.dashboard.moveTile(tile.title)}
            title={t.sidebar.dragToReorder}
            data-dashboard-drag-handle={tile.id}
          >
            <GripVertical size={14} />
          </button>
        }
      />
    </div>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const { t, language } = useI18n()
  useCoreStore((s) => s.pluginUiVersion)
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({})
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null)
  const [activityCollapsed, setActivityCollapsed] = useState(false)
  const [tileOrder, setTileOrder] = useState<string[]>([])
  const [layoutLoaded, setLayoutLoaded] = useState(false)
  const [activeTileId, setActiveTileId] = useState<string | null>(null)
  const [activeTileRect, setActiveTileRect] = useState<{ width: number; height: number } | null>(
    null,
  )
  const [progressNoticeDismissed, setProgressNoticeDismissed] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(PROGRESS_MOVED_NOTICE_KEY) === '1'
  })

  const dismissProgressNotice = () => {
    setProgressNoticeDismissed(true)
    try {
      window.localStorage.setItem(PROGRESS_MOVED_NOTICE_KEY, '1')
    } catch {
      // ignore
    }
  }

  const widgets = pluginManager.getActiveWidgets()
  const navItems = pluginManager.getActiveNavItems()
  const allPlugins = pluginManager.getAllPlugins()
  const activeTileIdKey = [...widgets.map((widget) => widget.id), ACTIVITY_TILE_ID].join('|')

  const orderedWidgets = orderDashboardTiles(widgets, tileOrder)
  const { visibleWidgets, collapsedWidgets } = partitionWidgetsByCollapseState(
    orderedWidgets,
    collapsedModules,
  )

  const pluginPath: Record<string, string> = {}
  for (const item of navItems) {
    if (!pluginPath[item.pluginId]) pluginPath[item.pluginId] = item.path
  }

  const activityTile: DashboardTile = {
    id: ACTIVITY_TILE_ID,
    kind: 'activity',
    title: t.dashboard.recentActivity,
    path: '/review',
    compact: activityCollapsed,
    size: getDashboardTileSize(activityCollapsed ? DEFAULT_TILE_SIZE : ACTIVITY_TILE_SIZE),
  }

  const dashboardTiles = orderDashboardTiles(
    [
      ...visibleWidgets.map((widget): DashboardTile => {
        const expanded = expandedModuleId === widget.id
        return {
          id: widget.id,
          kind: 'widget',
          title: resolveI18nString(language, widget.title, widget.titleKey ?? `plugins.widgets.${widget.id}`),
          path: pluginPath[widget.pluginId],
          component: widget.component,
          expanded,
          size: getDashboardTileSize(widget.defaultSize, expanded),
        }
      }),
      activityTile,
    ],
    tileOrder,
  )
  const activeTile = activeTileId
    ? (dashboardTiles.find((tile) => tile.id === activeTileId) ?? null)
    : null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const toggleModule = (id: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))

    if (expandedModuleId === id) {
      setExpandedModuleId(null)
    }
  }

  const toggleExpandModule = (id: string) => {
    setExpandedModuleId((prev) => (prev === id ? null : id))
    setCollapsedModules((prev) => ({
      ...prev,
      [id]: false,
    }))
  }

  const clearActiveTile = () => {
    setActiveTileId(null)
    setActiveTileRect(null)
  }

  const handleTileDragStart = (event: DragStartEvent) => {
    const rect = event.active.rect.current.initial
    setActiveTileId(String(event.active.id))
    setActiveTileRect(rect ? { width: rect.width, height: rect.height } : null)
  }

  const handleTileDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTileOrder((prev) => {
        const activeTileIds = splitTileIdKey(activeTileIdKey)
        const sanitized = sanitizeDashboardTileIds(activeTileIds, prev)
        return reorderDashboardTileIds(sanitized, String(active.id), String(over.id))
      })
    }
    clearActiveTile()
  }

  useEffect(() => {
    if (!window.storage) {
      setLayoutLoaded(true)
      return
    }

    let cancelled = false

    void window.storage
      .query(`SELECT value FROM settings WHERE key = ? LIMIT 1`, [DASHBOARD_LAYOUT_SETTINGS_KEY])
      .then((rows) => {
        if (cancelled) return

        const list = rows as { value: string }[]
        const raw = list[0]?.value
        if (!raw) return

        const parsed = JSON.parse(raw) as Partial<DashboardLayoutState>
        if (parsed.collapsedModules && typeof parsed.collapsedModules === 'object') {
          setCollapsedModules(parsed.collapsedModules)
        }
        if (typeof parsed.expandedModuleId === 'string' || parsed.expandedModuleId === null) {
          setExpandedModuleId(parsed.expandedModuleId)
        }
        if (typeof parsed.activityCollapsed === 'boolean') {
          setActivityCollapsed(parsed.activityCollapsed)
        }

        const nextTileOrder = toStringList(parsed.tileOrder)
        setTileOrder(nextTileOrder.length > 0 ? nextTileOrder : toStringList(parsed.widgetOrder))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLayoutLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!layoutLoaded) return

    const activeTileIds = splitTileIdKey(activeTileIdKey)
    setTileOrder((prev) => {
      const next = sanitizeDashboardTileIds(activeTileIds, prev)
      return areStringArraysEqual(prev, next) ? prev : next
    })

    if (expandedModuleId && !activeTileIds.includes(expandedModuleId)) {
      setExpandedModuleId(null)
    }
  }, [activeTileIdKey, expandedModuleId, layoutLoaded])

  useEffect(() => {
    if (!layoutLoaded || !window.storage) return

    const payload: DashboardLayoutState = {
      collapsedModules,
      expandedModuleId,
      activityCollapsed,
      tileOrder,
    }

    void window.storage.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [
      DASHBOARD_LAYOUT_SETTINGS_KEY,
      JSON.stringify(payload),
    ])
  }, [activityCollapsed, collapsedModules, expandedModuleId, layoutLoaded, tileOrder])

  return (
    <div className="space-y-5">
      {!progressNoticeDismissed && (
        <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <TrendingUp size={16} className="mt-0.5 shrink-0 text-accent-light" />
          <div className="flex-1">
            <p className="text-foreground">
              {t.dashboard.progressMovedPrefix}{' '}
              <Link
                to="/review"
                className="font-semibold text-accent-light underline-offset-2 hover:underline"
              >
                {t.dashboard.progressMovedLink}
              </Link>
              {t.dashboard.progressMovedSuffix}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissProgressNotice}
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-lighter hover:text-white"
            aria-label={t.dashboard.closeNotice}
            title={t.common.close}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <SystemStatusHero />
      <QuickActionsBar />
      <TodayFocus />

      {widgets.length > 0 ? (
        <div className="space-y-3">
          {collapsedWidgets.length > 0 && (
            <div className="workspace-auto-grid-sm gap-2">
              {collapsedWidgets.map((widget) => {
                const path = pluginPath[widget.pluginId]
                return (
                  <div
                    key={widget.id}
                    className="flex min-h-[54px] min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-light/70 px-3 py-2 shadow-md"
                  >
                    <h3 className="min-w-0 truncate text-sm font-medium text-muted">
                      {widget.title}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      {path && (
                        <button
                          type="button"
                          onClick={() => navigate(path)}
                          className="rounded-md border border-border/70 px-2 py-1 text-micro text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                        >
                          {t.dashboard.viewModule}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleModule(widget.id)}
                        className="rounded-md border border-border/70 px-2 py-1 text-micro text-muted transition-colors hover:border-accent/40 hover:text-accent-light"
                        title="Restaurar módulo"
                        aria-label={`Restaurar ${widget.title}`}
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            measuring={DASHBOARD_DND_MEASURING}
            onDragStart={handleTileDragStart}
            onDragCancel={clearActiveTile}
            onDragEnd={handleTileDragEnd}
          >
            <SortableContext
              items={dashboardTiles.map((tile) => tile.id)}
              strategy={rectSortingStrategy}
            >
              <div className="dashboard-grid gap-4">
                {dashboardTiles.map((tile) => (
                  <SortableDashboardTile
                    key={tile.id}
                    tile={tile}
                    activityCollapsed={activityCollapsed}
                    onNavigate={navigate}
                    onToggleActivity={() => setActivityCollapsed((prev) => !prev)}
                    onToggleExpand={toggleExpandModule}
                    onToggleModule={toggleModule}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay adjustScale={false} dropAnimation={DASHBOARD_DROP_ANIMATION} zIndex={70}>
              {activeTile && (
                <div
                  className="pointer-events-none"
                  style={
                    activeTileRect
                      ? {
                          width: activeTileRect.width,
                          minHeight: activeTileRect.height,
                        }
                      : undefined
                  }
                >
                  <DashboardTileCard
                    tile={activeTile}
                    activityCollapsed={activityCollapsed}
                    onNavigate={navigate}
                    onToggleActivity={noop}
                    onToggleExpand={noop}
                    onToggleModule={noop}
                    isOverlay
                    dragHandle={
                      <span className="mt-0.5 shrink-0 rounded-md p-1 text-accent-light">
                        <GripVertical size={14} />
                      </span>
                    }
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      ) : (
        <div className="workspace-auto-grid-lg gap-4">
          <div className="dashboard-tile-w-2 flex flex-col rounded-2xl border border-border bg-surface-light/60 p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
                <Puzzle size={24} className="text-muted" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white">{t.dashboard.noActiveModulesTitle}</p>
                <p className="text-sm text-muted">
                  {t.dashboard.noActiveModulesBody}
                </p>
              </div>
            </div>

            <div className="workspace-auto-grid gap-3 mt-6">
              {allPlugins.map((plugin) => (
                <div
                  key={plugin.manifest.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 ${
                      plugin.status === 'active' ? 'text-accent-light' : 'text-muted'
                    }`}
                  >
                    <PluginIcon name={plugin.manifest.icon} size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {resolveI18nString(language, plugin.manifest.name, plugin.manifest.nameKey ?? `plugins.meta.${plugin.manifest.id}.name`)}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {resolveI18nString(language, plugin.manifest.description, plugin.manifest.descriptionKey ?? `plugins.meta.${plugin.manifest.id}.description`)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 self-start rounded-full px-2 py-0.5 text-caption ${
                      plugin.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-slate-500/10 text-slate-400'
                    }`}
                  >
                    {plugin.status === 'active' ? t.common.active : t.common.inactive}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate('/control')}
              className="mt-6 flex items-center justify-center gap-2 self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent/85"
            >
              <SlidersHorizontal size={15} />
              {t.dashboard.goToSettings}
            </button>

            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
              <Zap size={12} className="text-accent-light" />
              {t.dashboard.pluginTip}
            </p>
          </div>

          <div>
            <div className="rounded-xl border border-border bg-surface-light/85 p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-muted">{t.dashboard.recentActivity}</h3>
              </div>
              <RecentActivityFeed compact />
            </div>
          </div>
        </div>
      )}

      <DashboardFooter />
    </div>
  )
}
