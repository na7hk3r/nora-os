/**
 * Tests críticos para el IPC de cifrado en reposo de la DB (dbencryption:*).
 * Mockea DatabaseService.getInstance() para ejercitar cada canal sin SQLite real.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import { ipcMain } from 'electron'
import { EncryptionError } from '../../electron/services/encryption'
import { registerDbEncryptionIpc } from '../../electron/services/db-encryption-ipc'

const dbMock = vi.hoisted(() => ({
  getActiveUserId: vi.fn(),
  isEncryptionEnabledForActiveUser: vi.fn(),
  hasEncryptedDb: vi.fn(),
  isLocked: vi.fn(),
  unlockEncryptedDb: vi.fn(),
  enableEncryptionForActiveUser: vi.fn(),
  disableEncryptionForActiveUser: vi.fn(),
}))

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
}))

vi.mock('../../electron/services/database', () => ({
  DatabaseService: { getInstance: () => dbMock },
}))

type Handler = (...args: unknown[]) => unknown

describe('registerDbEncryptionIpc', () => {
  let handlers: Map<string, Handler>
  const handleMock = ipcMain.handle as unknown as Mock

  beforeEach(() => {
    for (const fn of Object.values(dbMock)) {
      const mockFn = fn as Mock
      mockFn.mockReset()
    }
    handleMock.mockReset()
    handlers = new Map()
    registerDbEncryptionIpc()
    for (const [channel, fn] of handleMock.mock.calls) {
      handlers.set(channel as string, fn as Handler)
    }
  })

  it('dbencryption:status reporta el estado con usuario activo', () => {
    dbMock.getActiveUserId.mockReturnValue('u1')
    dbMock.isEncryptionEnabledForActiveUser.mockReturnValue(true)
    dbMock.hasEncryptedDb.mockReturnValue(true)
    dbMock.isLocked.mockReturnValue(false)

    expect(handlers.get('dbencryption:status')!({})).toEqual({
      enabled: true,
      hasEncryptedAtRest: true,
      locked: false,
    })
    expect(dbMock.hasEncryptedDb).toHaveBeenCalledWith('u1')
  })

  it('dbencryption:status no consulta el archivo cifrado sin usuario activo', () => {
    dbMock.getActiveUserId.mockReturnValue(null)
    dbMock.isEncryptionEnabledForActiveUser.mockReturnValue(false)
    dbMock.isLocked.mockReturnValue(true)

    expect(handlers.get('dbencryption:status')!({})).toEqual({
      enabled: false,
      hasEncryptedAtRest: false,
      locked: true,
    })
    expect(dbMock.hasEncryptedDb).not.toHaveBeenCalled()
  })

  it('dbencryption:unlock devuelve ok cuando la DB se desbloquea', () => {
    expect(handlers.get('dbencryption:unlock')!({}, 'passphrase-larga')).toEqual({ ok: true })
    expect(dbMock.unlockEncryptedDb).toHaveBeenCalledWith('passphrase-larga')
  })

  it('dbencryption:unlock traduce EncryptionError a código', () => {
    dbMock.unlockEncryptedDb.mockImplementation(() => {
      throw new EncryptionError('passphrase incorrecta', 'BAD_PASSPHRASE')
    })

    expect(handlers.get('dbencryption:unlock')!({}, 'incorrecta')).toEqual({
      ok: false,
      code: 'BAD_PASSPHRASE',
      message: 'passphrase incorrecta',
    })
  })

  it('dbencryption:unlock traduce errores genéricos a código IO', () => {
    dbMock.unlockEncryptedDb.mockImplementation(() => {
      throw new Error('archivo ilegible')
    })

    expect(handlers.get('dbencryption:unlock')!({}, 'passphrase-larga')).toEqual({
      ok: false,
      code: 'IO',
      message: 'archivo ilegible',
    })
  })

  it('dbencryption:check-strength valida fortaleza incluso con passphrase ausente', () => {
    expect(handlers.get('dbencryption:check-strength')!({}, 'clave-fuerte-123')).toEqual({
      strong: true,
    })
    expect(handlers.get('dbencryption:check-strength')!({}, 'corta')).toEqual({ strong: false })
    expect(handlers.get('dbencryption:check-strength')!({}, undefined)).toEqual({ strong: false })
  })

  it('dbencryption:enable activa el cifrado y traduce errores', () => {
    expect(handlers.get('dbencryption:enable')!({}, 'passphrase-larga')).toEqual({ ok: true })
    expect(dbMock.enableEncryptionForActiveUser).toHaveBeenCalledWith('passphrase-larga')

    dbMock.enableEncryptionForActiveUser.mockImplementation(() => {
      throw new EncryptionError('passphrase débil', 'WEAK_PASSPHRASE')
    })
    expect(handlers.get('dbencryption:enable')!({}, 'corta')).toEqual({
      ok: false,
      code: 'WEAK_PASSPHRASE',
      message: 'passphrase débil',
    })

    dbMock.enableEncryptionForActiveUser.mockImplementation(() => {
      throw new Error('sin espacio en disco')
    })
    expect(handlers.get('dbencryption:enable')!({}, 'passphrase-larga')).toEqual({
      ok: false,
      code: 'IO',
      message: 'sin espacio en disco',
    })
  })

  it('dbencryption:disable desactiva el cifrado y traduce errores', () => {
    expect(handlers.get('dbencryption:disable')!({})).toEqual({ ok: true })
    expect(dbMock.disableEncryptionForActiveUser).toHaveBeenCalledTimes(1)

    dbMock.disableEncryptionForActiveUser.mockImplementation(() => {
      throw new Error('la DB no está cifrada')
    })
    expect(handlers.get('dbencryption:disable')!({})).toEqual({
      ok: false,
      message: 'la DB no está cifrada',
    })
  })
})