import { describe, it, expect } from 'vitest'
import { runAudit, applyIconFix, isIconValidForDomain, suggestIconsForDomain, DOMAIN_ICON_CATALOG } from '@core/audit'
import type { AuditInputs } from '@core/audit/types'
import type { PluginManifest } from '@core/types'

function makeManifest(partial: Partial<PluginManifest> & { id: string }): PluginManifest {
  return {
    name: partial.id,
    version: '1.0.0',
    description: 'test',
    icon: 'Box',
    ...partial,
  } as PluginManifest
}

function emptyInputs(overrides: Partial<AuditInputs> = {}): AuditInputs {
  return {
    manifests: [],
    activePluginIds: [],
    achievements: [],
    missions: [],
    quickActions: [],
    queuedNotificationSources: [],
    ...overrides,
  }
}

describe('runAudit — basic shape', () => {
  it('returns an empty report when no inputs are provided', () => {
    const report = runAudit(emptyInputs())
    expect(report.findings).toEqual([])
    expect(report.countsBySeverity).toEqual({ error: 0, warn: 0, info: 0 })
    expect(report.totalPlugins).toBe(0)
    expect(report.activePlugins).toBe(0)
    expect(report.generatedAt).toBeDefined()
  })
})

describe('R1 — orphan achievements', () => {
  it('flags achievement for unknown plugin', () => {
    const report = runAudit(emptyInputs({
      achievements: [{ achievementId: 'a1', pluginId: 'ghost', reason: 'core' }],
    }))
    const r1 = report.findings.filter((f) => f.rule === 'R1')
    expect(r1.length).toBe(1)
    expect(r1[0].severity).toBe('warn')
  })

  it('does not flag achievement for active plugin', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({ id: 'fitness' })],
      activePluginIds: ['fitness'],
      achievements: [{ achievementId: 'a1', pluginId: 'fitness', reason: 'core' }],
    }))
    expect(report.findings.filter((f) => f.rule === 'R1')).toEqual([])
  })
})

describe('R2 — orphan missions', () => {
  it('flags mission whose required plugin is inactive', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({ id: 'fitness' })],
      activePluginIds: [],
      missions: [{ missionId: 'm1', requiredPlugins: ['fitness'] }],
    }))
    const r2 = report.findings.filter((f) => f.rule === 'R2')
    expect(r2.length).toBe(1)
  })
})

describe('R5 — phantom UI', () => {
  it('flags inactive plugin still declaring pages', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({
        id: 'finance',
        pages: [{ id: 'dash', path: '/finance', icon: 'Wallet', component: (() => null) }] as unknown as PluginManifest['pages'],
      })],
      activePluginIds: [],
    }))
    expect(report.findings.some((f) => f.rule === 'R5')).toBe(true)
  })
})

describe('R6 — iconography domain', () => {
  it('flags forbidden icon as ERROR on primary', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({
        id: 'finance',
        domain: 'finance',
        iconography: { primary: 'Leaf' },
      })],
      activePluginIds: ['finance'],
    }))
    const r6 = report.findings.filter((f) => f.rule === 'R6' && f.severity === 'error')
    expect(r6.length).toBeGreaterThan(0)
    expect(r6[0].fix).toBeDefined()
    expect(r6[0].fix?.kind).toBe('replaceIcon')
  })

  it('does not flag a valid primary icon', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({
        id: 'finance',
        domain: 'finance',
        iconography: { primary: 'Wallet' },
      })],
      activePluginIds: ['finance'],
    }))
    const errors = report.findings.filter((f) => f.rule === 'R6' && f.severity === 'error')
    expect(errors).toEqual([])
  })

  it('emits info when iconography is missing entirely', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({ id: 'fitness', domain: 'fitness' })],
      activePluginIds: ['fitness'],
    }))
    expect(report.findings.some((f) => f.rule === 'R6' && f.severity === 'info')).toBe(true)
  })
})

describe('R3 — events without emitter', () => {
  it('ignores core/gamification prefixed events', () => {
    const m = makeManifest({
      id: 'work',
      domain: 'productivity',
      iconography: { primary: 'BriefcaseBusiness' },
      eventListeners: [{ event: 'CORE_BOOT', handler: 'noop' }, { event: 'core:foo', handler: 'noop' }],
    } as Partial<PluginManifest> & { id: string })
    const report = runAudit(emptyInputs({ manifests: [m], activePluginIds: ['work'] }))
    expect(report.findings.filter((f) => f.rule === 'R3')).toEqual([])
  })
})

