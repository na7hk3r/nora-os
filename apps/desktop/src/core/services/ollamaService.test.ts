import { describe, expect, it, vi } from 'vitest'
import { ollamaService } from '@core/services/ollamaService'
import type { OllamaPullResponse } from '@core/types'

describe('ollamaService.pullModel', () => {
  it('lanza cuando el bridge responde ok:false (p.ej. web deshabilitado)', async () => {
    const pullModel = vi.fn(async (): Promise<OllamaPullResponse> => ({ ok: false, model: 'x', status: 'unsupported' }))
    Object.defineProperty(window, 'ollama', {
      configurable: true,
      writable: true,
      value: { pullModel },
    })

    await expect(ollamaService.pullModel('llama3.2:3b')).rejects.toThrow(/No se pudo descargar/)
  })

  it('resuelve sin error cuando el bridge responde ok:true', async () => {
    const pullModel = vi.fn(async (): Promise<OllamaPullResponse> => ({ ok: true, model: 'x', status: 'success' }))
    Object.defineProperty(window, 'ollama', {
      configurable: true,
      writable: true,
      value: { pullModel },
    })

    await expect(ollamaService.pullModel('llama3.2:3b')).resolves.toBeUndefined()
  })
})
