/**
 * Tests críticos para el IPC de backups (POS-BAK1).
 * Cubre el roundtrip export→import cifrado con passphrase real,
 * cancelaciones de diálogo, validación de passphrase y limpieza de tmp files.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import * as fs from 'fs'
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { registerBackupIpc } from '../../electron/services/backup-ipc'
import { decryptBlob, encryptBlob } from '../../electron/services/passphrase'
import type { DatabaseService } from '../../electron/services/database'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
  },
  BrowserWindow: class MockBrowserWindow {
    static getFocusedWindow = vi.fn(() => null)
    constructor(_opts?: unknown) {}
  },
}))

// fs real delegada, pero con writeFileSync controlable para simular fallos de limpieza.
vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof fs
  return {
    ...actual,
    writeFileSync: vi.fn(((...args: unknown[]) =>
      (actual.writeFileSync as (...a: unknown[]) => void)(...args)) as never),
    __realWriteFileSync: actual.writeFileSync,
  }
})

const MAGIC = Buffer.from('POS-BAK1')
const PAYLOAD = Buffer.from('fake sqlite bytes for backup')

type Handler = (...args: unknown[]) => Promise<unknown>

function createFakeDb() {
  return {
    exportActiveUserDb: vi.fn((destPath: string) => {
      writeFileSync(destPath, PAYLOAD)
    }),
    importActiveUserDb: vi.fn(),
  }
}

describe('registerBackupIpc', () => {
  let root: string
  let handlers: Map<string, Handler>
  let db: ReturnType<typeof createFakeDb>
  const handleMock = ipcMain.handle as unknown as Mock
  const saveDialogMock = dialog.showSaveDialog as unknown as Mock
  const openDialogMock = dialog.showOpenDialog as unknown as Mock
  const getFocusedWindowMock = BrowserWindow.getFocusedWindow as unknown as Mock
  const writeFileSyncMock = fs.writeFileSync as unknown as Mock

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nora-bak-'))
    vi.clearAllMocks()
    getFocusedWindowMock.mockReturnValue(null)
    handlers = new Map()
    db = createFakeDb()
    registerBackupIpc(db as unknown as DatabaseService)
    for (const [channel, fn] of handleMock.mock.calls) {
      handlers.set(channel as string, fn as Handler)
    }
  })

  afterEach(() => {
    writeFileSyncMock.mockRestore()
    rmSync(root, { recursive: true, force: true })
  })

  it('exportPlain cancela sin exportar cuando el diálogo se cancela', async () => {
    saveDialogMock.mockResolvedValue({ canceled: true, filePath: undefined })
    const res = await handlers.get('backup:export-plain')!({})

    expect(res).toEqual({ ok: false, canceled: true })
    expect(db.exportActiveUserDb).not.toHaveBeenCalled()
    // Sin ventana enfocada usa una BrowserWindow oculta como primer argumento.
    expect(saveDialogMock.mock.calls[0][0]).toBeInstanceOf(BrowserWindow)
  })

  it('exportPlain exporta la DB activa con el nombre estampado', async () => {
    const dest = join(root, 'out.db')
    saveDialogMock.mockResolvedValue({ canceled: false, filePath: dest })
    const res = await handlers.get('backup:export-plain')!({})

    expect(res).toEqual({ ok: true, path: dest })
    expect(db.exportActiveUserDb).toHaveBeenCalledWith(dest)
    expect(saveDialogMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        title: 'Guardar backup de Nora OS',
        defaultPath: expect.stringMatching(
          /^personal-os-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.db$/,
        ),
      }),
    )
  })

  it('exportPlain usa la ventana enfocada cuando existe', async () => {
    getFocusedWindowMock.mockReturnValue({ focused: true })
    saveDialogMock.mockResolvedValue({ canceled: true, filePath: undefined })
    await handlers.get('backup:export-plain')!({})

    expect(saveDialogMock.mock.calls[0][0]).toEqual({ focused: true })
  })

  it('exportEncrypted rechaza passphrases de menos de 8 caracteres', async () => {
    await expect(handlers.get('backup:export-encrypted')!({}, undefined)).rejects.toThrow(
      'La passphrase debe tener al menos 8 caracteres',
    )
    await expect(handlers.get('backup:export-encrypted')!({}, '1234567')).rejects.toThrow(
      'La passphrase debe tener al menos 8 caracteres',
    )
    await expect(handlers.get('backup:export-encrypted')!({}, 42)).rejects.toThrow(
      'La passphrase debe tener al menos 8 caracteres',
    )
    expect(db.exportActiveUserDb).not.toHaveBeenCalled()
  })

  it('exportEncrypted cancela sin exportar', async () => {
    saveDialogMock.mockResolvedValue({ canceled: true, filePath: undefined })
    const res = await handlers.get('backup:export-encrypted')!({}, 'passphrase-larga')

    expect(res).toEqual({ ok: false, canceled: true })
    expect(db.exportActiveUserDb).not.toHaveBeenCalled()
  })

  it('exportEncrypted escribe un blob POS-BAK1 descifrable y limpia el tmp', async () => {
    const dest = join(root, 'backup.posbak')
    saveDialogMock.mockResolvedValue({ canceled: false, filePath: dest })
    const res = await handlers.get('backup:export-encrypted')!({}, 'passphrase-larga')

    expect(res).toEqual({ ok: true, path: dest })
    expect(db.exportActiveUserDb).toHaveBeenCalledWith(`${dest}.tmp.db`)
    const blob = readFileSync(dest)
    expect(decryptBlob('passphrase-larga', blob, MAGIC)).toEqual(PAYLOAD)
    // El temporal queda pisado con vacío (no se borra, se limpia).
    expect(existsSync(`${dest}.tmp.db`)).toBe(true)
    expect(readFileSync(`${dest}.tmp.db`)).toEqual(Buffer.alloc(0))
  })

  it('exportEncrypted traga el fallo de limpieza del tmp y devuelve ok', async () => {
    const dest = join(root, 'backup.posbak')
    saveDialogMock.mockResolvedValue({ canceled: false, filePath: dest })
    const realWrite = (fs as unknown as { __realWriteFileSync: typeof fs.writeFileSync })
      .__realWriteFileSync
    writeFileSyncMock.mockImplementation(((path: unknown, data: unknown) => {
      if (String(path).endsWith('.tmp.db') && data === '') {
        throw new Error('simulated wipe failure')
      }
      const doWrite = realWrite as (...a: unknown[]) => void
      doWrite(path, data)
    }) as never)

    const res = await handlers.get('backup:export-encrypted')!({}, 'passphrase-larga')

    expect(res).toEqual({ ok: true, path: dest })
    expect(decryptBlob('passphrase-larga', readFileSync(dest), MAGIC)).toEqual(PAYLOAD)
  })

  it('importPlain cancela sin importar', async () => {
    openDialogMock.mockResolvedValue({ canceled: true, filePaths: [] })
    const res = await handlers.get('backup:import-plain')!({})

    expect(res).toEqual({ ok: false, canceled: true })
    expect(db.importActiveUserDb).not.toHaveBeenCalled()
  })

  it('importPlain cancela cuando el diálogo no devuelve archivos', async () => {
    openDialogMock.mockResolvedValue({ canceled: false, filePaths: [] })
    const res = await handlers.get('backup:import-plain')!({})

    expect(res).toEqual({ ok: false, canceled: true })
    expect(db.importActiveUserDb).not.toHaveBeenCalled()
  })

  it('importPlain importa el archivo elegido', async () => {
    const src = join(root, 'plain.db')
    openDialogMock.mockResolvedValue({ canceled: false, filePaths: [src] })
    const res = await handlers.get('backup:import-plain')!({})

    expect(res).toEqual({ ok: true })
    expect(db.importActiveUserDb).toHaveBeenCalledWith(src)
    expect(openDialogMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        title: 'Restaurar backup de Nora OS',
        properties: ['openFile'],
      }),
    )
  })

  it('importEncrypted rechaza passphrase ausente o vacía', async () => {
    await expect(handlers.get('backup:import-encrypted')!({}, undefined)).rejects.toThrow(
      'Ingresá la passphrase usada al exportar',
    )
    await expect(handlers.get('backup:import-encrypted')!({}, '')).rejects.toThrow(
      'Ingresá la passphrase usada al exportar',
    )
  })

  it('importEncrypted cancela sin importar', async () => {
    openDialogMock.mockResolvedValue({ canceled: true, filePaths: [] })
    const res = await handlers.get('backup:import-encrypted')!({}, 'passphrase-larga')

    expect(res).toEqual({ ok: false, canceled: true })
    expect(db.importActiveUserDb).not.toHaveBeenCalled()
  })

  it('importEncrypted restaura el contenido descifrado y limpia el tmp', async () => {
    const src = join(root, 'backup.posbak')
    writeFileSync(src, encryptBlob('mi-passphrase', PAYLOAD, MAGIC))
    openDialogMock.mockResolvedValue({ canceled: false, filePaths: [src] })
    const captured: Buffer[] = []
    db.importActiveUserDb.mockImplementation((tmpPath: string) => {
      captured.push(readFileSync(tmpPath))
    })

    const res = await handlers.get('backup:import-encrypted')!({}, 'mi-passphrase')

    expect(res).toEqual({ ok: true })
    expect(captured).toEqual([PAYLOAD])
    expect(existsSync(`${src}.decrypted.tmp.db`)).toBe(true)
    expect(readFileSync(`${src}.decrypted.tmp.db`)).toEqual(Buffer.alloc(0))
  })

  it('importEncrypted rechaza una passphrase incorrecta', async () => {
    const src = join(root, 'backup.posbak')
    writeFileSync(src, encryptBlob('passphrase-correcta', PAYLOAD, MAGIC))
    openDialogMock.mockResolvedValue({ canceled: false, filePaths: [src] })

    await expect(
      handlers.get('backup:import-encrypted')!({}, 'passphrase-incorrecta'),
    ).rejects.toThrow()
    expect(db.importActiveUserDb).not.toHaveBeenCalled()
  })

  it('importEncrypted rechaza un archivo truncado', async () => {
    const src = join(root, 'truncated.posbak')
    writeFileSync(src, Buffer.from('POS-BAK1tiny')) // menor que el header completo
    openDialogMock.mockResolvedValue({ canceled: false, filePaths: [src] })

    await expect(
      handlers.get('backup:import-encrypted')!({}, 'passphrase-larga'),
    ).rejects.toThrow('File is too small or corrupted')
    expect(db.importActiveUserDb).not.toHaveBeenCalled()
  })

  it('importEncrypted rechaza un archivo con magic inválido', async () => {
    const src = join(root, 'badmagic.posbak')
    writeFileSync(src, Buffer.concat([Buffer.from('POS-XXXX'), Buffer.alloc(60)]))
    openDialogMock.mockResolvedValue({ canceled: false, filePaths: [src] })

    await expect(
      handlers.get('backup:import-encrypted')!({}, 'passphrase-larga'),
    ).rejects.toThrow('Invalid file format')
    expect(db.importActiveUserDb).not.toHaveBeenCalled()
  })
})