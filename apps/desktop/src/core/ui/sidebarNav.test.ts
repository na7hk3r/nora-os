import { describe, expect, it } from 'vitest'
import type { NavItemDefinition } from '@core/types'
import { canReorderSidebarModules, groupPluginNavItems, sanitizeSidebarNavState } from './sidebarNav'

const navItems: NavItemDefinition[] = [
  { id: 'work-notes-nav', pluginId: 'work', label: 'Notas', icon: 'SquarePen', path: '/work/notes', order: 22, parentId: 'work-nav' },
  { id: 'finance-nav', pluginId: 'finance', label: 'Finanzas', icon: 'Wallet', path: '/finance', order: 30 },
  { id: 'work-nav', pluginId: 'work', label: 'Work', icon: 'BriefcaseBusiness', path: '/work', order: 20 },
  { id: 'finance-tx-nav', pluginId: 'finance', label: 'Movimientos', icon: 'Receipt', path: '/finance/transactions', order: 31, parentId: 'finance-nav' },
  { id: 'fitness-nav', pluginId: 'fitness', label: 'Fitness', icon: 'Dumbbell', path: '/fitness', order: 10 },
]

describe('sidebarNav helpers', () => {
  it('groups child pages under their plugin parent using fallback order', () => {
    const groups = groupPluginNavItems(navItems)

    expect(groups.map((group) => group.parent.pluginId)).toEqual(['fitness', 'work', 'finance'])
    expect(groups.find((group) => group.parent.pluginId === 'work')?.children.map((child) => child.id)).toEqual([
      'work-notes-nav',
    ])
    expect(groups.find((group) => group.parent.pluginId === 'finance')?.children.map((child) => child.id)).toEqual([
      'finance-tx-nav',
    ])
  })

  it('applies custom module order by plugin id', () => {
    const groups = groupPluginNavItems(navItems, ['finance', 'fitness', 'work'])

    expect(groups.map((group) => group.parent.pluginId)).toEqual(['finance', 'fitness', 'work'])
  })

  it('sanitizes persisted order and collapsed ids against active modules', () => {
    const state = sanitizeSidebarNavState(
      {
        moduleOrder: ['missing', 'finance'],
        moduleOrderLocked: false,
        collapsedPluginIds: ['work', 'missing'],
      },
      ['fitness', 'work', 'finance'],
    )

    expect(state).toEqual({
      moduleOrder: ['finance', 'fitness', 'work'],
      moduleOrderLocked: false,
      collapsedPluginIds: ['work'],
    })
  })

  it('only allows module reorder controls when two or more modules exist', () => {
    expect(canReorderSidebarModules(0)).toBe(false)
    expect(canReorderSidebarModules(1)).toBe(false)
    expect(canReorderSidebarModules(2)).toBe(true)
  })
})
