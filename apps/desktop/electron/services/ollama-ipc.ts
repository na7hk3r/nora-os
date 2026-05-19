import { ipcMain, net } from 'electron'

const CHANNELS = {
  health: 'ollama:health',
  generate: 'ollama:generate',
  listModels: 'ollama:list-models',
  pullModel: 'ollama:pull-model',
} as const

const DEFAULT_BASE = 'http://127.0.0.1:11434'

function getBase(): string {
  return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_BASE
}

interface OllamaRequest {
  model: string
  prompt: string
  system?: string
  options?: Record<string, unknown>
}

function postJson<T = unknown>(path: string, body: unknown, timeoutMs = 60_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = net.request({
      method: 'POST',
      url: `${getBase()}${path}`,
    })
    req.setHeader('Content-Type', 'application/json')

    const chunks: Buffer[] = []
    const timer = setTimeout(() => {
      try { req.abort() } catch { /* noop */ }
      reject(new Error(`Ollama request timeout after ${timeoutMs}ms`))
    }, timeoutMs)

    req.on('response', (response) => {
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        clearTimeout(timer)
        const text = Buffer.concat(chunks).toString('utf-8')
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Ollama HTTP ${response.statusCode}: ${text}`))
          return
        }
        try {
          resolve(JSON.parse(text) as T)
        } catch (err) {
          reject(new Error(`Ollama response is not valid JSON: ${(err as Error).message}`))
        }
      })
      response.on('error', (err) => { clearTimeout(timer); reject(err) })
    })
    req.on('error', (err) => { clearTimeout(timer); reject(err) })
    req.write(JSON.stringify(body))
    req.end()
  })
}

function getJson<T = unknown>(path: string, timeoutMs = 5_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: 'GET', url: `${getBase()}${path}` })
    const chunks: Buffer[] = []
    const timer = setTimeout(() => {
      try { req.abort() } catch { /* noop */ }
      reject(new Error(`Ollama request timeout after ${timeoutMs}ms`))
    }, timeoutMs)
    req.on('response', (response) => {
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        clearTimeout(timer)
        const text = Buffer.concat(chunks).toString('utf-8')
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`Ollama HTTP ${response.statusCode}: ${text}`))
          return
        }
        try { resolve(JSON.parse(text) as T) } catch (err) {
          reject(new Error(`Ollama response is not valid JSON: ${(err as Error).message}`))
        }
      })
      response.on('error', (err) => { clearTimeout(timer); reject(err) })
    })
    req.on('error', (err) => { clearTimeout(timer); reject(err) })
    req.end()
  })
}

export function registerOllamaIpc(): void {
  ipcMain.handle(CHANNELS.health, async () => {
    try {
      // Ollama exposes GET / returning a small string; use /api/tags for richer info
      await getJson<{ models: unknown[] }>('/api/tags', 3_000)
      return { ok: true, baseUrl: getBase() }
    } catch (err) {
      return { ok: false, baseUrl: getBase(), error: (err as Error).message }
    }
  })

  ipcMain.handle(CHANNELS.listModels, async () => {
    const data = await getJson<{ models: { name: string; size: number; modified_at: string }[] }>('/api/tags', 5_000)
    return data.models?.map((m) => ({ name: m.name, size: m.size, modifiedAt: m.modified_at })) ?? []
  })

  ipcMain.handle(CHANNELS.pullModel, async (_event, payload: unknown) => {
    if (typeof payload !== 'string' || payload.trim().length === 0) {
      throw new Error('model requerido')
    }
    const model = payload.trim()
    const result = await postJson<{ status?: string }>('/api/pull', {
      model,
      stream: false,
    }, 600_000)
    return { ok: true, model, status: result.status }
  })

  ipcMain.handle(CHANNELS.generate, async (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Payload inválido')
    }
    const req = payload as Partial<OllamaRequest>
    if (typeof req.model !== 'string' || req.model.length === 0) {
      throw new Error('model requerido')
    }
    if (typeof req.prompt !== 'string' || req.prompt.length === 0) {
      throw new Error('prompt requerido')
    }
    const body = {
      model: req.model,
      prompt: req.prompt,
      system: req.system,
      stream: false,
      options: req.options ?? {},
    }
    const result = await postJson<{ response: string; done: boolean; total_duration?: number }>(
      '/api/generate',
      body,
      120_000,
    )
    return { text: result.response, durationMs: result.total_duration ? Math.round(result.total_duration / 1e6) : undefined }
  })
}
