import type { NavItemDefinition } from '@core/types'

export interface SidebarNavState {
  moduleOrder: string[]
  moduleOrderLocked: boolean
  collapsedPluginIds: string[]
}

export interface SidebarModuleGroup {
  parent: NavItemDefinition
  children: NavItemDefinition[]
}

export const SIDEBAR_NAV_SETTINGS_KEY = 'sidebarNavState:v1'

export const DEFAULT_SIDEBAR_NAV_STATE: SidebarNavState = {
  moduleOrder: [],
  moduleOrderLocked: true,
  collapsedPluginIds: [],
}

export function canReorderSidebarModules(moduleCount: number): boolean {
  return moduleCount > 1
}

function sortByOrder(left: NavItemDefinition, right: NavItemDefinition): number {
  return (left.order ?? 99) - (right.order ?? 99)
}

export function dedupeNavItems(navItems: NavItemDefinition[]): NavItemDefinition[] {
  return navItems.filter(
    (item, index, arr) => arr.findIndex((candidate) => candidate.path === item.path) === index,
  )
}

export function groupPluginNavItems(
  navItems: NavItemDefinition[],
  moduleOrder: string[] = [],
): SidebarModuleGroup[] {
  const uniqueItems = dedupeNavItems(navItems).sort(sortByOrder)
  const parents = uniqueItems.filter((item) => !item.parentId)
  const parentIds = new Set(parents.map((item) => item.id))
  const childrenByParent = new Map<string, NavItemDefinition[]>()

  for (const item of uniqueItems) {
    if (!item.parentId || !parentIds.has(item.parentId)) continue
    const children = childrenByParent.get(item.parentId) ?? []
    children.push(item)
    childrenByParent.set(item.parentId, children)
  }

  const orderIndex = new Map(moduleOrder.map((pluginId, index) => [pluginId, index]))

  return parents
    .map((parent) => ({
      parent,
      children: (childrenByParent.get(parent.id) ?? []).sort(sortByOrder),
    }))
    .sort((left, right) => {
      const leftIndex = orderIndex.get(left.parent.pluginId)
      const rightIndex = orderIndex.get(right.parent.pluginId)

      if (leftIndex != null && rightIndex != null) return leftIndex - rightIndex
      if (leftIndex != null) return -1
      if (rightIndex != null) return 1
      return sortByOrder(left.parent, right.parent)
    })
}

export function sanitizeSidebarNavState(
  state: Partial<SidebarNavState> | null | undefined,
  moduleIds: string[],
): SidebarNavState {
  const moduleIdSet = new Set(moduleIds)
  const collapsedPluginIdSet = new Set(moduleIds)
  const order = Array.isArray(state?.moduleOrder)
    ? state.moduleOrder.filter((id): id is string => typeof id === 'string' && moduleIdSet.has(id))
    : []
  const collapsedPluginIds = Array.isArray(state?.collapsedPluginIds)
    ? state.collapsedPluginIds.filter((id): id is string => typeof id === 'string' && collapsedPluginIdSet.has(id))
    : []

  return {
    moduleOrder: [...order, ...moduleIds.filter((id) => !order.includes(id))],
    moduleOrderLocked: typeof state?.moduleOrderLocked === 'boolean'
      ? state.moduleOrderLocked
      : DEFAULT_SIDEBAR_NAV_STATE.moduleOrderLocked,
    collapsedPluginIds,
  }
}
