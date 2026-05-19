import { storageAPI } from '@core/storage/StorageAPI'
import { useCoreStore } from '@core/state/coreStore'
import { pluginManager } from '@core/plugins/PluginManager'

export interface QueuedNotification {
  id: number
  title: string
  body: string | null
  source: string | null
  scheduled_at: string
  delivered_at: string | null
  dismissed_at: string | null
  created_at: string
}

export interface QuietHours {
  enabled: boolean
  startMinutes: number // 0..1439 (e.g. 22*60)
  endMinutes: number
}

export const QUIET_HOURS_KEY = 'core:quietHours'

let pollTimer: ReturnType<typeof setInterval> | null = null

function nowMinutes(): number {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function isQuiet(quiet: QuietHours): boolean {
  if (!quiet.enabled) return false
  const m = nowMinutes()
  if (quiet.startMinutes === quiet.endMinutes) return false
  if (quiet.startMinutes < quiet.endMinutes) {
    return m >= quiet.startMinutes && m < quiet.endMinutes
  }
  // wraps midnight
  return m >= quiet.startMinutes || m < quiet.endMinutes
}

async function loadQuietHours(): Promise<QuietHours> {
  if (!window.storage) return { enabled: false, startMinutes: 22 * 60, endMinutes: 7 * 60 }
  const rows = await window.storage.query(
    'SELECT value FROM settings WHERE key = ?',
    [QUIET_HOURS_KEY],
  ) as { value: string }[]
  if (!rows[0]) return { enabled: false, startMinutes: 22 * 60, endMinutes: 7 * 60 }
  try { return JSON.parse(rows[0].value) as QuietHours } catch {
    return { enabled: false, startMinutes: 22 * 60, endMinutes: 7 * 60 }
  }
}

async function saveQuietHours(quiet: QuietHours): Promise<void> {
  if (!window.storage) return
  await window.storage.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [QUIET_HOURS_KEY, JSON.stringify(quiet)],
  )
}

async function processQueue(): Promise<void> {
  if (!window.notifications || !window.storage) return
  const quiet = await loadQuietHours()
  if (isQuiet(quiet)) return
  const due = await storageAPI.query<QueuedNotification>(
    `SELECT * FROM core_notifications_queue
     WHERE delivered_at IS NULL AND dismissed_at IS NULL AND scheduled_at <= datetime('now')
     ORDER BY scheduled_at ASC LIMIT 5`,
  )

  // Auditor R4: filtrar notificaciones cuya fuente sea un plugin inactivo.
  // Las fuentes core conocidas (`core`, `instant`, `automations`) siempre se
  // entregan; si la fuente es un pluginId, solo entregamos cuando ese plugin
  // está activo o no está registrado en absoluto (notificaciones legacy).
  const activePluginIds = new Set(useCoreStore.getState().activePlugins)
  const knownPluginIds = new Set(pluginManager.getAllPlugins().map((e) => e.manifest.id))
  const CORE_SOURCES = new Set(['core', 'instant', 'automations'])

  for (const n of due) {
    const source = n.source ?? ''
    const isCoreSource = !source || CORE_SOURCES.has(source)
    const isKnownPlugin = knownPluginIds.has(source)
    const isActivePlugin = activePluginIds.has(source)
    if (!isCoreSource && isKnownPlugin && !isActivePlugin) {
      // Plugin conocido pero inactivo: no entregar; marcar como descartada
      // para que no quede pendiente para siempre.
      await storageAPI.execute(
        "UPDATE core_notifications_queue SET dismissed_at = datetime('now') WHERE id = ?",
        [n.id],
      )
      continue
    }
    try {
      await window.notifications.show({ title: n.title, body: n.body ?? undefined })
      await storageAPI.execute(
        "UPDATE core_notifications_queue SET delivered_at = datetime('now') WHERE id = ?",
        [n.id],
      )
    } catch (err) {
      console.error('[notifications] error showing notification', err)
    }
  }
}

export const notificationsService = {
  async init(): Promise<void> {
    if (pollTimer) return
    pollTimer = setInterval(() => { void processQueue() }, 30_000)
    void processQueue()
  },

  async stop(): Promise<void> {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  },

  async enqueue(payload: { title: string; body?: string; source?: string; scheduledAt?: Date | string }): Promise<number> {
    const scheduled = payload.scheduledAt instanceof Date
      ? payload.scheduledAt.toISOString().slice(0, 19).replace('T', ' ')
      : payload.scheduledAt ?? new Date().toISOString().slice(0, 19).replace('T', ' ')
    const result = await storageAPI.execute(
      `INSERT INTO core_notifications_queue (title, body, source, scheduled_at) VALUES (?, ?, ?, ?)`,
      [payload.title, payload.body ?? null, payload.source ?? null, scheduled],
    )
    void processQueue()
    return result.lastInsertRowid
  },

  async showNow(payload: { title: string; body?: string }): Promise<void> {
    if (!window.notifications) return
    const quiet = await loadQuietHours()
    if (isQuiet(quiet)) {
      await this.enqueue({ ...payload, source: 'instant', scheduledAt: new Date(Date.now() + 1000) })
      return
    }
    await window.notifications.show(payload)
  },

  async list(limit = 50): Promise<QueuedNotification[]> {
    return storageAPI.query<QueuedNotification>(
      'SELECT * FROM core_notifications_queue ORDER BY id DESC LIMIT ?',
      [Math.min(Math.max(1, limit), 200)],
    )
  },

  /**
   * Conteo de notificaciones no leídas. Una notificación se considera no
   * leída mientras `dismissed_at` sea NULL — el campo se reutiliza como
   * marca "leída/descartada" para evitar una migración de schema.
   */
  async unreadCount(): Promise<number> {
    const rows = await storageAPI.query<{ c: number }>(
      'SELECT COUNT(*) as c FROM core_notifications_queue WHERE dismissed_at IS NULL',
    )
    return rows[0]?.c ?? 0
  },

  async markAsRead(id: number): Promise<void> {
    await storageAPI.execute(
      "UPDATE core_notifications_queue SET dismissed_at = datetime('now') WHERE id = ? AND dismissed_at IS NULL",
      [id],
    )
  },

  async markAllAsRead(): Promise<void> {
    await storageAPI.execute(
      "UPDATE core_notifications_queue SET dismissed_at = datetime('now') WHERE dismissed_at IS NULL",
    )
  },

  async dismiss(id: number): Promise<void> {
    await storageAPI.execute(
      "UPDATE core_notifications_queue SET dismissed_at = datetime('now') WHERE id = ?",
      [id],
    )
  },

  getQuietHours: loadQuietHours,
  setQuietHours: saveQuietHours,
}
