import { describe, expect, it } from 'vitest'
import {
  getDashboardTileSpanClasses,
  getDashboardTileSize,
  orderDashboardTiles,
  partitionWidgetsByCollapseState,
  reorderDashboardTileIds,
  sanitizeDashboardTileOrder,
} from './Dashboard'

describe('dashboard layout helpers', () => {
  it('separates collapsed widgets from the main grid', () => {
    const widgets = [{ id: 'fitness-kpi' }, { id: 'work-summary' }, { id: 'finance-summary' }]

    const result = partitionWidgetsByCollapseState(widgets, {
      'work-summary': true,
    })

    expect(result.visibleWidgets.map((widget) => widget.id)).toEqual([
      'fitness-kpi',
      'finance-summary',
    ])
    expect(result.collapsedWidgets.map((widget) => widget.id)).toEqual(['work-summary'])
  })

  it('sanitizes persisted tile order and appends new tiles', () => {
    const tiles = [{ id: 'fitness-kpi' }, { id: 'work-summary' }, { id: 'activity-feed' }]

    expect(
      sanitizeDashboardTileOrder(tiles, [
        'missing-widget',
        'work-summary',
        'fitness-kpi',
        'work-summary',
      ]),
    ).toEqual(['work-summary', 'fitness-kpi', 'activity-feed'])
  })

  it('orders dashboard tiles from the sanitized persisted order', () => {
    const tiles = [{ id: 'fitness-kpi' }, { id: 'work-summary' }, { id: 'activity-feed' }]

    expect(
      orderDashboardTiles(tiles, ['activity-feed', 'fitness-kpi']).map((tile) => tile.id),
    ).toEqual(['activity-feed', 'fitness-kpi', 'work-summary'])
  })

  it('reorders tile ids after drag end', () => {
    expect(
      reorderDashboardTileIds(
        ['fitness-kpi', 'work-summary', 'activity-feed'],
        'activity-feed',
        'fitness-kpi',
      ),
    ).toEqual(['activity-feed', 'fitness-kpi', 'work-summary'])

    expect(
      reorderDashboardTileIds(['fitness-kpi', 'work-summary'], 'missing-widget', 'fitness-kpi'),
    ).toEqual(['fitness-kpi', 'work-summary'])
  })

  it('clamps dashboard tile sizes and expands in place', () => {
    expect(getDashboardTileSize({ w: 3, h: 1 })).toEqual({ w: 2, h: 1 })
    expect(getDashboardTileSize({ w: 8, h: 9 })).toEqual({ w: 2, h: 2 })
    expect(getDashboardTileSize({ w: 1, h: 1 }, true)).toEqual({ w: 2, h: 2 })
    expect(getDashboardTileSize({ w: 3, h: 1 }, true)).toEqual({ w: 2, h: 2 })
  })

  it('keeps dashboard tile spans within the discrete grid shapes', () => {
    expect(getDashboardTileSpanClasses({ w: 3, h: 1 })).toContain('dashboard-tile-w-2')
    expect(getDashboardTileSpanClasses({ w: 1, h: 1 })).toContain('dashboard-tile-w-1')
    expect(getDashboardTileSpanClasses({ w: 1, h: 1 })).toContain('row-span-3')
    expect(getDashboardTileSpanClasses({ w: 1, h: 2 })).toContain('row-span-6')
    expect(getDashboardTileSpanClasses({ w: 1, h: 2 })).toContain('min-h-[456px]')
  })

  it('uses compact height classes for minimized dashboard tiles', () => {
    expect(getDashboardTileSpanClasses({ w: 1, h: 1 }, true)).toContain('min-h-[64px]')
    expect(getDashboardTileSpanClasses({ w: 1, h: 1 }, true)).toContain('row-span-1')
    expect(getDashboardTileSpanClasses({ w: 1, h: 1 }, true)).not.toContain('min-h-[220px]')
  })
})
