import { describe, expect, it } from 'vitest'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import {
  decryptBlob,
  deriveCanonicalKey,
  deriveRawKey,
  encryptBlob,
} from '../../electron/services/passphrase'

const MAGIC = Buffer.from('POS-BAK1')
const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

const PAYLOAD = Buffer.from('{"data":"nora-os-test"}')

/** Reconstruye la derivación legacy (raw) + cifrado tal como lo hacía
 *  backup-ipc/profile-ipc/scheduled-backup antes del cambio (R2 legacy). */
function legacyRawEncrypt(passphrase: string, payload: Buffer): Buffer {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = scryptSync(passphrase, salt, KEY_LEN, { N: 16384, r: 8, p: 1 })
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([MAGIC, salt, iv, tag, encrypted])
}

/** Intento de descifrado con UNA sola key (canonical o raw). */
function singleAttemptDecrypt(
  passphrase: string,
  blob: Buffer,
  canonical: boolean,
): Buffer {
  const salt = blob.subarray(MAGIC.length, MAGIC.length + SALT_LEN)
  const iv = blob.subarray(MAGIC.length + SALT_LEN, MAGIC.length + SALT_LEN + IV_LEN)
  const tag = blob.subarray(MAGIC.length + SALT_LEN + IV_LEN, MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN)
  const ciphertext = blob.subarray(MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN)
  const key = canonical
    ? deriveCanonicalKey(passphrase, salt)
    : deriveRawKey(passphrase, salt)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

describe('passphrase helper (POS-BAK1/POS-PRF1)', () => {
  it('canonical encrypt -> canonical decrypt round-trips', () => {
    const blob = encryptBlob('contraseña ñoña', PAYLOAD, MAGIC)
    expect(decryptBlob('contraseña ñoña', blob, MAGIC)).toEqual(PAYLOAD)
  })

  it('non-NFKC-stable passphrase derives different canonical vs raw keys', () => {
    const pass = 'cafe\u0301' // 'café' descompuesto (e + acento agudo combinante)
    const salt = randomBytes(SALT_LEN)
    expect(deriveCanonicalKey(pass, salt)).not.toEqual(deriveRawKey(pass, salt))
  })

  it('canonical encrypt is NOT readable by a single raw-key attempt', () => {
    const pass = 'cafe\u0301'
    const blob = encryptBlob(pass, PAYLOAD, MAGIC)
    expect(() => singleAttemptDecrypt(pass, blob, false)).toThrow()
  })

  it('legacy raw encrypt -> dual-attempt decrypt passes (fallback)', () => {
    const pass = 'clave cafe\u0301'
    const blob = legacyRawEncrypt(pass, PAYLOAD)
    // El intento canónico falla (keys distintas) y el segundo intento raw lee el blob.
    expect(() => singleAttemptDecrypt(pass, blob, true)).toThrow()
    expect(decryptBlob(pass, blob, MAGIC)).toEqual(PAYLOAD)
  })

  it('wrong passphrase is rejected after the dual attempt', () => {
    const blob = encryptBlob('passphrase correcta', PAYLOAD, MAGIC)
    expect(() => decryptBlob('passphrase incorrecta', blob, MAGIC)).toThrow()
  })

  it('throws without leaking plaintext-length info on bad passphrase', () => {
    const blob = encryptBlob('clave a', PAYLOAD, MAGIC)
    let message = ''
    try {
      decryptBlob('clave b', blob, MAGIC)
    } catch (err) {
      message = (err as Error).message
    }
    expect(message).not.toContain(PAYLOAD.toString())
  })

  it('NFKC vectors: composed/decomposed accents decrypt to the same blob', () => {
    for (const pass of ['contraseña ñoña', 'déjà vu', 'cafe\u0301']) {
      const blob = encryptBlob(pass, PAYLOAD, MAGIC)
      expect(decryptBlob(pass, blob, MAGIC)).toEqual(PAYLOAD)
    }
    // "café" (NFC) y "cafe\u0301" (NFD) deben derivar la misma key canónica.
    const salt = randomBytes(SALT_LEN)
    expect(deriveCanonicalKey('café', salt)).toEqual(deriveCanonicalKey('cafe\u0301', salt))
  })

  it('ASCII passphrase -> canonical key equals legacy raw key (R1)', () => {
    const pass = 'passphrase-de-prueba-123'
    const salt = randomBytes(SALT_LEN)
    expect(deriveCanonicalKey(pass, salt)).toEqual(deriveRawKey(pass, salt))
  })

  it('blob keeps MAGIC(8)+SALT(16)+IV(12)+TAG(16)+CT layout', () => {
    const blob = encryptBlob('clave', PAYLOAD, MAGIC)
    expect(blob.subarray(0, MAGIC.length)).toEqual(MAGIC)
    expect(blob.length).toBe(MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN + PAYLOAD.length)
  })

  it('rejects wrong magic header', () => {
    const blob = encryptBlob('clave', PAYLOAD, Buffer.from('POS-XXXX'))
    expect(() => decryptBlob('clave', blob, MAGIC)).toThrow('Invalid file format')
  })

  it('rejects a too-small blob', () => {
    expect(() => decryptBlob('clave', Buffer.from('POS-BAK1tiny'), MAGIC)).toThrow(
      'File is too small or corrupted',
    )
  })
})