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
  normalizeFinanceSettings,
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
      setProfileMessage('Perfil guardado correctamente.')
    } catch {
      setProfileMessage('No se pudo guardar el perfil. Intentá nuevamente.')
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
      setSettingsMessage('Preferencias guardadas.')
    } catch {
      setSettingsMessage('No se pudieron guardar. Intentá nuevamente.')
    } finally {
      setSavingSettings(false)
    }
  }

  const savePluginSettings = async () => {
    if (fitnessDirty) await saveFitnessSettings()
    if (workDirty) await saveWorkSettings()
    if (financeDirty) await saveFinancePluginSettings()
    setPluginSettingsMessage('Ajustes de modulos guardados.')
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
        if (enabled && result !== 'active') failures.push(plugin?.manifest.name ?? pluginId)
      }

      const savedIds = useCoreStore.getState().activePlugins
      setDraftActivePluginIds(savedIds)
      setPluginMessage(
        failures.length
          ? `No se pudieron activar: ${failures.join(', ')}.`
          : 'Modulos guardados correctamente.',
      )
    } catch {
      setPluginMessage('No se pudieron guardar los modulos.')
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
      setPluginSettingsMessage('Fitness guardado correctamente.')
    } catch {
      setPluginSettingsMessage('No se pudo guardar Fitness.')
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
      setPluginSettingsMessage('Work guardado correctamente.')
    } catch {
      setPluginSettingsMessage('No se pudo guardar Work.')
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
      setPluginSettingsMessage('Finanzas guardado correctamente.')
    } catch {
      setPluginSettingsMessage('No se pudo guardar Finanzas.')
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
    if (!samePluginIds(draftActivePluginIds, activePluginIds)) labels.push('Modulos')
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
  const modulesDirty = dirtyLabels.includes('Modulos')
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
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Configuración</p>
            <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold text-white">
              Gobernanza de Nora OS
              <AuditHeaderBadge />
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Administra identidad, preferencias, módulos y salud general de la plataforma desde un único panel.
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
          <p className="text-xs text-muted">Monitoreo operativo activo en tiempo real</p>
        </div>
      </section>

      <nav className="sticky top-4 z-20 rounded-2xl border border-border bg-surface-light/95 px-3 py-2 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ['profile', 'Cuenta'],
            ['preferences', 'Apariencia'],
            ['plugin-manager', 'Modulos'],
            ['organization', 'Organizacion'],
            ['ai-notifications', 'IA y avisos'],
            ['security-backups', 'Backups'],
            ['automations', 'Automatizaciones'],
            ['audit', 'Salud'],
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
              {dirtyLabels.length} seccion{dirtyLabels.length === 1 ? '' : 'es'} sin guardar
            </span>
          )}
        </div>
      </nav>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="flex items-center gap-4 rounded-2xl border border-border bg-surface-light/80 p-5">
          <BrandIcon name="Chip" size={40} tile={false} />
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-muted">Módulos activos</p>
            <p className="mt-1 text-3xl font-semibold">{activePlugins}</p>
            <p className="mt-0.5 truncate text-sm text-muted">de {plugins.length} registrados</p>
          </div>
        </article>
        <article className="flex items-center gap-4 rounded-2xl border border-border bg-surface-light/80 p-5">
          <BrandIcon name="Cards" size={40} tile={false} />
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-muted">Widgets en dashboard</p>
            <p className="mt-1 text-3xl font-semibold">{metrics.widgets}</p>
            <p className="mt-0.5 truncate text-sm text-muted">conectados y listos</p>
          </div>
        </article>
        <article className="flex items-center gap-4 rounded-2xl border border-border bg-surface-light/80 p-5">
          <BrandIcon name="TomeAtlas" size={40} tile={false} />
          <div className="min-w-0">
            <p className="truncate text-xs uppercase tracking-wide text-muted">Rutas de operación</p>
            <p className="mt-1 text-3xl font-semibold">{metrics.pages}</p>
            <p className="mt-0.5 truncate text-sm text-muted">{metrics.navItems} entradas de nav</p>
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Perfil */}
        <CollapsibleSection
          id="profile"
          title="Cuenta"
          description="Identidad base para metricas, progreso y reportes."
          icon={<User size={18} aria-hidden />}
          summary={profileDraft.name ? `${profileDraft.name}` : 'Sin nombre'}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Nombre</span>
              <input
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Edad</span>
              <input
                type="number"
                value={profileDraft.age || ''}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, age: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Altura (cm)</span>
              <input
                type="number"
                value={profileDraft.height || ''}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, height: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Meta peso (kg)</span>
              <input
                type="number"
                value={profileDraft.weightGoal || ''}
                onChange={(e) => setProfileDraft((prev) => ({ ...prev, weightGoal: Number(e.target.value) || 0 }))}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted">Fecha de inicio</span>
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
              {savingProfile ? 'Guardando...' : 'Guardar perfil'}
            </button>
            {profileDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
            {profileMessage && <span className="text-xs text-muted">{profileMessage}</span>}
          </div>
        </CollapsibleSection>

        {/* Preferencias */}
        <CollapsibleSection
          id="preferences"
          title="Apariencia"
          description="Interfaz visual y comportamiento de navegacion."
          icon={<SlidersHorizontal size={18} aria-hidden />}
          summary={`Tema: ${settingsDraft.theme || 'default'}`}
        >
          <div className="space-y-4">
            {/* Sidebar */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium">Sidebar colapsado</p>
                <p className="text-xs text-muted">Ahorra espacio y concentra contenido</p>
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
                  <p className="text-sm font-medium">Tema de color</p>
                  <p className="text-xs text-muted">El tema se previsualiza al instante.</p>
                </div>
                <button
                  type="button"
                  onClick={() => safeNavigate('/themes')}
                  className="shrink-0 rounded-md border border-border bg-surface-light px-2.5 py-1 text-caption text-muted hover:border-accent/50 hover:text-white"
                >
                  Galería completa
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
                Ver los {THEMES.length} temas con previsualización en vivo →
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
              {savingSettings ? 'Guardando...' : 'Guardar preferencias'}
            </button>
            {settingsDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
            {settingsMessage && <span className="text-xs text-muted">{settingsMessage}</span>}
          </div>
        </CollapsibleSection>
      </section>

      {/* Configuración por plugin — sólo se muestra si hay plugins relevantes activos */}
      {hasActivePluginSettings && (
        <CollapsibleSection
          id="plugin-settings"
          title="Ajustes de modulos"
          description="Cada modulo activo guarda sus propios cambios."
          icon={<Wrench size={18} aria-hidden />}
          defaultOpen={false}
          summary={[isFitnessActive && 'Fitness', isWorkActive && 'Work', isFinanceActive && 'Finanzas'].filter(Boolean).join(' · ')}
        >
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {isFitnessActive && (
              <article className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-white">Fitness</h3>
            <p className="mt-1 text-xs text-muted">Objetivos y límites para seguimiento diario.</p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted">Entrenos por semana</span>
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
                <span className="text-xs text-muted">Sueño objetivo (h)</span>
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
                  <span className="text-xs text-muted">Max cigarrillos/dia</span>
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
                <span className="text-xs text-muted">Cumplimiento comidas (%)</span>
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
              <span className="text-xs text-muted">Recordatorio de mediciones</span>
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
              <span className="text-xs text-muted">Soy fumador y quiero dejarlo</span>
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
                {savingPluginSettings === 'fitness' ? 'Guardando...' : 'Guardar Fitness'}
              </button>
              {fitnessDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
            </div>
              </article>
            )}

            {isWorkActive && (
              <article className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-white">Work</h3>
            <p className="mt-1 text-xs text-muted">Preferencias de foco, tablero y carga de trabajo.</p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-muted">Sesión foco (min)</span>
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
                <span className="text-xs text-muted">Break (min)</span>
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
                <span className="text-xs text-muted">Alerta vencimiento (h)</span>
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
                <span className="text-xs text-muted">Límite WIP</span>
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
                <span className="text-xs text-muted">Jornada laboral (horas)</span>
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
                  Necesitás aproximadamente{' '}
                  <span className="font-semibold text-accent-light">
                    {Math.max(
                      1,
                      Math.ceil((workSettings.workdayHours * 60) / Math.max(1, workSettings.focusSessionMinutes)),
                    )}
                  </span>{' '}
                  sesiones de foco de {workSettings.focusSessionMinutes} min para cubrir tu jornada de{' '}
                  {workSettings.workdayHours} h.
                </p>
              </label>
            </div>

            <label className="mt-3 block space-y-1">
              <span className="text-xs text-muted">Vista predeterminada</span>
              <select
                value={workSettings.defaultBoardView}
                onChange={(e) => setWorkSettings((prev) => ({
                  ...prev,
                  defaultBoardView: e.target.value as 'kanban' | 'list',
                }))}
                className="w-full rounded-lg border border-border bg-surface-light px-3 py-2 text-sm"
              >
                <option value="kanban">Kanban</option>
                <option value="list">Lista</option>
              </select>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => void saveWorkSettings()}
                disabled={savingPluginSettings === 'work' || !workDirty}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-60"
              >
                <Save size={12} />
                {savingPluginSettings === 'work' ? 'Guardando...' : 'Guardar Work'}
              </button>
              {workDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
            </div>
              </article>
            )}

            {isFinanceActive && (
              <article className="rounded-xl border border-border bg-surface p-4">
                <h3 className="text-sm font-semibold text-white">Finanzas</h3>
                <p className="mt-1 text-xs text-muted">Activa solo las herramientas que uses en tu flujo diario.</p>

                <label className="mt-3 block space-y-1">
                  <span className="text-xs text-muted">Moneda predeterminada</span>
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

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <FinanceToggle
                    label="Presupuestos"
                    checked={financeSettings.budgetsEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, budgetsEnabled: checked }))}
                  />
                  <FinanceToggle
                    label="Recurrentes"
                    checked={financeSettings.recurringEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, recurringEnabled: checked }))}
                  />
                  <FinanceToggle
                    label="Insights"
                    checked={financeSettings.insightsEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, insightsEnabled: checked }))}
                  />
                  <FinanceToggle
                    label="Transferencias"
                    checked={financeSettings.transfersEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, transfersEnabled: checked }))}
                  />
                  <FinanceToggle
                    label="Alertas de gastos inusuales"
                    checked={financeSettings.anomalyAlertsEnabled}
                    onChange={(checked) => setFinanceSettings((prev) => ({ ...prev, anomalyAlertsEnabled: checked }))}
                  />
                  <FinanceToggle
                    label="Contexto IA"
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
                    {savingPluginSettings === 'finance' ? 'Guardando...' : 'Guardar Finanzas'}
                  </button>
                  {financeDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
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
              {savingPluginSettings ? 'Guardando...' : 'Guardar configuración de plugins'}
            </button>
            {pluginSettingsMessage && <span className="text-xs text-muted">{pluginSettingsMessage}</span>}
          </div>
        </CollapsibleSection>
      )}

      {/* Gestor de plugins */}
      <CollapsibleSection
        id="plugin-manager"
        title="Modulos"
        description="Activa o desactiva plugins; los cambios se aplican al guardar."
        icon={<Puzzle size={18} aria-hidden />}
          summary={`${draftActivePluginIds.length} de ${plugins.length} seleccionados`}
      >
        {pluginMessage && (
          <div className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
            {pluginMessage}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {plugins.map((plugin) => {
            const isActive = plugin.status === 'active'
            const isDraftActive = draftActivePluginIds.includes(plugin.manifest.id)
            const isBusy = busyPluginId === plugin.manifest.id || busyPluginId === 'modules'

            return (
              <div key={plugin.manifest.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      <span className="shrink-0 text-accent-light">
                        <PluginIcon name={plugin.manifest.icon} size={16} />
                      </span>
                      <span className="truncate">{plugin.manifest.name}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{plugin.manifest.description}</p>
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
                    {isDraftActive ? 'activo' : plugin.status === 'error' ? 'error' : 'inactivo'}
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
                    Abrir módulo
                  </button>
                  <button
                    onClick={() => togglePluginDraft(plugin.manifest.id)}
                    disabled={isBusy}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      isDraftActive ? 'border border-border bg-surface-light text-muted' : 'bg-accent text-white'
                    } ${isBusy ? 'opacity-60' : ''}`}
                  >
                    {isBusy ? 'Procesando...' : isDraftActive ? 'Desactivar' : 'Activar'}
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
            {busyPluginId ? 'Guardando...' : 'Guardar modulos'}
          </button>
          {modulesDirty && <span className="text-xs text-warning">Cambios sin guardar</span>}
        </div>

        <div className="mt-4 rounded-lg border border-border bg-surface px-3 py-3 text-xs text-muted">
          <p className="font-medium text-white">¿Cómo agregar nuevos plugins?</p>
          <p className="mt-1">En esta versión, los plugins se incluyen en el build y se activan/desactivan sin fricción desde aquí.</p>
        </div>
      </CollapsibleSection>

      {/* Servicios y mantenimiento — agrupado y plegado por defecto */}
      <CollapsibleSection
        id="organization"
        title="Organizacion"
        description="Tags compartidos para notas, tareas Work y Planner."
        icon={<ClipboardList size={18} aria-hidden />}
        defaultOpen={false}
        summary="Tags globales"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <TagsSection />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="ai-notifications"
        title="IA y avisos"
        description="IA local y notificaciones con pruebas explicitas."
        icon={<Bot size={18} aria-hidden />}
        defaultOpen={false}
        summary="Ollama y notificaciones"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <OllamaSection />
          <NotificationsSection />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="security-backups"
        title="Seguridad y backups"
        description="Exportaciones, backups automaticos, cifrado y actualizaciones."
        icon={<ShieldAlert size={18} aria-hidden />}
        defaultOpen={false}
        summary="Backups y cifrado"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <BackupSection />
          <ScheduledBackupSection />
          <DbEncryptionSection />
          <AutoUpdateSection />
        </div>
      </CollapsibleSection>

      {/* Auditoría y automatizaciones */}
      <CollapsibleSection
        id="audit"
        title="Salud del sistema"
        description="Revision amigable para detectar inconsistencias y acciones seguras."
        icon={<ClipboardList size={18} aria-hidden />}
        defaultOpen={false}
      >
        <AuditPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="automations"
        title="Automatizaciones"
        description="Reglas que conectan eventos de plugins con acciones del sistema."
        icon={<Zap size={18} aria-hidden />}
        defaultOpen={false}
      >
        <AutomationsSection />
      </CollapsibleSection>

      {leaveGuardOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-light p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Hay cambios sin guardar</h2>
            <p className="mt-2 text-sm text-muted">
              Estas secciones tienen cambios locales. Nada se aplico todavia.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {dirtyLabels.map((label) => (
                <span key={label} className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                  {label}
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
                Quedarme
              </button>
              <button
                type="button"
                onClick={discardAndExit}
                disabled={leaveGuardBusy}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted hover:text-white disabled:opacity-50"
              >
                Descartar y salir
              </button>
              <button
                type="button"
                onClick={() => void saveAllAndExit()}
                disabled={leaveGuardBusy}
                className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent/85 disabled:opacity-50"
              >
                {leaveGuardBusy ? 'Guardando...' : 'Guardar todo y salir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AuditHeaderBadge() {
  const errorCount = useAuditStore((s) => s.report?.countsBySeverity.error ?? 0)
  const warnCount = useAuditStore((s) => s.report?.countsBySeverity.warn ?? 0)
  if (errorCount === 0 && warnCount === 0) return null
  const tone = errorCount > 0
    ? 'border-red-500/40 bg-red-500/15 text-red-200'
    : 'border-amber-500/40 bg-amber-500/15 text-amber-200'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}
      title={`Auditoría: ${errorCount} error(es), ${warnCount} advertencia(s)`}
    >
      <ShieldAlert size={12} />
      {errorCount > 0 ? `${errorCount} error${errorCount === 1 ? '' : 'es'}` : `${warnCount} aviso${warnCount === 1 ? '' : 's'}`}
    </span>
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
