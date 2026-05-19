import { aiSuggestionsService } from './aiSuggestionsService'
import { useGamificationStore } from '@core/gamification/gamificationStore'
import { isRewardUnlocked } from '@core/gamification/pulsoNora'

export type CopilotRole = 'user' | 'assistant' | 'system'

export type CopilotActionKind =
  | 'INICIAR_FOCO'
  | 'CREAR_TAREA'
  | 'REGISTRAR_HABITO'

export interface CopilotAction {
  kind: CopilotActionKind
  payload?: string
  raw: string
}

export interface CopilotMessage {
  id: string
  role: CopilotRole
  text: string
  createdAt: string
  pending?: boolean
  error?: string
  action?: CopilotAction | null
  contextHint?: string
}

type Listener = (messages: CopilotMessage[]) => void

const ACTION_REGEX =
  /ACCI[ÓO]N\s*:\s*(INICIAR_FOCO|CREAR_TAREA|REGISTRAR_HABITO)\s*(?::\s*(.+))?/i

function canAttachCopilotAction(level = useGamificationStore.getState().level): boolean {
  return isRewardUnlocked('copilot-actions', level)
}

function parseAction(text: string, opts?: { allowActions?: boolean }): { clean: string; action: CopilotAction | null } {
  const match = text.match(ACTION_REGEX)
  if (!match) return { clean: text.trim(), action: null }
  const kind = match[1].toUpperCase() as CopilotActionKind
  const payload = match[2]?.trim().replace(/^\[|\]$/g, '').trim() || undefined
  const clean = text.replace(ACTION_REGEX, '').trim()
  if (opts?.allowActions === false) return { clean, action: null }
  return { clean, action: { kind, payload, raw: match[0].trim() } }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

class CopilotChatService {
  private messages: CopilotMessage[] = []
  private listeners = new Set<Listener>()

  getMessages(): CopilotMessage[] {
    return this.messages
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  reset(): void {
    this.messages = []
    this.notify()
  }

  pushSystem(text: string, opts?: { contextHint?: string; action?: CopilotAction | null }): CopilotMessage {
    const msg: CopilotMessage = {
      id: newId(),
      role: 'assistant',
      text,
      createdAt: new Date().toISOString(),
      contextHint: opts?.contextHint,
      action: opts?.action ?? null,
    }
    this.messages.push(msg)
    this.notify()
    return msg
  }

  async send(userText: string): Promise<CopilotMessage> {
    const trimmed = userText.trim()
    if (!trimmed) throw new Error('Mensaje vacío')

    const userMsg: CopilotMessage = {
      id: newId(),
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    }
    const placeholder: CopilotMessage = {
      id: newId(),
      role: 'assistant',
      text: '',
      createdAt: new Date().toISOString(),
      pending: true,
    }
    this.messages = [...this.messages, userMsg, placeholder]
    this.notify()

    try {
      const result = await aiSuggestionsService.freeChat(trimmed)
      const { clean, action } = parseAction(result.text, { allowActions: canAttachCopilotAction() })
      const finalMsg: CopilotMessage = {
        ...placeholder,
        text: clean || result.text,
        pending: false,
        action,
        contextHint: result.contextHint,
      }
      this.replace(placeholder.id, finalMsg)
      return finalMsg
    } catch (err) {
      const finalMsg: CopilotMessage = {
        ...placeholder,
        text: '',
        pending: false,
        error: err instanceof Error ? err.message : 'Error inesperado',
      }
      this.replace(placeholder.id, finalMsg)
      return finalMsg
    }
  }

  private replace(id: string, next: CopilotMessage): void {
    this.messages = this.messages.map((m) => (m.id === id ? next : m))
    this.notify()
  }

  private notify(): void {
    const snapshot = [...this.messages]
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch (err) {
        console.error('[copilotChatService] listener error', err)
      }
    }
  }
}

export const copilotChatService = new CopilotChatService()
export { parseAction as __parseCopilotAction, canAttachCopilotAction as __canAttachCopilotAction }
