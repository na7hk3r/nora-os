import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  classifyAssets,
  useLatestRelease,
} from '../hooks/useLatestRelease'

const RAW = {
  tag_name: 'v2.0.0',
  published_at: '2026-04-30T12:00:00Z',
  html_url: 'https://github.com/na7hk3r/nora-os/releases/tag/v2.0.0',
  assets: [
    {
      name: 'Nora-OS-Setup-2.0.0.exe',
      browser_download_url: 'https://x/setup.exe',
      size: 1,
    },
    {
      name: 'Nora-OS-2.0.0-portable.exe',
      browser_download_url: 'https://x/portable.exe',
      size: 2,
    },
    {
      name: 'app.AppImage',
      browser_download_url: 'https://x/app.AppImage',
      size: 3,
    },
    { name: 'app.deb', browser_download_url: 'https://x/app.deb', size: 4 },
    { name: 'app.dmg', browser_download_url: 'https://x/app.dmg', size: 5 },
  ],
}

describe('classifyAssets', () => {
  it('clasifica correctamente los assets por SO/tipo', () => {
    const result = classifyAssets(RAW.assets)
    expect(result.windows?.url).toBe('https://x/setup.exe')
    expect(result.windowsPortable?.url).toBe('https://x/portable.exe')
    expect(result.linuxAppImage?.url).toBe('https://x/app.AppImage')
    expect(result.linuxDeb?.url).toBe('https://x/app.deb')
    expect(result.macDmg?.url).toBe('https://x/app.dmg')
    expect(result.all).toHaveLength(5)
  })

  it('devuelve undefined cuando no hay match', () => {
    const result = classifyAssets([])
    expect(result.windows).toBeUndefined()
    expect(result.macDmg).toBeUndefined()
    expect(result.all).toEqual([])
  })
})

describe('useLatestRelease', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('hace fetch y devuelve el último release', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(RAW),
      } as unknown as Response),
    ) as typeof fetch

    const { result } = renderHook(() => useLatestRelease())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.release?.version).toBe('2.0.0')
    expect(result.current.release?.assets.windows?.url).toBe('https://x/setup.exe')
    expect(result.current.error).toBeNull()
  })

  it('cachea en sessionStorage por 10 minutos', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(RAW),
      } as unknown as Response),
    ) as typeof fetch
    globalThis.fetch = fetchMock

    const { result, unmount } = renderHook(() => useLatestRelease())
    await waitFor(() => expect(result.current.release).not.toBeNull())
    unmount()

    expect(sessionStorage.getItem('nora-os:latest-release')).not.toBeNull()

    // Segunda invocación debería leer de cache, sin nuevo fetch
    const callsBefore = (fetchMock as unknown as { mock: { calls: unknown[] } }).mock.calls.length
    const { result: r2 } = renderHook(() => useLatestRelease())
    expect(r2.current.release?.version).toBe('2.0.0')
    expect((fetchMock as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBe(callsBefore)
  })

  it('reporta error si la API falla', async () => {
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({ ok: false, status: 503 } as unknown as Response),
    ) as typeof fetch

    const { result } = renderHook(() => useLatestRelease())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toMatch(/503/)
    expect(result.current.release).toBeNull()
  })
})
