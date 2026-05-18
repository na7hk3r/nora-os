import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Save } from 'lucide-react'
import { useCoreStore } from '../state/coreStore'
import { pluginManager } from '../plugins/PluginManager'
import { THEMES } from '../config/themes'
import { PluginIcon } from './components/PluginIcon'
import { BackupSection } from './control/BackupSection'
import { ScheduledBackupSection } from './control/ScheduledBackupSection'
import { DbEncryptionSection } from './control/DbEncryptionSection'
import { AutoUpdateSection } from './control/AutoUpdateSection'
import { OllamaSection } from './control/OllamaSection'
import { AutomationsSection } from './control/AutomationsSection'
import { NotificationsSection } from './control/NotificationsSection'
import { TagsSection } from './control/TagsSection'
import { CollapsibleSection } from './control/CollapsibleSection'
import { BrandIcon } from './components/BrandIcon'
import { NoraLogoMark } from './components/NoraLogo'
import { AuditPanel } from './AuditPanel'
import { useAuditStore } from '@core/audit/store'
import { resolveI18nString, useI18n } from '@core/i18n'
import { LanguageSelector } from '@core/i18n/LanguageSelector'
import {
  DEFAULT_FITNESS_SETTINGS,
  FITNESS_SETTINGS_KEY,
  loadFitnessSettings,
  normalizeFitnessSettings,
  type FitnessPluginSettings,
} from '@plugins/fitness/settings'
import {
  DEFAULT_FINANCE_SETTINGS,
  FINANCE_SETTINGS_KEY,
  formatExchangeRatesText,
  normalizeFinanceSettings,
  parseExchangeRatesText,
  saveFinanceSettings,
  type FinancePluginSettings,
} from '@plugins/finance/settings'
import { buildFinanceUi } from '@plugins/finance/pluginUi'
import { applyFinanceRuntimeSettings } from '@plugins/finance/runtime'
import {
  ShieldAlert,
  User,
  SlidersHorizontal,
  Puzzle,
  Wrench,
  Bot,
  ClipboardList,
  Zap,
} from 'lucide-react'

interface WorkPluginSettings {
  focusSessionMinutes: number
  breakMinutes: number
  overdueAlertHours: number
  wipLimit: number
  defaultBoardView: 'kanban' | 'list'
  /** Horas de jornada laboral (decimal, ej. 8.5). Usado para calcular sesiones de foco diarias. */
  workdayHours: number
}

const WORK_SETTINGS_KEY = 'pluginSettings:work'

const DEFAULT_WORK_SETTINGS: WorkPluginSettings = {
  focusSessionMinutes: 25,
  breakMinutes: 5,
  overdueAlertHours: 24,
  wipLimit: 6,
  defaultBoardView: 'kanban',
  workdayHours: 8,
}

function sameJson<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function samePluginIds(left: string[], right: string[]): boolean {
  const a = [...left].sort()
  const b = [...right].sort()
  return sameJson(a, b)
}

