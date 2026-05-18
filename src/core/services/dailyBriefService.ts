import { aiContextService } from './aiContextService'
import { ollamaService } from './ollamaService'
import { storageAPI } from '@core/storage/StorageAPI'
import {
  PULSO_NORA_COMPANION_NAME,
  PULSO_NORA_SYSTEM_NAME,
  isRewardUnlocked,
} from '@core/gamification/pulsoNora'

const SETTINGS_KEY_PREFIX = 'core:dailyBrief:'

export interface DailyBrief {
  date: string
  text: string
  source: 'ai' | 'fallback'
  generatedAt: string
}
function todayKey(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function settingKey(date = todayKey()): string {
  return `${SETTINGS_KEY_PREFIX}${date}`
}

interface StoredBrief {
  text: string
  source: 'ai' | 'fallback'
  generatedAt: string
  dismissedAt?: string
}

async function readStored(date: string): Promise<StoredBrief | null> {
  if (!window.storage) return null
  const rows = await storageAPI.query<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [settingKey(date)],
  )
  if (!rows[0]) return null
  try {
    return JSON.parse(rows[0].value) as StoredBrief
  } catch {
    return null
  }
}

async function writeStored(date: string, value: StoredBrief): Promise<void> {
  if (!window.storage) return
  await window.storage.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [settingKey(date), JSON.stringify(value)],
  )
}

function buildPrompt(contextText: string, level: number): string {
  const toneLine = isRewardUnlocked('daily-brief-tone', level)
    ? `${PULSO_NORA_SYSTEM_NAME}: habla como ${PULSO_NORA_COMPANION_NAME}, una presencia viva dentro de Nora OS.`
    : `${PULSO_NORA_SYSTEM_NAME}: manten el brief simple; el tono completo de ${PULSO_NORA_COMPANION_NAME} se activa en nivel 2.`

  return [
    'CONTEXTO REAL DEL USUARIO:',
    contextText,
    '',
    toneLine,
    'TAREA: Devolveme UNA sola línea (máximo 14 palabras) con el próximo paso accionable más útil para hoy.',
    'Tono: español rioplatense con vos. Sin emojis, sin markdown, sin signos de exclamación, sin moralizar.',
    'Si no hay datos relevantes, sugerí registrar la primera acción del día.',
  ].join('\n')
}

function fallbackLine(): string {
  return 'Empezá registrando la primera acción del día para anclar el ritmo.'
}

function trimToOneLine(raw: string): string {
  const first = raw.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0) ?? ''
  return first.replace(/^["'`*\-\d.\s]+/, '').slice(0, 180).trim()
}

export const dailyBriefService = {
  todayKey,

  async getCached(): Promise<DailyBrief | null> {
    const date = todayKey()
    const stored = await readStored(date)
    if (!stored) return null
    if (stored.dismissedAt) return null
    return { date, text: stored.text, source: stored.source, generatedAt: stored.generatedAt }
  },

  async dismissToday(): Promise<void> {
    const date = todayKey()
    const stored = await readStored(date)
    const base: StoredBrief = stored ?? {
      text: '',
      source: 'fallback',
      generatedAt: new Date().toISOString(),
    }
    await writeStored(date, { ...base, dismissedAt: new Date().toISOString() })
  },

  async generate(opts?: { force?: boolean }): Promise<DailyBrief> {
    const date = todayKey()
    if (!opts?.force) {
      const cached = await this.getCached()
      if (cached) return cached
    }

    const snapshot = await aiContextService.snapshot()
    const contextText = aiContextService.asPromptContext(snapshot)
    let text = ''
    let source: 'ai' | 'fallback' = 'fallback'

    try {
      const ready = await ollamaService.isReady()
      if (ready.enabled && ready.healthy) {
        const raw = await ollamaService.generate(buildPrompt(contextText, snapshot.gamification.level))
        const line = trimToOneLine(raw)
        if (line.length > 0) {
          text = line
          source = 'ai'
        }
      }
    } catch {
      // Fallback silencioso: el brief no debe bloquear el arranque.
    }

    if (!text) text = fallbackLine()
    const brief: DailyBrief = { date, text, source, generatedAt: new Date().toISOString() }
    await writeStored(date, { text: brief.text, source: brief.source, generatedAt: brief.generatedAt })
    return brief
  },
}

export const __dailyBriefInternals = {
  buildPrompt,
}
