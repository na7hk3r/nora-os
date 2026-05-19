import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DownloadButton } from '../components/DownloadButton'
import { detectOS } from '../hooks/useDetectOS'

const mockRelease = {
  tag_name: 'v1.8.1',
  published_at: '2026-04-20T10:00:00Z',
  html_url: 'https://github.com/na7hk3r/nora-os/releases/tag/v1.8.1',
  assets: [
    {
      name: 'Nora-OS-Setup-1.8.1.exe',
      browser_download_url: 'https://example.com/setup.exe',
      size: 90 * 1024 * 1024,
    },
    {
      name: 'Nora-OS-1.8.1-portable.exe',
      browser_download_url: 'https://example.com/portable.exe',
      size: 85 * 1024 * 1024,
    },
    {
      name: 'Nora-OS-1.8.1.AppImage',
      browser_download_url: 'https://example.com/app.AppImage',
      size: 95 * 1024 * 1024,
    },
    {
      name: 'Nora-OS-1.8.1.dmg',
      browser_download_url: 'https://example.com/app.dmg',
      size: 100 * 1024 * 1024,
    },
  ],
}

beforeEach(() => {
  globalThis.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockRelease),
    } as unknown as Response),
  ) as typeof fetch
})

describe('DownloadButton', () => {
  it('apunta al instalador Windows cuando se fuerza OS=windows', async () => {
    render(<DownloadButton forceOS="windows" />)
    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'https://example.com/setup.exe',
      )
    })
    expect(screen.getByRole('link')).toHaveTextContent(/Windows/i)
  })

  it('apunta al .dmg en macOS', async () => {
    render(<DownloadButton forceOS="mac" />)
    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'https://example.com/app.dmg',
      )
    })
  })

  it('apunta al AppImage en Linux', async () => {
    render(<DownloadButton forceOS="linux" />)
    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'https://example.com/app.AppImage',
      )
    })
  })

  it('cae al instalador Windows si OS=unknown (nunca a la página de releases)', async () => {
    render(<DownloadButton forceOS="unknown" />)
    await waitFor(() => {
      expect(screen.getByRole('link')).toHaveAttribute(
        'href',
        'https://example.com/setup.exe',
      )
    })
  })
})

describe('detectOS', () => {
  it('detecta Windows desde el userAgent', () => {
    expect(
      detectOS(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0',
      ),
    ).toBe('windows')
  })

  it('detecta macOS', () => {
    expect(
      detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/605.1.15'),
    ).toBe('mac')
  })

  it('detecta Linux', () => {
    expect(detectOS('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')).toBe('linux')
  })

  it('cae a unknown para userAgents inesperados', () => {
    expect(detectOS('SomeRandomBot/1.0')).toBe('unknown')
  })
})