function scrollToControlSection(id: string) {
  const target = document.querySelector(`[aria-controls="cc-section-${id}"]`) ?? document.getElementById(`cc-section-${id}`)
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function ControlCenter() {
  const { t, language } = useI18n()
  const navigate = useNavigate()
  const profile = useCoreStore((s) => s.profile)
  const settings = useCoreStore((s) => s.settings)
  const activePluginIds = useCoreStore((s) => s.activePlugins)
  const updateProfile = useCoreStore((s) => s.updateProfile)
  const persistProfile = useCoreStore((s) => s.persistProfile)
  const updateSettings = useCoreStore((s) => s.updateSettings)
  const persistSettings = useCoreStore((s) => s.persistSettings)
  const setPluginEnabled = useCoreStore((s) => s.setPluginEnabled)
  const bumpPluginUiVersion = useCoreStore((s) => s.bumpPluginUiVersion)

  const [busyPluginId, setBusyPluginId] = useState<string | null>(null)
  const [pluginMessage, setPluginMessage] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [profileDraft, setProfileDraft] = useState(profile)
  const [settingsDraft, setSettingsDraft] = useState(settings)
  const [draftActivePluginIds, setDraftActivePluginIds] = useState<string[]>(activePluginIds)
  const [fitnessSettings, setFitnessSettings] = useState<FitnessPluginSettings>(DEFAULT_FITNESS_SETTINGS)
  const [savedFitnessSettings, setSavedFitnessSettings] = useState<FitnessPluginSettings>(DEFAULT_FITNESS_SETTINGS)
  const [workSettings, setWorkSettings] = useState<WorkPluginSettings>(DEFAULT_WORK_SETTINGS)
  const [savedWorkSettings, setSavedWorkSettings] = useState<WorkPluginSettings>(DEFAULT_WORK_SETTINGS)
  const [financeSettings, setFinanceSettings] = useState<FinancePluginSettings>(DEFAULT_FINANCE_SETTINGS)
  const [savedFinanceSettings, setSavedFinanceSettings] = useState<FinancePluginSettings>(DEFAULT_FINANCE_SETTINGS)
  const [savingPluginSettings, setSavingPluginSettings] = useState<'fitness' | 'work' | 'finance' | null>(null)
  const [pluginSettingsMessage, setPluginSettingsMessage] = useState('')
  const [leaveGuardOpen, setLeaveGuardOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
  const [leaveGuardBusy, setLeaveGuardBusy] = useState(false)

  const plugins = pluginManager.getAllPlugins()

  const togglePluginDraft = (pluginId: string) => {
    setPluginMessage('')
    setDraftActivePluginIds((prev) => (
      prev.includes(pluginId)
        ? prev.filter((id) => id !== pluginId)
        : [...prev, pluginId]
    ))
  }

  const saveProfile = async () => {
    setProfileMessage('')
    setSavingProfile(true)
    try {
      updateProfile(profileDraft)
      await persistProfile()
      setProfileMessage(language === 'en' ? 'Profile saved.' : 'Perfil guardado correctamente.')
    } catch {
      setProfileMessage(language === 'en' ? 'Could not save the profile. Try again.' : 'No se pudo guardar el perfil. Intenta nuevamente.')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveSettings = async () => {
    setSettingsMessage('')
    setSavingSettings(true)
    try {
      updateSettings(settingsDraft)
      await persistSettings()
      setSettingsMessage(t.messages.success.settingsSaved)
    } catch {
      setSettingsMessage(language === 'en' ? 'Could not save preferences. Try again.' : 'No se pudieron guardar. Intenta nuevamente.')
    } finally {
      setSavingSettings(false)
    }
  }

  const savePluginSettings = async () => {
    if (fitnessDirty) await saveFitnessSettings()
    if (workDirty) await saveWorkSettings()
    if (financeDirty) await saveFinancePluginSettings()
    setPluginSettingsMessage(language === 'en' ? 'Plugin settings saved.' : 'Ajustes de modulos guardados.')
  }

  const savePluginModules = async () => {
    setPluginMessage('')
    setBusyPluginId('modules')
    try {
      const current = new Set(activePluginIds)
      const next = new Set(draftActivePluginIds)
      const toEnable = draftActivePluginIds.filter((id) => !current.has(id))
      const toDisable = activePluginIds.filter((id) => !next.has(id))
      const failures: string[] = []

      for (const pluginId of [...toEnable, ...toDisable]) {
        setBusyPluginId(pluginId)
        const enabled = next.has(pluginId)
        const result = await setPluginEnabled(pluginId, enabled)
        const plugin = pluginManager.getPlugin(pluginId)
        if (enabled && result !== 'active') {
          failures.push(
            plugin
              ? resolveI18nString(language, plugin.manifest.name, plugin.manifest.nameKey ?? `plugins.meta.${plugin.manifest.id}.name`)
              : pluginId,
          )
        }
      }

      const savedIds = useCoreStore.getState().activePlugins
      setDraftActivePluginIds(savedIds)
      setPluginMessage(
        failures.length
          ? t.control.plugins.failedActivate(failures.join(', '))
          : t.control.plugins.saved,
      )
    } catch {
      setPluginMessage(t.control.plugins.failedSave)
    } finally {
      setBusyPluginId(null)
    }
  }

  const saveFitnessSettings = async () => {
    if (!window.storage) return
    setPluginSettingsMessage('')
    setSavingPluginSettings('fitness')
    try {
      const normalized = normalizeFitnessSettings(fitnessSettings)
      await window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [FITNESS_SETTINGS_KEY, JSON.stringify(normalized)],
      )
      setFitnessSettings(normalized)
      setSavedFitnessSettings(normalized)
      setPluginSettingsMessage(language === 'en' ? 'Fitness saved correctly.' : 'Fitness guardado correctamente.')
    } catch {
      setPluginSettingsMessage(language === 'en' ? 'Could not save Fitness.' : 'No se pudo guardar Fitness.')
    } finally {
      setSavingPluginSettings(null)
    }
  }

  const saveWorkSettings = async () => {
    if (!window.storage) return
    setPluginSettingsMessage('')
    setSavingPluginSettings('work')
    try {
      await window.storage.execute(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [WORK_SETTINGS_KEY, JSON.stringify(workSettings)],
      )
      setSavedWorkSettings(workSettings)
      setPluginSettingsMessage(language === 'en' ? 'Work saved correctly.' : 'Work guardado correctamente.')
    } catch {
      setPluginSettingsMessage(language === 'en' ? 'Could not save Work.' : 'No se pudo guardar Work.')
    } finally {
      setSavingPluginSettings(null)
    }
  }

  const saveFinancePluginSettings = async () => {
    setPluginSettingsMessage('')
    setSavingPluginSettings('finance')
    try {
      const normalized = await saveFinanceSettings(financeSettings)
      setFinanceSettings(normalized)
      setSavedFinanceSettings(normalized)
      applyFinanceRuntimeSettings(normalized)
      pluginManager.replacePluginUi('finance', buildFinanceUi(normalized))
      bumpPluginUiVersion()
      setPluginSettingsMessage(language === 'en' ? 'Finance saved correctly.' : 'Finanzas guardado correctamente.')
    } catch {
      setPluginSettingsMessage(language === 'en' ? 'Could not save Finance.' : 'No se pudo guardar Finanzas.')
    } finally {
      setSavingPluginSettings(null)
    }
  }

  useEffect(() => {
    if (!window.storage) return
    void window.storage
      .query(
        `SELECT key, value FROM settings WHERE key IN (?, ?, ?)` ,
        [FITNESS_SETTINGS_KEY, WORK_SETTINGS_KEY, FINANCE_SETTINGS_KEY],
      )
      .then(async (rows) => {
        const list = rows as { key: string; value: string }[]
        const map = Object.fromEntries(list.map((entry) => [entry.key, entry.value]))

        if (map[FITNESS_SETTINGS_KEY]) {
          try {
            const parsed = JSON.parse(map[FITNESS_SETTINGS_KEY]) as Partial<FitnessPluginSettings>
            if (parsed.smokingCessationEnabled === undefined) {
              parsed.smokingCessationEnabled = (await loadFitnessSettings()).smokingCessationEnabled
            }
            const normalized = normalizeFitnessSettings({ ...DEFAULT_FITNESS_SETTINGS, ...parsed })
            setFitnessSettings(normalized)
            setSavedFitnessSettings(normalized)
          } catch {
            // ignore malformed value
          }
        } else {
          void loadFitnessSettings()
            .then((loaded) => {
              setFitnessSettings(loaded)
              setSavedFitnessSettings(loaded)
            })
            .catch(() => {})
        }

        if (map[WORK_SETTINGS_KEY]) {
          try {
            const parsed = JSON.parse(map[WORK_SETTINGS_KEY]) as Partial<WorkPluginSettings>
            const normalized = { ...DEFAULT_WORK_SETTINGS, ...parsed }
            setWorkSettings(normalized)
            setSavedWorkSettings(normalized)
          } catch {
            // ignore malformed value
          }
        }

        if (map[FINANCE_SETTINGS_KEY]) {
          try {
            const parsed = JSON.parse(map[FINANCE_SETTINGS_KEY]) as Partial<FinancePluginSettings>
            const normalized = normalizeFinanceSettings({ ...DEFAULT_FINANCE_SETTINGS, ...parsed })
            setFinanceSettings(normalized)
            setSavedFinanceSettings(normalized)
          } catch {
            // ignore malformed value
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setProfileDraft(profile)
  }, [profile])

  useEffect(() => {
    setSettingsDraft(settings)
  }, [settings])

  useEffect(() => {
    setDraftActivePluginIds(activePluginIds)
  }, [activePluginIds])

  const dirtyLabels = useMemo(() => {
    const labels: string[] = []
    if (!sameJson(profileDraft, profile)) labels.push('Cuenta')
    if (!sameJson(settingsDraft, settings)) labels.push('Apariencia')
    if (!samePluginIds(draftActivePluginIds, activePluginIds)) labels.push('Módulos')
    if (!sameJson(fitnessSettings, savedFitnessSettings)) labels.push('Fitness')
    if (!sameJson(workSettings, savedWorkSettings)) labels.push('Work')
    if (!sameJson(financeSettings, savedFinanceSettings)) labels.push('Finanzas')
    return labels
  }, [
    activePluginIds,
    draftActivePluginIds,
    financeSettings,
    fitnessSettings,
    profile,
    profileDraft,
    savedFinanceSettings,
    savedFitnessSettings,
    savedWorkSettings,
    settings,
    settingsDraft,
    workSettings,
  ])

  const hasDirtySections = dirtyLabels.length > 0
  const profileDirty = dirtyLabels.includes('Cuenta')
  const settingsDirty = dirtyLabels.includes('Apariencia')
  const modulesDirty = dirtyLabels.includes('Módulos')
  const fitnessDirty = dirtyLabels.includes('Fitness')
  const workDirty = dirtyLabels.includes('Work')
  const financeDirty = dirtyLabels.includes('Finanzas')

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!hasDirtySections) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasDirtySections])

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!hasDirtySections) return
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null
      const href = anchor?.getAttribute('href') ?? ''
      if (!href.startsWith('#/')) return
      const path = href.slice(1)
      if (path === '/control') return
      event.preventDefault()
      setPendingNavigation(path)
      setLeaveGuardOpen(true)
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [hasDirtySections])

  const safeNavigate = (path: string) => {
    if (hasDirtySections) {
      setPendingNavigation(path)
      setLeaveGuardOpen(true)
      return
    }
    navigate(path)
  }

  const discardDrafts = () => {
    setProfileDraft(profile)
    setSettingsDraft(settings)
    setDraftActivePluginIds(activePluginIds)
    setFitnessSettings(savedFitnessSettings)
    setWorkSettings(savedWorkSettings)
    setFinanceSettings(savedFinanceSettings)
  }

  const continueNavigation = () => {
    const path = pendingNavigation
    setLeaveGuardOpen(false)
    setPendingNavigation(null)
    if (path) navigate(path)
  }

  const discardAndExit = () => {
    discardDrafts()
    continueNavigation()
  }

  const saveAllAndExit = async () => {
    setLeaveGuardBusy(true)
    try {
      if (profileDirty) await saveProfile()
      if (settingsDirty) await saveSettings()
      if (modulesDirty) await savePluginModules()
      if (fitnessDirty) await saveFitnessSettings()
      if (workDirty) await saveWorkSettings()
      if (financeDirty) await saveFinancePluginSettings()
      continueNavigation()
    } finally {
      setLeaveGuardBusy(false)
    }
  }

  const activePlugins = plugins.filter((plugin) => plugin.status === 'active').length

  const metrics = {
    widgets: pluginManager.getActiveWidgets().length,
    pages: pluginManager.getActivePages().length,
    navItems: pluginManager.getActiveNavItems().length,
  }
  const isFitnessActive = activePluginIds.includes('fitness')
  const isWorkActive = activePluginIds.includes('work')
  const isFinanceActive = activePluginIds.includes('finance')
  const hasActivePluginSettings = isFitnessActive || isWorkActive || isFinanceActive

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface-light/90 p-6 shadow-xl">
        {/* Decoración de marca */}
        <BrandIcon
          name="Tools"
          size={180}
          tile={false}
          className="pointer-events-none absolute -right-8 -bottom-10 select-none opacity-15"
        />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">{t.control.eyebrow}</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold text-white">
              {t.control.title}
              <AuditHeaderBadge />
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {t.control.description}
            </p>
          </div>
          <NoraLogoMark
            size={56}
            glow
            className="shrink-0 self-start rounded-md border border-border/80 bg-surface p-2"
          />
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/80 bg-surface px-4 py-2">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          </span>
          <p className="text-xs text-muted">{t.control.monitoring}</p>
        </div>
      </section>

      <nav className="rounded-2xl border border-border bg-surface-light/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ['profile', t.control.nav.profile],
            ['preferences', t.control.nav.preferences],
            ['plugin-manager', t.control.nav.pluginManager],
            ['organization', t.control.nav.organization],
            ['ai-notifications', t.control.nav.aiNotifications],
            ['security-backups', t.control.nav.securityBackups],
            ['automations', t.control.nav.automations],
            ['audit', t.control.nav.audit],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToControlSection(id)}
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface hover:text-white"
            >
              {label}
            </button>
          ))}
          {hasDirtySections && (
            <span className="ml-auto rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs text-warning">
              {t.control.unsavedSections(dirtyLabels.length)}
            </span>
          )}
        </div>
      </nav>

      {/* KPIs */}
      <section className="workspace-auto-grid-sm gap-4">
        <article className="flex items-center gap-4 rounded-2xl border border-border bg-surface-light/80 p-5">
          <BrandIcon name="Chip" size={40} tile={false} />
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-muted">{t.control.kpis.activeModules}</p>
            <p className="mt-1 text-3xl font-semibold">{activePlugins}</p>
            <p className="mt-0.5 truncate text-sm text-muted">{t.control.kpis.registered(plugins.length)}</p>
          </div>
        </article>
        <article className="flex items-center gap-4 rounded-2xl border border-border bg-surface-light/80 p-5">
          <BrandIcon name="Cards" size={40} tile={false} />
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-muted">{t.control.kpis.dashboardWidgets}</p>
            <p className="mt-1 text-3xl font-semibold">{metrics.widgets}</p>
            <p className="mt-0.5 truncate text-sm text-muted">{t.control.kpis.connectedReady}</p>
          </div>
        </article>
        <article className="flex items-center gap-4 rounded-2xl border border-border bg-surface-light/80 p-5">
          <BrandIcon name="TomeAtlas" size={40} tile={false} />
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-muted">
              {language === 'en' ? 'Operation routes' : 'Rutas de operacion'}
            </p>
            <p className="mt-1 text-3xl font-semibold">{metrics.pages}</p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {language === 'en'
                ? `${metrics.navItems} nav entries`
                : `${metrics.navItems} entradas de nav`}
            </p>
          </div>
        </article>
      </section>

      <section className="workspace-auto-grid-lg gap-6">
        {/* Perfil */}
        <CollapsibleSection
          id="profile"
          title={t.control.profile.title}
          description={t.control.profile.description}
          icon={<User size={18} aria-hidden />}
          summary={profileDraft.name ? `${profileDraft.name}` : (language === 'en' ? 'No name' : 'Sin nombre')}
        >
          <div className="workspace-form-grid gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Name' : 'Nombre'}</span>
              <input
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Age' : 'Edad'}</span>
              <input
                type="number"
                value={profileDraft.age || ''}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, age: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Height (cm)' : 'Altura (cm)'}</span>
              <input
                type="number"
                value={profileDraft.height || ''}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, height: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Weight goal (kg)' : 'Meta peso (kg)'}</span>
              <input
                type="number"
                value={profileDraft.weightGoal || ''}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, weightGoal: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted">{language === 'en' ? 'Start date' : 'Fecha de inicio'}</span>
              <input
                type="date"
                value={profileDraft.startDate}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void saveProfile()}
              disabled={savingProfile || !profileDirty}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
            >
              <Save size={13} />
              {savingProfile ? t.common.saving : (language === 'en' ? 'Save profile' : 'Guardar perfil')}
            </button>
            {profileDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
            {profileMessage && <span className="text-xs text-muted">{profileMessage}</span>}
          </div>
        </CollapsibleSection>

        {/* Preferencias */}
        <CollapsibleSection
          id="preferences"
          title={t.control.appearance.title}
          description={t.control.appearance.description}
          icon={<SlidersHorizontal size={18} aria-hidden />}
          summary={t.control.appearance.summary(settingsDraft.theme || 'default')}
        >
          <div className="space-y-4">
            <div className="grid gap-3 rounded-lg border border-border bg-surface px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,auto)] lg:items-center">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">{t.control.appearance.languageTitle}</p>
                <p className="text-xs text-muted">{t.control.appearance.languageHelp}</p>
              </div>
              <LanguageSelector className="w-full lg:justify-end" />
            </div>

            {/* Sidebar */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">{t.control.appearance.sidebarCollapsed}</p>
                <p className="text-xs text-muted">{t.control.appearance.sidebarCollapsedHelp}</p>
              </div>
              <input
                type="checkbox"
                checked={settingsDraft.sidebarCollapsed}
                onChange={(e) => setSettingsDraft((prev) => ({ ...prev, sidebarCollapsed: e.target.checked }))}
                className="h-4 w-4 shrink-0"
              />
            </div>

            {/* Temas */}
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{t.control.appearance.themeTitle}</p>
                  <p className="text-xs text-muted">{language === 'en' ? 'Theme preview is instant.' : 'El tema se previsualiza al instante.'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => safeNavigate('/themes')}
                  className="shrink-0 rounded-md border border-border bg-surface-light px-2.5 py-1 text-caption text-muted hover:border-accent/50 hover:text-white"
                >
                  {language === 'en' ? 'Full gallery' : 'Galeria completa'}
                </button>
              </div>
              <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setSettingsDraft((prev) => ({ ...prev, theme: t.value }))}
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-all ${
                      settingsDraft.theme === t.value
                        ? 'border-accent bg-accent/15 text-white'
                        : 'border-border bg-surface-light/50 text-muted hover:border-accent/40 hover:text-white'
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-black/30"
                      style={{ background: t.swatch.accent }}
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs font-semibold">{t.label}</span>
                      <span className="line-clamp-1 text-caption opacity-70">{t.description}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => safeNavigate('/themes')}
                className="mt-2 w-full rounded-md border border-dashed border-border px-3 py-1.5 text-caption text-muted hover:border-accent/50 hover:text-accent-light"
              >
                {t.control.appearance.themeGallery(THEMES.length)}
              </button>
            </div>
          </div>

          {/* Botón guardar preferencias */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void saveSettings()}
              disabled={savingSettings || !settingsDirty}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
            >
              <Save size={13} />
              {savingSettings ? t.common.saving : t.control.appearance.savePreferences}
            </button>
            {settingsDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
            {settingsMessage && <span className="text-xs text-muted">{settingsMessage}</span>}
          </div>
        </CollapsibleSection>
      </section>

      {/* Configuración por plugin — sólo se muestra si hay plugins relevantes activos */}
      {hasActivePluginSettings && (
        <CollapsibleSection
          id="plugin-settings"
          title={language === 'en' ? 'Module settings' : 'Ajustes de modulos'}
          description={language === 'en'
            ? 'Each active module saves its own changes.'
            : 'Cada módulo activo guarda sus propios cambios.'}
          icon={<Wrench size={18} aria-hidden />}
          defaultOpen={false}
          summary={[isFitnessActive && 'Fitness', isWorkActive && 'Work', isFinanceActive && (language === 'en' ? 'Finance' : 'Finanzas')].filter(Boolean).join(' - ')}
        >
          <div className="workspace-auto-grid-lg gap-4">
            {isFitnessActive && (
              <article className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-white">Fitness</h3>
            <p className="mt-1 text-xs text-muted">
              {language === 'en' ? 'Goals and limits for daily tracking.' : 'Objetivos y limites para seguimiento diario.'}
            </p>

            <div className="workspace-form-grid mt-3 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Workouts per week' : 'Entrenos por semana'}</span>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={fitnessSettings.workoutTargetPerWeek}
                  onChange={(e) => setFitnessSettings((prev) => ({
                    ...prev,
                    workoutTargetPerWeek: Number(e.target.value) || 1,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Sleep target (h)' : 'Sueño objetivo (h)'}</span>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={fitnessSettings.sleepTargetHours}
                  onChange={(e) => setFitnessSettings((prev) => ({
                    ...prev,
                    sleepTargetHours: Number(e.target.value) || 8,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>

              {fitnessSettings.smokingCessationEnabled && (
                <label className="space-y-1">
                  <span className="text-xs text-muted">{language === 'en' ? 'Max cigarettes/day' : 'Max cigarrillos/dia'}</span>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={fitnessSettings.maxCigarettesPerDay}
                    onChange={(e) => setFitnessSettings((prev) => ({
                      ...prev,
                      maxCigarettesPerDay: Number(e.target.value) || 0,
                    }))}
                    className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                  />
                </label>
              )}

              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Meal compliance (%)' : 'Cumplimiento comidas (%)'}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={fitnessSettings.mealComplianceTarget}
                  onChange={(e) => setFitnessSettings((prev) => ({
                    ...prev,
                    mealComplianceTarget: Number(e.target.value) || 0,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-light px-3 py-2">
              <span className="text-xs text-muted">{language === 'en' ? 'Measurement reminder' : 'Recordatorio de mediciones'}</span>
              <input
                type="checkbox"
                checked={fitnessSettings.remindMeasurements}
                onChange={(e) => setFitnessSettings((prev) => ({
                  ...prev,
                  remindMeasurements: e.target.checked,
                }))}
                className="h-4 w-4"
              />
            </label>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-light px-3 py-2">
              <span className="text-xs text-muted">{language === 'en' ? 'I smoke and want to quit' : 'Soy fumador y quiero dejarlo'}</span>
              <input
                type="checkbox"
                checked={fitnessSettings.smokingCessationEnabled}
                onChange={(e) => setFitnessSettings((prev) => ({
                  ...prev,
                  smokingCessationEnabled: e.target.checked,
                }))}
                className="h-4 w-4 shrink-0"
              />
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void saveFitnessSettings()}
                disabled={savingPluginSettings === 'fitness' || !fitnessDirty}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
              >
                <Save size={12} />
                {savingPluginSettings === 'fitness' ? t.common.saving : (language === 'en' ? 'Save Fitness' : 'Guardar Fitness')}
              </button>
              {fitnessDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
            </div>
              </article>
            )}

            {isWorkActive && (
              <article className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-white">Work</h3>
            <p className="mt-1 text-xs text-muted">
              {language === 'en' ? 'Focus, board, and workload preferences.' : 'Preferencias de foco, tablero y carga de trabajo.'}
            </p>

            <div className="workspace-form-grid mt-3 gap-3">
              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Focus session (min)' : 'Sesion foco (min)'}</span>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={workSettings.focusSessionMinutes}
                  onChange={(e) => setWorkSettings((prev) => ({
                    ...prev,
                    focusSessionMinutes: Number(e.target.value) || 25,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Break (min)' : 'Descanso (min)'}</span>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={workSettings.breakMinutes}
                  onChange={(e) => setWorkSettings((prev) => ({
                    ...prev,
                    breakMinutes: Number(e.target.value) || 5,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'Overdue alert (h)' : 'Alerta vencimiento (h)'}</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={workSettings.overdueAlertHours}
                  onChange={(e) => setWorkSettings((prev) => ({
                    ...prev,
                    overdueAlertHours: Number(e.target.value) || 24,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1">
                <span className="text-xs text-muted">{language === 'en' ? 'WIP limit' : 'Limite WIP'}</span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={workSettings.wipLimit}
                  onChange={(e) => setWorkSettings((prev) => ({
                    ...prev,
                    wipLimit: Number(e.target.value) || 1,
                  }))}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
              </label>

              <label className="space-y-1 sm:col-span-2">
                <span className="text-xs text-muted">{language === 'en' ? 'Workday (hours)' : 'Jornada laboral (horas)'}</span>
                <input
                  type="number"
                  step={0.25}
                  min={0.5}
                  max={24}
                  value={workSettings.workdayHours}
                  onChange={(e) => {
                    const raw = Number(e.target.value)
                    const clamped = Number.isFinite(raw) ? Math.min(24, Math.max(0.5, raw)) : 8
                    setWorkSettings((prev) => ({ ...prev, workdayHours: clamped }))
                  }}
                  className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                />
                <p className="text-caption text-muted/80">
                  {language === 'en' ? 'You need about ' : 'Necesitas aproximadamente '}
                  <span className="font-semibold text-accent-light">
                    {Math.max(
                      1,
                      Math.ceil((workSettings.workdayHours * 60) / Math.max(1, workSettings.focusSessionMinutes)),
                    )}
                  </span>{' '}
                  {language === 'en'
                    ? `focus sessions of ${workSettings.focusSessionMinutes} min to cover your ${workSettings.workdayHours} h workday.`
                    : `sesiones de foco de ${workSettings.focusSessionMinutes} min para cubrir tu jornada de ${workSettings.workdayHours} h.`}
                </p>
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-xs text-muted">{language === 'en' ? 'Default view' : 'Vista predeterminada'}</span>
              <select
                value={workSettings.defaultBoardView}
                onChange={(e) => setWorkSettings((prev) => ({
                  ...prev,
                  defaultBoardView: e.target.value as 'kanban' | 'list',
                }))}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
              >
                <option value="kanban">Kanban</option>
                <option value="list">{language === 'en' ? 'List' : 'Lista'}</option>
              </select>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void saveWorkSettings()}
                disabled={savingPluginSettings === 'work' || !workDirty}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
              >
                <Save size={12} />
                {savingPluginSettings === 'work' ? t.common.saving : (language === 'en' ? 'Save Work' : 'Guardar Work')}
              </button>
              {workDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
            </div>
              </article>
            )}

            {isFinanceActive && (
              <article className="rounded-xl border border-border bg-surface p-4">
                <h3 className="text-sm font-semibold text-white">{language === 'en' ? 'Finance' : 'Finanzas'}</h3>
                <p className="mt-1 text-xs text-muted">
                  {language === 'en'
                    ? 'Enable only the tools you use in your daily flow.'
                    : 'Activa solo las herramientas que uses en tu flujo diario.'}
                </p>

                <label className="mt-3 block space-y-1">
                  <span className="text-xs text-muted">{language === 'en' ? 'Default currency' : 'Moneda predeterminada'}</span>
                  <input
                    value={financeSettings.defaultCurrency}
                    maxLength={3}
                    onChange={(e) => setFinanceSettings((prev) => ({
                      ...prev,
                      defaultCurrency: e.target.value.toUpperCase(),
                    }))}
                    className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
                  />
                </label>

                <ExchangeRatesEditor
                  baseCurrency={financeSettings.defaultCurrency}
                  rates={financeSettings.exchangeRates}
                  onChange={(exchangeRates) => setFinanceSettings((prev) => ({ ...prev, exchangeRates }))}
                />

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FinanceToggle
                    label={language === 'en' ? 'Budgets' : 'Presupuestos'}
                    checked={financeSettings.budgetsEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, budgetsEnabled: checked }))}
                  />
                  <FinanceToggle
                    label={language === 'en' ? 'Recurring' : 'Recurrentes'}
                    checked={financeSettings.recurringEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, recurringEnabled: checked }))}
                  />
                  <FinanceToggle
                    label="Insights"
                    checked={financeSettings.insightsEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, insightsEnabled: checked }))}
                  />
                  <FinanceToggle
                    label={language === 'en' ? 'Transfers' : 'Transferencias'}
                    checked={financeSettings.transfersEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, transfersEnabled: checked }))}
                  />
                  <FinanceToggle
                    label={language === 'en' ? 'Unusual expense alerts' : 'Alertas de gastos inusuales'}
                    checked={financeSettings.anomalyAlertsEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, anomalyAlertsEnabled: checked }))}
                  />
                  <FinanceToggle
                    label={language === 'en' ? 'AI context' : 'Contexto IA'}
                    checked={financeSettings.aiContextEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, aiContextEnabled: checked }))}
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void saveFinancePluginSettings()}
                    disabled={savingPluginSettings === 'finance' || !financeDirty}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
                  >
                    <Save size={12} />
                    {savingPluginSettings === 'finance' ? t.common.saving : (language === 'en' ? 'Save Finance' : 'Guardar Finanzas')}
                  </button>
                  {financeDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
                </div>
              </article>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void savePluginSettings()}
              disabled={savingPluginSettings !== null || (!fitnessDirty && !workDirty && !financeDirty)}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
            >
              <Save size={13} />
              {savingPluginSettings ? t.common.saving : (language === 'en' ? 'Save module settings' : 'Guardar configuracion de modulos')}
            </button>
            {pluginSettingsMessage && <span className="text-xs text-muted">{pluginSettingsMessage}</span>}
          </div>
        </CollapsibleSection>
      )}

      {/* Gestor de plugins */}
      <CollapsibleSection
        id="plugin-manager"
        title={t.control.plugins.title}
        description={t.control.plugins.description}
        icon={<Puzzle size={18} aria-hidden />}
          summary={t.control.plugins.summary(draftActivePluginIds.length, plugins.length)}
      >
        {pluginMessage && (
          <div className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
            {pluginMessage}
          </div>
        )}

        <div className="workspace-auto-grid gap-3">
          {plugins.map((plugin) => {
            const isActive = plugin.status === 'active'
            const isDraftActive = draftActivePluginIds.includes(plugin.manifest.id)
            const isBusy = busyPluginId === plugin.manifest.id || busyPluginId === 'modules'
            const pluginName = resolveI18nString(language, plugin.manifest.name, plugin.manifest.nameKey ?? `plugins.meta.${plugin.manifest.id}.name`)
            const pluginDescription = resolveI18nString(language, plugin.manifest.description, plugin.manifest.descriptionKey ?? `plugins.meta.${plugin.manifest.id}.description`)

            return (
              <div key={plugin.manifest.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="shrink-0 text-accent-light">
                        <PluginIcon name={plugin.manifest.icon} size={16} />
                      </span>
                      <span className="truncate">{pluginName}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{pluginDescription}</p>
                    <p className="mt-1 text-caption text-muted">v{plugin.manifest.version}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      isDraftActive
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : plugin.status === 'error'
                          ? 'bg-red-500/15 text-red-300'
                          : 'bg-slate-500/15 text-slate-300'
                    }`}
                  >
                    {isDraftActive ? t.common.active : plugin.status === 'error' ? t.common.error : t.common.inactive}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (plugin.manifest.navItems?.[0]?.path) {
                        safeNavigate(plugin.manifest.navItems[0].path)
                      }
                    }}
                    disabled={!isActive || isBusy || !plugin.manifest.navItems?.length}
                    className="rounded-md border border-border px-3 py-1.5 text-xs text-muted disabled:opacity-40"
                  >
                    {t.control.plugins.openModule}
                  </button>
                  <button
                    onClick={() => togglePluginDraft(plugin.manifest.id)}
                    disabled={isBusy}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      isDraftActive ? 'border border-border bg-surface-light text-muted' : 'bg-accent text-white'
                    } ${isBusy ? 'opacity-60' : ''}`}
                  >
                    {isBusy ? t.common.saving : isDraftActive ? t.messages.actions.disable : t.messages.actions.enable}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => void savePluginModules()}
            disabled={busyPluginId !== null || !modulesDirty}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
          >
            <Save size={13} />
            {busyPluginId ? t.common.saving : t.control.plugins.saveModules}
          </button>
          {modulesDirty && <span className="text-xs text-warning">{t.control.appearance.unsaved}</span>}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3 text-xs text-muted">
          <p className="font-medium text-white">{t.control.plugins.howAddTitle}</p>
          <p className="mt-1">{t.control.plugins.howAddBody}</p>
        </div>
      </CollapsibleSection>

      {/* Servicios y mantenimiento — agrupado y plegado por defecto */}
      <CollapsibleSection
        id="organization"
        title={language === 'en' ? 'Organization' : 'Organización'}
        description={language === 'en'
          ? 'Shared tags for notes, Work tasks, and Planner.'
          : 'Tags compartidos para notas, tareas Work y Planner.'}
        icon={<ClipboardList size={18} aria-hidden />}
        defaultOpen={false}
        summary={language === 'en' ? 'Global tags' : 'Tags globales'}
      >
        <div className="workspace-auto-grid-lg gap-6">
          <TagsSection />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="ai-notifications"
        title={language === 'en' ? 'AI and alerts' : 'IA y avisos'}
        description={language === 'en'
          ? 'Local AI and notifications with explicit tests.'
          : 'IA local y notificaciones con pruebas explicitas.'}
        icon={<Bot size={18} aria-hidden />}
        defaultOpen={false}
        summary={language === 'en' ? 'Ollama and notifications' : 'Ollama y notificaciones'}
      >
        <div className="workspace-auto-grid-lg gap-6">
          <OllamaSection />
          <NotificationsSection />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="security-backups"
        title={language === 'en' ? 'Security and backups' : 'Seguridad y backups'}
        description={language === 'en'
          ? 'Exports, automatic backups, encryption, and updates.'
          : 'Exportaciones, backups automaticos, cifrado y actualizaciones.'}
        icon={<ShieldAlert size={18} aria-hidden />}
        defaultOpen={false}
        summary={language === 'en' ? 'Backups and encryption' : 'Backups y cifrado'}
      >
        <div className="workspace-auto-grid-lg gap-6">
          <BackupSection />
          <ScheduledBackupSection />
          <DbEncryptionSection />
          <AutoUpdateSection />
        </div>
      </CollapsibleSection>

      {/* Auditoría y automatizaciones */}
      <CollapsibleSection
        id="audit"
        title={language === 'en' ? 'System health' : 'Salud del sistema'}
        description={language === 'en'
          ? 'Friendly review to detect inconsistencies and safe actions.'
          : 'Revision amigable para detectar inconsistencias y acciones seguras.'}
        icon={<ClipboardList size={18} aria-hidden />}
        defaultOpen={false}
      >
        <AuditPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="automations"
        title={language === 'en' ? 'Automations' : 'Automatizaciones'}
        description={language === 'en'
          ? 'Rules that connect plugin events with system actions.'
          : 'Reglas que conectan eventos de plugins con acciones del sistema.'}
        icon={<Zap size={18} aria-hidden />}
        defaultOpen={false}
      >
        <AutomationsSection />
      </CollapsibleSection>

      {leaveGuardOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-light p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">{t.control.leaveGuard.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {t.control.leaveGuard.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dirtyLabels.map((label) => (
                <span key={label} className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                  {resolveI18nString(language, label)}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLeaveGuardOpen(false)
                  setPendingNavigation(null)
                }}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white"
              >
                {t.control.leaveGuard.stay}
              </button>
              <button
                type="button"
                onClick={discardAndExit}
                disabled={leaveGuardBusy}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-50"
              >
                {t.control.leaveGuard.discard}
              </button>
              <button
                type="button"
                onClick={() => void saveAllAndExit()}
                disabled={leaveGuardBusy}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
              >
                {leaveGuardBusy ? t.common.saving : t.control.leaveGuard.saveAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditHeaderBadge() {
  const { language } = useI18n()
  const errorCount = useAuditStore((s) => s.report?.countsBySeverity.error ?? 0)
  const warnCount = useAuditStore((s) => s.report?.countsBySeverity.warn ?? 0)
  if (errorCount === 0 && warnCount === 0) return null
  const tone = errorCount > 0
    ? 'border-red-500/40 bg-red-500/15 text-red-200'
    : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}
      title={language === 'en'
        ? `Audit: ${errorCount} error(s), ${warnCount} warning(s)`
        : `Auditoria: ${errorCount} error(es), ${warnCount} advertencia(s)`}
    >
      <ShieldAlert size={12} />
      {errorCount > 0
        ? language === 'en'
          ? `${errorCount} error${errorCount === 1 ? '' : 's'}`
          : `${errorCount} error${errorCount === 1 ? '' : 'es'}`
        : language === 'en'
          ? `${warnCount} warning${warnCount === 1 ? '' : 's'}`
          : `${warnCount} aviso${warnCount === 1 ? '' : 's'}`}
    </span>
  )
}

function ExchangeRatesEditor({
  baseCurrency,
  rates,
  onChange,
}: {
  baseCurrency: string
  rates: Record<string, number>
  onChange: (rates: Record<string, number>) => void
}) {
  const { language } = useI18n()
  const [draft, setDraft] = useState(() => formatExchangeRatesText(rates))

  useEffect(() => {
    setDraft(formatExchangeRatesText(rates))
  }, [rates])

  return (
    <label className="mt-3 block space-y-1">
      <span className="text-xs text-muted">
        {language === 'en' ? `Manual rates to ${baseCurrency}` : `Tasas manuales hacia ${baseCurrency}`}
      </span>
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onChange(parseExchangeRatesText(draft, baseCurrency))}
        placeholder={`USD=40, EUR=43 (${baseCurrency})`}
        className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
      />
      <span className="block text-caption text-muted">
        {language === 'en'
          ? `Format: USD=40 means 1 USD = 40 ${baseCurrency}. Separate with comma, semicolon, or line break.`
          : `Formato: USD=40 significa 1 USD = 40 ${baseCurrency}. Separar con coma, punto y coma o salto de linea.`}
      </span>
    </label>
  )
}

function FinanceToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-light px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0"
      />
    </label>
  )
}
