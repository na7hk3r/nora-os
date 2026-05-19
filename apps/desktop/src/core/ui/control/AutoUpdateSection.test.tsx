import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AppUpdateBridge, AppUpdateStatus } from '../../types'
import { AutoUpdateSection } from './AutoUpdateSection'

const originalAppUpdate = window.appUpdate

function installAppUpdateBridge(status: AppUpdateStatus): AppUpdateBridge {
  const bridge: AppUpdateBridge = {
    getStatus: vi.fn().mockResolvedValue(status),
    checkForUpdates: vi.fn().mockResolvedValue(status),
    downloadUpdate: vi.fn().mockResolvedValue(status),
    quitAndInstall: vi.fn().mockResolvedValue(undefined),
    onStatus: vi.fn(() => vi.fn()),
  }

  Object.defineProperty(window, 'appUpdate', {
    configurable: true,
    writable: true,
    value: bridge,
  })

  return bridge
}

describe('AutoUpdateSection', () => {
  afterEach(() => {
    Object.defineProperty(window, 'appUpdate', {
      configurable: true,
      writable: true,
      value: originalAppUpdate,
    })
    vi.restoreAllMocks()
  })

  it('shows a manual download fallback without leaking the technical updater error', async () => {
    installAppUpdateBridge({
      state: 'error',
      message:
        'No pudimos conectar con el servidor de actualizaciones. Descargá manualmente la última versión desde el sitio oficial.',
      manualDownloadUrl: 'https://na7hk3r.github.io/nora-os/#download',
    })

    render(<AutoUpdateSection />)

    expect(
      await screen.findByText(
        'No pudimos conectar con el servidor de actualizaciones. Descargá manualmente la última versión desde el sitio oficial.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/ERR_NAME_NOT_RESOLVED/i)).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: /descargar desde el sitio oficial/i })
    expect(link).toHaveAttribute('href', 'https://na7hk3r.github.io/nora-os/#download')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
