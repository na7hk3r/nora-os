import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BackupBridge } from '../../types'
import { BackupSection } from './BackupSection'

const originalBackup = window.backup

function installBackupBridge(overrides: Partial<BackupBridge> = {}): BackupBridge {
  const bridge: BackupBridge = {
    exportPlain: vi.fn().mockResolvedValue({ ok: true, path: 'C:\\backups\\plain.db' }),
    exportEncrypted: vi.fn().mockResolvedValue({ ok: true, path: 'C:\\backups\\secure.posbak' }),
    importPlain: vi.fn().mockResolvedValue({ ok: true }),
    importEncrypted: vi.fn().mockResolvedValue({ ok: true }),
    ...overrides,
  }

  Object.defineProperty(window, 'backup', {
    configurable: true,
    writable: true,
    value: bridge,
  })

  return bridge
}

describe('BackupSection', () => {
  afterEach(() => {
    Object.defineProperty(window, 'backup', {
      configurable: true,
      writable: true,
      value: originalBackup,
    })
    vi.restoreAllMocks()
  })

  it('exports encrypted backups from an in-app passphrase dialog without using prompt()', async () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('prompt should not be called')
    })
    const backup = installBackupBridge()

    render(<BackupSection />)

    fireEvent.click(screen.getByRole('button', { name: /exportar cifrado/i }))

    expect(await screen.findByRole('dialog', { name: /exportar backup cifrado/i })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/passphrase/i), { target: { value: 'clave1234' } })
    fireEvent.click(screen.getByRole('button', { name: /^exportar backup cifrado$/i }))

    await waitFor(() => expect(backup.exportEncrypted).toHaveBeenCalledWith('clave1234'))
    expect(promptSpy).not.toHaveBeenCalled()
    expect(await screen.findByText(/Backup guardado en C:\\backups\\secure\.posbak\./)).toBeInTheDocument()
  })
})
