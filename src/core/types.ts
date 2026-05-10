import type { ComponentType } from 'react'

// ─── Event System ───

export type EventHandler = (payload: unknown) => void
export type UnsubscribeFn = () => void

export interface EventLogEntry {
  id: number
  event_type: string
  source: string
  payload: string
  created_at: string
}

// ─── Storage ───

export interface QueryOptions {
  where?: Record<string, unknown>
  orderBy?: string
  limit?: number
}

export interface Migration {
  version: number
  up: string
}

export interface StorageBridge {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>
  execute: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number }>
  migrate: (pluginId: string, migrations: Migration[]) => Promise<void>
}

export interface AuthUser {
  id: string
  username: string
  createdAt: string
  lastLoginAt: string | null
}

export interface RegisterPayload {
  username: string
  password: string
  recoveryQuestion: string
  recoveryAnswer: string
}

export interface ResetPasswordWithRecoveryPayload {
  username: string
  recoveryAnswer: string
  newPassword: string
}

export interface AuthBridge {
  register: (payload: RegisterPayload) => Promise<AuthUser>
  login: (username: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  me: () => Promise<AuthUser | null>
  getRecoveryQuestion: (username: string) => Promise<string | null>
  resetPasswordWithRecovery: (payload: ResetPasswordWithRecoveryPayload) => Promise<void>
}

// ─── Backup ───

export interface BackupResult {
  ok: boolean
  canceled?: boolean
  path?: string
}

export interface BackupBridge {
  exportPlain: () => Promise<BackupResult>
  exportEncrypted: (passphrase: string) => Promise<BackupResult>
  importPlain: () => Promise<BackupResult>
  importEncrypted: (passphrase: string) => Promise<BackupResult>
}

// ─── Profile export/import (Sprint 9) ───

export interface ProfileImportSummary {
  schemaVersion: number
  exportedAt: string
  hadProfile: boolean
  activePlugins: string[]
}

export interface ProfileTransferResult {
  ok: boolean
  canceled?: boolean
  path?: string
  summary?: ProfileImportSummary
}

export interface ProfileBridge {
  exportPlain: () => Promise<ProfileTransferResult>
  exportEncrypted: (passphrase: string) => Promise<ProfileTransferResult>
  importPlain: () => Promise<ProfileTransferResult>
  importEncrypted: (passphrase: string) => Promise<ProfileTransferResult>
}

// ─── Ollama (AI local) ───

export interface OllamaHealth {
  ok: boolean
  baseUrl: string
  error?: string
}

export interface OllamaModel {
  name: string
  size: number
  modifiedAt: string
}

export interface OllamaGenerateRequest {
  model: string
  prompt: string
  system?: string
  options?: Record<string, unknown>
}

export interface OllamaGenerateResponse {
  text: string
  durationMs?: number
}

export interface OllamaPullResponse {
  ok: boolean
  model: string
  status?: string
}

export interface OllamaBridge {
  health: () => Promise<OllamaHealth>
  listModels: () => Promise<OllamaModel[]>
  pullModel: (model: string) => Promise<OllamaPullResponse>
  generate: (req: OllamaGenerateRequest) => Promise<OllamaGenerateResponse>
}

// ─── Notifications ───

export interface NotificationPayload {
  title: string
  body?: string
  silent?: boolean
}

export interface NotificationsBridge {
  isSupported: () => Promise<boolean>
  show: (payload: NotificationPayload) => Promise<{ ok: boolean; reason?: string }>
}

// ─── Diagnostic ───

export interface DiagnosticReportInput {
  message?: string
  stack?: string
  componentStack?: string
  label?: string
  recentEvents?: Array<{ event: string; timestamp: number }>
  recentLogs?: string[]
  appVersion?: string
}

export interface DiagnosticExportResult {
  ok: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export interface DiagnosticBridge {
  export: (payload: DiagnosticReportInput) => Promise<DiagnosticExportResult>
}

// ─── Auto-update ───

export type AppUpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'no-update'; currentVersion: string }
  | { state: 'available'; version: string; releaseNotes?: string }
  | { state: 'downloading'; percent: number; transferredBytes: number; totalBytes: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string; manualDownloadUrl: string }
  | { state: 'disabled'; reason: string }

export interface AppUpdateBridge {
  getStatus: () => Promise<AppUpdateStatus>
  checkForUpdates: () => Promise<AppUpdateStatus>
  downloadUpdate: () => Promise<AppUpdateStatus>
  quitAndInstall: () => Promise<void>
  onStatus: (cb: (status: AppUpdateStatus) => void) => () => void
}

// ─── Scheduled backup ───

export interface ScheduledBackupConfig {
  enabled: boolean
  /** Frecuencia en días. */
  frequencyDays: number
  /** Carpeta destino (absoluta). */
  destinationDir: string | null
  /** Si es true, los backups se cifran usando la passphrase de la sesión almacenada en memoria. */
  encrypt: boolean
  /** Cantidad máxima de backups a retener en la carpeta destino. */
  retainCount: number
}

export interface ScheduledBackupStatus {
  config: ScheduledBackupConfig
  lastRunAt: string | null
  lastResultPath: string | null
  lastError: string | null
  nextRunAt: string | null
  passphraseLoaded: boolean
}

export interface ScheduledBackupBridge {
  getStatus: () => Promise<ScheduledBackupStatus>
  setConfig: (config: Partial<ScheduledBackupConfig>) => Promise<ScheduledBackupStatus>
  pickDestination: () => Promise<{ path: string | null }>
  /** Provee la passphrase para esta sesión (no se persiste en disco). */
  setPassphrase: (passphrase: string | null) => Promise<{ ok: boolean }>
  runNow: () => Promise<ScheduledBackupStatus>
}

export interface DbEncryptionStatus {
  /** True si la sesión actual está cifrando en reposo (passphrase en memoria). */
  enabled: boolean
  /** True si existe un archivo .enc en disco para el usuario activo. */
  hasEncryptedAtRest: boolean
  /** True si el usuario está logueado pero la DB cifrada todavía no se desbloqueó. */
  locked?: boolean
}

export interface DbEncryptionResult {
  ok: boolean
  code?: 'WEAK_PASSPHRASE' | 'BAD_PASSPHRASE' | 'CORRUPT_FILE' | 'IO'
  message?: string
}

export interface DbEncryptionBridge {
  status: () => Promise<DbEncryptionStatus>
  enable: (passphrase: string) => Promise<DbEncryptionResult>
  disable: () => Promise<{ ok: boolean; message?: string }>
  checkStrength: (passphrase: string) => Promise<{ strong: boolean }>
  unlock: (passphrase: string) => Promise<DbEncryptionResult>
}

// ─── UI Registration ───

export interface WorkFocusWindowBridge {
  open: () => Promise<void>
  close: () => Promise<void>
  toggle: () => Promise<void>
  focusMain: () => Promise<void>
}

export interface WidgetDefinition {
  id: string
  pluginId: string
  title: string
  component: ComponentType
  defaultSize?: { w: number; h: number }
}

export interface PageDefinition {
  id: string
  pluginId: string
  path: string
  title: string
  icon: string
  component: ComponentType
}

export interface NavItemDefinition {
  id: string
  pluginId: string
  label: string
  icon: string
  path: string
  order?: number
  parentId?: string
}

// ─── User Profile ───

export interface UserProfile {
  name: string
  height: number
  age: number
  startDate: string
  weightGoal: number
  /** Objetivo personal en una frase (north star). Opcional. */
  bigGoal?: string
}

// ─── Core API (injected into plugins) ───

export interface CoreAPI {
  storage: StorageBridge
  events: {
    emit(event: string, payload?: unknown): void
    on(event: string, handler: EventHandler): UnsubscribeFn
    off(event: string, handler: EventHandler): void
  }
  ui: {
    registerWidget(widget: WidgetDefinition): void
    registerPage(page: PageDefinition): void
    registerNavItem(item: NavItemDefinition): void
  }
  getProfile(): UserProfile
  gamification: {
    addPoints(amount: number, reason: string): void
    checkAchievement(achievementId: string): void
  }
  /**
   * Registry de métricas cross-plugin. Un plugin publica un valor numérico
   * bajo un id estable (`<pluginId>.<snake_case>`) y otros plugins
   * (típicamente Goals/OKRs) lo consumen sin acoplarse al store productor.
   * Solo se almacena el último valor; no es una serie temporal.
   */
  metrics: {
    publish(metricId: string, value: number): void
    get(metricId: string): number | undefined
    list(): Array<{ id: string; value: number; updatedAt: number }>
  }
}

// ─── Plugin Manifest ───

export interface OnboardingQuestion {
  id: string
  text: string
  type: 'text' | 'number' | 'select'
  options?: string[]
}

/**
 * Dominio semántico del plugin: describe DE QUÉ TRATA el plugin (su contenido),
 * NO el theme visual de la app. Usado por el Consistency Auditor (R6) para
 * verificar que la iconografía sea coherente con el dominio.
 */
export type PluginDomain =
  | 'finance'
  | 'health'
  | 'fitness'
  | 'nutrition'
  | 'nature'
  | 'knowledge'
  | 'reading'
  | 'productivity'
  | 'habits'
  | 'social'
  | 'travel'
  | 'creativity'
  | 'music'
  | 'gaming'
  | 'spirituality'
  | 'home'
  | 'pets'
  | 'weather'
  | 'time'
  | 'utility'

/** Nombre de un ícono de lucide-react (string, validado por catálogo). */
export type LucideIconName = string

export interface PluginIconography {
  /** Ícono principal del plugin. Debe pertenecer al catálogo del dominio. */
  primary: LucideIconName
  /** Íconos auxiliares que el plugin promete usar (extienden el catálogo). */
  gallery?: LucideIconName[]
}

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  icon: string

  /**
   * Dominio semántico del plugin (R6 audit). Describe el contenido del
   * plugin (finanzas → billetes, naturaleza → hojas). Independiente del theme
   * visual de la app.
   */
  domain?: PluginDomain
  /** Sub-temas libres dentro del dominio (ej: ["garden","plants"]). */
  domainKeywords?: string[]
  /** Ícono principal + galería declarada del plugin. */
  iconography?: PluginIconography

  // Lifecycle
  init(api: CoreAPI): Promise<void>
  activate?(): void
  deactivate?(): void

  // UI
  widgets?: WidgetDefinition[]
  pages?: PageDefinition[]
  navItems?: NavItemDefinition[]

  // Events
  events?: {
    emits: string[]
    listens: string[]
  }

  // Onboarding
  onboarding?: {
    questions: OnboardingQuestion[]
    onComplete: (answers: Record<string, unknown>) => void
  }

  // Storage
  collections?: string[]
  migrations?: Migration[]
}

// ─── Plugin State ───

export type PluginStatus = 'registered' | 'initializing' | 'active' | 'inactive' | 'error'

export interface PluginEntry {
  manifest: PluginManifest
  status: PluginStatus
  error?: string
}
