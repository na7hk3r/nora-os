import { create } from 'zustand'
import type { UserProfile } from '../types'
import { eventBus } from '@core/events/EventBus'
import { CORE_EVENTS } from '@core/events/events'
import { pluginManager } from '@core/plugins/PluginManager'

interface CoreState {
  // Profile
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void
  persistProfile: () => Promise<void>

  // Settings
  settings: {
    theme: string  // 'default' | 'light' | 'cyberpunk' | 'calma' | 'bosque'
    sidebarCollapsed: boolean
  }
  updateSettings: (updates: Partial<CoreState['settings']>) => void
  persistSettings: () => Promise<void>

  // Plugins
  activePlugins: string[]
  pluginUiVersion: number
  bumpPluginUiVersion: () => void
  togglePlugin: (pluginId: string) => void
  setActivePlugins: (ids: string[]) => void
  /**
   * Unified enable/disable flow: orchestrates PluginManager lifecycle and
   * persists the resulting set of active plugin ids. Returns the final status
   * for the toggled plugin so the UI can surface errors.
   */
  setPluginEnabled: (pluginId: string, enabled: boolean) => Promise<'active' | 'inactive' | 'error'>

  // Onboarding
  onboardingComplete: boolean
  completeOnboarding: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useCoreStore = create<CoreState>((set, get) => ({
  profile: {
    name: '',
    height: 0,
    age: 0,
    startDate: '',
    weightGoal: 0,
  },

  updateProfile: (updates) =>
    set((state) => ({ profile: { ...state.profile, ...updates } })),

  persistProfile: async () => {
    const { profile } = get()
    if (!window.storage) return
    await window.storage.execute(
      `INSERT OR REPLACE INTO profile (id, name, height, age, start_date, weight_goal, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, datetime('now'))`,
      [profile.name, profile.height, profile.age, profile.startDate, profile.weightGoal],
    )
    // bigGoal se persiste en settings (no requiere migración del schema profile)
    if (profile.bigGoal !== undefined) {
      await window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('profile.bigGoal', ?)`,
        [profile.bigGoal],
      )
    }
    eventBus.emit(CORE_EVENTS.PROFILE_UPDATED, {
      name: profile.name,
      hasGoal: Boolean(profile.weightGoal),
      hasBigGoal: Boolean(profile.bigGoal),
    }, { source: 'core', persist: true })
  },

  settings: {
    theme: 'default',
    sidebarCollapsed: false,
  },
  updateSettings: (updates) =>
    set((state) => {
      const nextSettings = { ...state.settings, ...updates }
      // sidebarCollapsed se persiste inmediatamente (no es preferencia visual)
      if (window.storage && 'sidebarCollapsed' in updates) {
        void window.storage.execute(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('sidebarCollapsed', ?)`,
          [nextSettings.sidebarCollapsed ? 'true' : 'false'],
        )
      }
      return { settings: nextSettings }
    }),

  persistSettings: async () => {
    const { settings } = get()
    if (!window.storage) return
    await window.storage.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)`,
      [settings.theme],
    )
    await window.storage.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('sidebarCollapsed', ?)`,
      [settings.sidebarCollapsed ? 'true' : 'false'],
    )
    eventBus.emit(CORE_EVENTS.SETTINGS_UPDATED, {
      theme: settings.theme,
      sidebarCollapsed: settings.sidebarCollapsed,
    }, { source: 'core', persist: true })
  },

  activePlugins: [],
  pluginUiVersion: 0,
  bumpPluginUiVersion: () => set((state) => ({ pluginUiVersion: state.pluginUiVersion + 1 })),
  togglePlugin: (pluginId) =>
    set((state) => {
      const isActive = state.activePlugins.includes(pluginId)
      const nextActivePlugins = isActive
        ? state.activePlugins.filter((id) => id !== pluginId)
        : [...state.activePlugins, pluginId]

      if (window.storage) {
        void window.storage.execute(
          `INSERT OR REPLACE INTO settings (key, value) VALUES ('activePlugins', ?)`,
          [JSON.stringify(nextActivePlugins)],
        )
      }

      return {
        activePlugins: nextActivePlugins,
      }
    }),
  setActivePlugins: (ids) => {
    if (window.storage) {
      void window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('activePlugins', ?)`,
        [JSON.stringify(ids)],
      )
    }
    set({ activePlugins: ids })
  },

  setPluginEnabled: async (pluginId, enabled) => {
    const plugin = pluginManager.getPlugin(pluginId)
    if (!plugin) return 'error'

    if (enabled) {
      if (plugin.status !== 'active') {
        await pluginManager.initPlugin(pluginId)
      }
    } else if (plugin.status === 'active') {
      pluginManager.deactivatePlugin(pluginId)
    }

    const nextIds = pluginManager
      .getAllPlugins()
      .filter((entry) => entry.status === 'active')
      .map((entry) => entry.manifest.id)

    if (window.storage) {
      void window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('activePlugins', ?)`,
        [JSON.stringify(nextIds)],
      )
    }
    set({ activePlugins: nextIds })

    // Re-correr el auditor tras cualquier toggle (best-effort, no bloqueante).
    void import('@core/audit/store')
      .then(({ useAuditStore }) => useAuditStore.getState().runAudit())
      .catch((err) => console.warn('[coreStore] audit re-run failed', err))

    const updated = pluginManager.getPlugin(pluginId)
    if (updated?.status === 'active') return 'active'
    if (updated?.status === 'error') return 'error'
    return 'inactive'
  },

  onboardingComplete: false,

  completeOnboarding: async () => {
    set({ onboardingComplete: true })
    if (!window.storage) return
    await window.storage.execute(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('onboardingComplete', 'true')`,
      [],
    )
    await get().persistProfile()
  },

  loadFromStorage: async () => {
    if (!window.storage) return
    try {
      const rows = await window.storage.query(
        `SELECT key, value FROM settings WHERE key IN ('onboardingComplete', 'theme', 'sidebarCollapsed', 'activePlugins', 'profile.bigGoal')`,
        [],
      ) as { key: string; value: string }[]
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

      const profileRows = await window.storage.query(
        `SELECT name, height, age, start_date, weight_goal FROM profile WHERE id = 1`,
        [],
      ) as { name: string; height: number; age: number; start_date: string; weight_goal: number }[]

      set({
        onboardingComplete: map['onboardingComplete'] === 'true',
        settings: {
          theme: map['theme'] ?? 'default',
          sidebarCollapsed: map['sidebarCollapsed'] === 'true',
        },
        activePlugins: map['activePlugins']
          ? (JSON.parse(map['activePlugins']) as string[])
          : get().activePlugins,
        profile: profileRows[0]
          ? {
              name: profileRows[0].name ?? '',
              height: profileRows[0].height ?? 0,
              age: profileRows[0].age ?? 0,
              startDate: profileRows[0].start_date ?? '',
              weightGoal: profileRows[0].weight_goal ?? 0,
              bigGoal: map['profile.bigGoal'] ?? undefined,
            }
          : get().profile,
      })
    } catch {
      // storage not available yet (dev mode without electron)
    }
  },
}))

