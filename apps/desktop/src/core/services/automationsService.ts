import { storageAPI } from '@core/storage/StorageAPI'
import { eventBus } from '@core/events/EventBus'
import { useGamificationStore } from '@core/gamification/gamificationStore'

export interface Automation {
  id: number
  name: string
  enabled: number
  trigger_event: string
  condition: string | null
  action_type: string
  action_payload: string | null
  last_run_at: string | null
  run_count: number
  created_at: string
}

export type ActionType =
  | 'notify' // payload: { title, body? }
  | 'add_xp' // payload: { amount, reason }
  | 'emit_event' // payload: { event, payload? }
  | 'log' // payload: { message }

export interface AutomationDraft {
  name: string
  triggerEvent: string
  condition?: string | null
  actionType: ActionType
  actionPayload: Record<string, unknown>
  enabled?: boolean
}

const VALID_EVENT = /^[A-Z][A-Z0-9_]{1,80}$/

function assertDraft(draft: AutomationDraft): void {
  if (!draft.name || draft.name.length > 120) throw new Error('Nombre requerido (max 120)')
  if (!VALID_EVENT.test(draft.triggerEvent)) throw new Error('Evento trigger inválido (formato MAYUS_CON_GUIONES)')
  if (!['notify', 'add_xp', 'emit_event', 'log'].includes(draft.actionType)) throw new Error('actionType inválido')
}

/**
 * Evaluate a JS-like condition expression against the payload safely.
 * Supports a tiny subset: variable, comparisons, &&, ||, !, parentheses, numbers, strings.
 * Variables are resolved via `payload.<key>` or just `<key>` (looked up in payload).
 */
function evalCondition(condition: string, payload: unknown): boolean {
  if (!condition.trim()) return true
  // Whitelist characters to avoid arbitrary code execution
  if (!/^[\w\s.()'"!=<>&|+\-*/%,?:[\]]+$/.test(condition)) {
    console.warn('[automations] Condición rechazada por contener caracteres no permitidos')
    return false
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function('payload', `with(payload || {}) { return Boolean(${condition}); }`)
    return Boolean(fn(payload))
  } catch (err) {
    console.warn('[automations] Error evaluando condición:', err)
    return false
  }
}

async function runAction(automation: Automation, payload: unknown): Promise<void> {
  let parsed: Record<string, unknown> = {}
  if (automation.action_payload) {
    try { parsed = JSON.parse(automation.action_payload) as Record<string, unknown> } catch { parsed = {} }
  }
  switch (automation.action_type) {
    case 'notify': {
      if (window.notifications) {
        await window.notifications.show({
          title: String(parsed.title ?? automation.name),
          body: parsed.body ? String(parsed.body) : undefined,
        })
      }
      break
    }
    case 'add_xp': {
      const amount = Number(parsed.amount ?? 0)
      if (!Number.isFinite(amount) || amount === 0) break
      useGamificationStore.getState().addPoints(amount, String(parsed.reason ?? automation.name))
      break
    }
    case 'emit_event': {
      const ev = String(parsed.event ?? '')
      if (!VALID_EVENT.test(ev)) break
      eventBus.emit(ev, parsed.payload ?? payload, { source: 'automations', persist: true })
      break
    }
    case 'log': {
      console.log(`[automations:${automation.name}]`, parsed.message ?? payload)
      break
    }
  }
}

let initialized = false
const subscriptions = new Map<string, () => void>()

async function reinstallSubscriptions(): Promise<void> {
  for (const unsub of subscriptions.values()) unsub()
  subscriptions.clear()
  const list = await automationsService.list({ enabled: true })
  const byEvent = new Map<string, Automation[]>()
  for (const a of list) {
    const arr = byEvent.get(a.trigger_event) ?? []
    arr.push(a)
    byEvent.set(a.trigger_event, arr)
  }
  for (const [event, automations] of byEvent.entries()) {
    const handler = (payload: unknown) => {
      for (const a of automations) {
        if (a.condition && !evalCondition(a.condition, payload)) continue
        void runAction(a, payload).catch((err) => console.error('[automations] action error', err))
        void storageAPI.execute(
          "UPDATE core_automations SET last_run_at = datetime('now'), run_count = run_count + 1 WHERE id = ?",
          [a.id],
        )
      }
    }
    const unsub = eventBus.on(event, handler)
    subscriptions.set(event, unsub)
  }
}

export const automationsService = {
  async init(): Promise<void> {
    if (initialized) return
    initialized = true
    await reinstallSubscriptions()
  },

  async list(filter?: { enabled?: boolean }): Promise<Automation[]> {
    if (filter?.enabled === true) {
      return storageAPI.query<Automation>('SELECT * FROM core_automations WHERE enabled = 1 ORDER BY id DESC')
    }
    return storageAPI.query<Automation>('SELECT * FROM core_automations ORDER BY id DESC')
  },

  async create(draft: AutomationDraft): Promise<number> {
    assertDraft(draft)
    const result = await storageAPI.execute(
      `INSERT INTO core_automations (name, enabled, trigger_event, condition, action_type, action_payload)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        draft.name,
        draft.enabled === false ? 0 : 1,
        draft.triggerEvent,
        draft.condition ?? null,
        draft.actionType,
        JSON.stringify(draft.actionPayload ?? {}),
      ],
    )
    await reinstallSubscriptions()
    return result.lastInsertRowid
  },

  async update(id: number, draft: AutomationDraft): Promise<void> {
    assertDraft(draft)
    await storageAPI.execute(
      `UPDATE core_automations
       SET name = ?, enabled = ?, trigger_event = ?, condition = ?, action_type = ?, action_payload = ?
       WHERE id = ?`,
      [
        draft.name,
        draft.enabled === false ? 0 : 1,
        draft.triggerEvent,
        draft.condition ?? null,
        draft.actionType,
        JSON.stringify(draft.actionPayload ?? {}),
        id,
      ],
    )
    await reinstallSubscriptions()
  },

  async toggle(id: number, enabled: boolean): Promise<void> {
    await storageAPI.execute('UPDATE core_automations SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id])
    await reinstallSubscriptions()
  },

  async remove(id: number): Promise<void> {
    await storageAPI.execute('DELETE FROM core_automations WHERE id = ?', [id])
    await reinstallSubscriptions()
  },
}