describe('R4 — orphan notifications', () => {
  it('flags queued notifications whose source plugin is inactive', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({ id: 'fitness' })],
      activePluginIds: [],
      queuedNotificationSources: ['fitness'],
    }))
    expect(report.findings.some((f) => f.rule === 'R4')).toBe(true)
  })

  it('ignores core sources', () => {
    const report = runAudit(emptyInputs({
      queuedNotificationSources: ['core', 'instant', 'automations'],
    }))
    expect(report.findings.filter((f) => f.rule === 'R4')).toEqual([])
  })
})

describe('R8 — quick actions', () => {
  it('flags quick action targeting inactive plugin path without requiredPlugin', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({
        id: 'finance',
        pages: [{ id: 'dash', path: '/finance', icon: 'Wallet', component: (() => null) }] as unknown as PluginManifest['pages'],
      })],
      activePluginIds: [],
      quickActions: [{ label: 'Nuevo movimiento', path: '/finance/new' }],
    }))
    expect(report.findings.some((f) => f.rule === 'R8')).toBe(true)
  })
})

describe('R9 — onboarding & R10 — persistence', () => {
  it('flags inactive plugin with onboarding', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({
        id: 'fitness',
        onboarding: { questions: [] },
      } as unknown as Partial<PluginManifest> & { id: string })],
      activePluginIds: [],
    }))
    expect(report.findings.some((f) => f.rule === 'R9')).toBe(true)
  })

  it('flags inactive plugin with migrations', () => {
    const report = runAudit(emptyInputs({
      manifests: [makeManifest({
        id: 'fitness',
        migrations: [{ version: 1, up: 'CREATE TABLE x (id TEXT);' }],
      })],
      activePluginIds: [],
    }))
    expect(report.findings.some((f) => f.rule === 'R10')).toBe(true)
  })
})

describe('domainIconCatalog', () => {
  it('considers neutral icons valid for any domain', () => {
    expect(isIconValidForDomain('Settings', 'finance', []).valid).toBe(true)
    expect(isIconValidForDomain('Settings', 'fitness', []).valid).toBe(true)
  })

  it('marks Leaf as forbidden in finance', () => {
    const r = isIconValidForDomain('Leaf', 'finance', [])
    expect(r.valid).toBe(false)
    expect(r.reason).toBe('forbidden')
  })

  it('utility domain accepts arbitrary icons', () => {
    expect(isIconValidForDomain('Anything', 'utility', []).valid).toBe(true)
  })

  it('respects gallery overrides', () => {
    expect(isIconValidForDomain('CustomIcon', 'finance', ['CustomIcon']).valid).toBe(true)
  })

  it('suggestIconsForDomain returns up to N items excluding the input', () => {
    const out = suggestIconsForDomain('finance', ['Wallet'], 3)
    expect(out.length).toBeLessThanOrEqual(3)
    expect(out).not.toContain('Wallet')
  })

  it('catalog covers all 20 expected domains', () => {
    const expected = [
      'finance', 'health', 'fitness', 'nutrition', 'nature', 'knowledge',
      'reading', 'productivity', 'habits', 'social', 'travel', 'creativity',
      'music', 'gaming', 'spirituality', 'home', 'pets', 'weather', 'time', 'utility',
    ]
    for (const d of expected) expect(DOMAIN_ICON_CATALOG[d as keyof typeof DOMAIN_ICON_CATALOG]).toBeDefined()
  })
})

describe('applyIconFix', () => {
  it('replaces iconography.primary', () => {
    const m = { iconography: { primary: 'Leaf' } }
    const ok = applyIconFix(m, { kind: 'replaceIcon', pluginId: 'finance', target: 'iconography.primary', from: 'Leaf', to: 'Wallet' })
    expect(ok).toBe(true)
    expect(m.iconography.primary).toBe('Wallet')
  })

  it('falls back to manifest.icon when iconography.primary is missing', () => {
    const m = { icon: 'Leaf' }
    const ok = applyIconFix(m, { kind: 'replaceIcon', pluginId: 'finance', target: 'iconography.primary', from: 'Leaf', to: 'Wallet' })
    expect(ok).toBe(true)
    expect(m.icon).toBe('Wallet')
  })

  it('replaces pages[N].icon by index', () => {
    const m = { pages: [{ id: 'a', icon: 'Leaf' }, { id: 'b', icon: 'Tree' }] }
    const ok = applyIconFix(m, { kind: 'replaceIcon', pluginId: 'finance', target: 'pages[1].icon', from: 'Tree', to: 'Wallet' })
    expect(ok).toBe(true)
    expect(m.pages[1].icon).toBe('Wallet')
    expect(m.pages[0].icon).toBe('Leaf')
  })

  it('returns false when "from" does not match', () => {
    const m = { iconography: { primary: 'Wallet' } }
    const ok = applyIconFix(m, { kind: 'replaceIcon', pluginId: 'finance', target: 'iconography.primary', from: 'Leaf', to: 'Coin' })
    expect(ok).toBe(false)
  })
})
