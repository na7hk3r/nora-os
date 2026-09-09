/**
 * Tests críticos para el cifrado en reposo (POS1).
 * Cubre: fortaleza de passphrase, layout del header, roundtrips NFKC,
 * y todos los códigos de error (WEAK_PASSPHRASE / BAD_PASSPHRASE / CORRUPT_FILE / IO).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as fs from 'fs'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  EncryptionError,
  decryptFile,
  encryptFile,
  isEncryptedFile,
  isPassphraseStrongEnough,
} from '../../electron/services/encryption'

// Spy mode: envuelve fs con spies que delegan a la implementación real,
// permitiendo inyectar fallos puntuales (p. ej. unlink) que SÍ ve el servicio.
vi.mock('fs', { spy: true })

const STRONG_PASSPHRASE = 'PassphraseLarga1!'
const HEADER_SIZE = 4 + 1 + 16 + 12 + 16 // MAGIC + VERSION + SALT + IV + TAG

function expectEncryptionError(fn: () => void, code: EncryptionError['code']): void {
  let caught: unknown
  try {
    fn()
  } catch (err) {
    caught = err
  }
  expect(caught).toBeInstanceOf(EncryptionError)
  expect((caught as EncryptionError).code).toBe(code)
}

describe('isPassphraseStrongEnough', () => {
  it('rejects passphrases shorter than 12 characters', () => {
    expect(isPassphraseStrongEnough('corta123')).toBe(false)
    expect(isPassphraseStrongEnough('')).toBe(false)
  })

  it('rejects long passphrases using a single character category', () => {
    expect(isPassphraseStrongEnough('aaaaaaaaaaaa')).toBe(false) // solo minúsculas
    expect(isPassphraseStrongEnough('AAAAAAAAAAAA')).toBe(false) // solo mayúsculas
    expect(isPassphraseStrongEnough('123456789012')).toBe(false) // solo dígitos
    expect(isPassphraseStrongEnough('!!!!!!!!!!!!')).toBe(false) // solo símbolos
  })

  it('accepts passphrases with at least two character categories', () => {
    expect(isPassphraseStrongEnough('aaaaaaaaaaaa1')).toBe(true) // minúsculas + dígito
    expect(isPassphraseStrongEnough('AAAAAAAAAAAA!')).toBe(true) // mayúsculas + símbolo
    expect(isPassphraseStrongEnough('abcdefABCDEF')).toBe(true) // minúsculas + mayúsculas
    expect(isPassphraseStrongEnough('Abcdef12345!')).toBe(true) // tres categorías
  })
})

describe('encryptFile', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nora-enc-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('throws WEAK_PASSPHRASE for a weak passphrase', () => {
    const plain = join(root, 'plain.db')
    writeFileSync(plain, 'data')
    expectEncryptionError(() => encryptFile(plain, join(root, 'out.enc'), 'corta123'), 'WEAK_PASSPHRASE')
  })

  it('throws IO when the source file does not exist', () => {
    expectEncryptionError(
      () => encryptFile(join(root, 'missing.db'), join(root, 'out.enc'), STRONG_PASSPHRASE),
      'IO',
    )
  })

  it('writes a POS1 blob and removes the plain file on success', () => {
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    const content = Buffer.from('hola nora')
    writeFileSync(plain, content)

    encryptFile(plain, enc, STRONG_PASSPHRASE)

    expect(existsSync(plain)).toBe(false)
    expect(existsSync(enc)).toBe(true)
    const blob = readFileSync(enc)
    expect(blob.subarray(0, 4).toString('ascii')).toBe('POS1')
    expect(blob[4]).toBe(1) // version
    expect(blob.length).toBe(HEADER_SIZE + content.length)
  })

  it('keeps the encrypted output and warns when the plain file cannot be removed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    writeFileSync(plain, Buffer.from('no se puede borrar'))
    vi.mocked(fs.unlinkSync).mockImplementationOnce(() => {
      throw new Error('permission denied')
    })

    encryptFile(plain, enc, STRONG_PASSPHRASE)

    expect(existsSync(enc)).toBe(true)
    expect(existsSync(plain)).toBe(true) // el unlink falló y no se re-lanza
    expect(warnSpy).toHaveBeenCalledTimes(1)
    warnSpy.mockRestore()
  })
})

describe('decryptFile', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nora-dec-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('throws IO when the encrypted file does not exist', () => {
    expectEncryptionError(
      () => decryptFile(join(root, 'missing.enc'), join(root, 'out.db'), STRONG_PASSPHRASE),
      'IO',
    )
  })

  it('throws CORRUPT_FILE when the blob is too small', () => {
    const enc = join(root, 'small.enc')
    writeFileSync(enc, Buffer.from('tiny'))
    expectEncryptionError(() => decryptFile(enc, join(root, 'out.db'), STRONG_PASSPHRASE), 'CORRUPT_FILE')
  })

  it('throws CORRUPT_FILE for an invalid magic header', () => {
    const enc = join(root, 'badmagic.enc')
    writeFileSync(enc, Buffer.concat([Buffer.from('XXXX'), Buffer.alloc(60)]))
    expectEncryptionError(() => decryptFile(enc, join(root, 'out.db'), STRONG_PASSPHRASE), 'CORRUPT_FILE')
  })

  it('throws CORRUPT_FILE for an unsupported version', () => {
    const enc = join(root, 'badver.enc')
    writeFileSync(enc, Buffer.concat([Buffer.from('POS1'), Buffer.from([99]), Buffer.alloc(60)]))
    expectEncryptionError(() => decryptFile(enc, join(root, 'out.db'), STRONG_PASSPHRASE), 'CORRUPT_FILE')
  })

  it('throws BAD_PASSPHRASE for a wrong passphrase', () => {
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    writeFileSync(plain, Buffer.from('secreto'))
    encryptFile(plain, enc, STRONG_PASSPHRASE)

    expectEncryptionError(() => decryptFile(enc, join(root, 'out.db'), 'OtraPassphrase99!'), 'BAD_PASSPHRASE')
  })

  it('throws BAD_PASSPHRASE when the ciphertext was tampered with', () => {
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    writeFileSync(plain, Buffer.from('secreto'))
    encryptFile(plain, enc, STRONG_PASSPHRASE)

    const blob = readFileSync(enc)
    blob[HEADER_SIZE + 2] ^= 0xff // corromper un byte del ciphertext
    writeFileSync(enc, blob)

    expectEncryptionError(() => decryptFile(enc, join(root, 'out.db'), STRONG_PASSPHRASE), 'BAD_PASSPHRASE')
  })

  it('round-trips encrypt -> decrypt with the same passphrase', () => {
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    const out = join(root, 'out.db')
    const content = Buffer.from('contenido secreto de la base')
    writeFileSync(plain, content)

    encryptFile(plain, enc, STRONG_PASSPHRASE)
    decryptFile(enc, out, STRONG_PASSPHRASE)

    expect(readFileSync(out)).toEqual(content)
  })

  it('decrypts with a decomposed (NFD) passphrase an NFC-encrypted file and vice versa', () => {
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    const out = join(root, 'out.db')
    const content = Buffer.from('nfkc funciona')
    writeFileSync(plain, content)

    encryptFile(plain, enc, 'café-larga-123') // NFC
    decryptFile(enc, out, 'cafe\u0301-larga-123') // NFD (e + acento combinante)
    expect(readFileSync(out)).toEqual(content)

    const plain2 = join(root, 'plain2.db')
    const enc2 = join(root, 'plain2.db.enc')
    const out2 = join(root, 'out2.db')
    writeFileSync(plain2, content)
    encryptFile(plain2, enc2, 'cafe\u0301-larga-123')
    decryptFile(enc2, out2, 'café-larga-123')
    expect(readFileSync(out2)).toEqual(content)
  })
})

describe('isEncryptedFile', () => {
  let root: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'nora-isfile-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns false for a non-existent path', () => {
    expect(isEncryptedFile(join(root, 'missing.enc'))).toBe(false)
  })

  it('returns true for a valid POS1 blob', () => {
    const plain = join(root, 'plain.db')
    const enc = join(root, 'plain.db.enc')
    writeFileSync(plain, Buffer.from('datos'))
    encryptFile(plain, enc, STRONG_PASSPHRASE)
    expect(isEncryptedFile(enc)).toBe(true)
  })

  it('returns false for a plain (non-POS1) file', () => {
    const file = join(root, 'plain.txt')
    writeFileSync(file, 'no es un blob cifrado')
    expect(isEncryptedFile(file)).toBe(false)
  })

  it('returns false when the file cannot be read', () => {
    const dir = join(root, 'adir')
    mkdirSync(dir)
    expect(isEncryptedFile(dir)).toBe(false) // readFileSync lanza EISDIR → catch
  })
})