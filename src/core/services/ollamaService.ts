import type { OllamaGenerateRequest, OllamaHealth, OllamaModel } from '@core/types'

const OLLAMA_SETTINGS_KEY = 'core:ollamaSettings'

export interface OllamaSettings {
  enabled: boolean
  model: string
  systemPrompt: string
  // 0..1 - mas alto = mas creativo
  temperature: number
}
export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  enabled: false,
  model: 'llama3.2:3b',
  systemPrompt:
    'Sos Pulso Nora, el componente vivo de progreso de Nora OS, acompanado por Nori. ' +
    'Hablas en español rioplatense, breve, motivador, sin emojis. ' +
    'Te basas en datos reales del usuario que se incluyen en el prompt. Si los datos estan vacios, ' +
    'reconocelo en lugar de inventar. Sugeris un unico proximo paso accionable cuando sea pertinente.',
  temperature: 0.6,
}

async function loadSettings(): Promise<OllamaSettings> {
  if (!window.storage) return { ...DEFAULT_OLLAMA_SETTINGS }
  const rows = await window.storage.query(
    'SELECT value FROM settings WHERE key = ?',
    [OLLAMA_SETTINGS_KEY],
  ) as { value: string }[]
  if (!rows[0]) return { ...DEFAULT_OLLAMA_SETTINGS }
  try {
    const parsed = JSON.parse(rows[0].value) as Partial<OllamaSettings>
    return { ...DEFAULT_OLLAMA_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_OLLAMA_SETTINGS }
  }
}

async function saveSettings(settings: OllamaSettings): Promise<void> {
  if (!window.storage) return
  await window.storage.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [OLLAMA_SETTINGS_KEY, JSON.stringify(settings)],
  )
}

export const ollamaService = {
  getSettings: loadSettings,
  saveSettings,

  async health(): Promise<OllamaHealth> {
    if (!window.ollama) return { ok: false, baseUrl: '', error: 'Bridge no disponible' }
    return window.ollama.health()
  },

  async listModels(): Promise<OllamaModel[]> {
    if (!window.ollama) return []
    return window.ollama.listModels()
  },

  async pullModel(model: string): Promise<void> {
    if (!window.ollama) throw new Error('Ollama bridge no disponible')
    await window.ollama.pullModel(model)
  },

  async generate(prompt: string, opts?: { systemOverride?: string; modelOverride?: string }): Promise<string> {
    if (!window.ollama) throw new Error('Ollama bridge no disponible')
    const settings = await loadSettings()
    if (!settings.enabled) throw new Error('Ollama está deshabilitado en Configuración')
    const req: OllamaGenerateRequest = {
      model: opts?.modelOverride ?? settings.model,
      prompt,
      system: opts?.systemOverride ?? settings.systemPrompt,
      options: { temperature: settings.temperature },
    }
    const result = await window.ollama.generate(req)
    return result.text
  },

  async isReady(): Promise<{ enabled: boolean; healthy: boolean; reason?: string }> {
    const settings = await loadSettings()
    if (!settings.enabled) return { enabled: false, healthy: false, reason: 'disabled' }
    const h = await this.health()
    return { enabled: true, healthy: h.ok, reason: h.error }
  },
}
