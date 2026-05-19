/**
 * Cifrado en reposo (Wave 3 · #4) opt-in para la DB del usuario.
 *
 * Diseño:
 *  - Mientras la sesión está activa, la DB se mantiene en texto plano para
 *    no impactar performance ni requerir binarios nativos extra (sqlcipher).
 *  - En reposo (app cerrada o sesión cerrada), si el opt-in está activo,
 *    el archivo se almacena como `.db.enc` con AES-256-GCM y la passphrase
 *    deriva la key con scrypt.
 *  - El usuario debe ingresar la passphrase en cada arranque para
 *    desencriptar. La app no la persiste.
 *
 * Limitaciones documentadas:
 *  - Mientras la sesión está abierta, el archivo .db queda accesible al
 *    usuario del sistema. La promesa es "en reposo", no "en uso".
 *  - El cifrado es por archivo completo (no por página). Para DBs grandes
 *    el costo de cifrar al cerrar puede ser notable. Aceptable hasta GBs.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs'

const MAGIC = Buffer.from('POS1', 'utf8') // 4 bytes — identifica formato
const VERSION = 1
const KEY_LENGTH = 32
const IV_LENGTH = 12 // GCM standard
const SALT_LENGTH = 16
const TAG_LENGTH = 16
const SCRYPT_N = 1 << 15 // 32768 — balance seguridad/perf
const SCRYPT_R = 8
const SCRYPT_P = 1
const MIN_PASSPHRASE_LENGTH = 12

export interface EncryptedHeader {
  version: number
  salt: Buffer
  iv: Buffer
  tag: Buffer
}

export class EncryptionError extends Error {
  constructor(message: string, public code: 'WEAK_PASSPHRASE' | 'BAD_PASSPHRASE' | 'CORRUPT_FILE' | 'IO') {
    super(message)
    this.name = 'EncryptionError'
  }
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase.normalize('NFKC'), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R * 2,
  })
}

/**
 * Estimación gruesa de fortaleza de passphrase. Bloquea solo casos
 * triviales; el chequeo serio queda para el usuario.
 */
export function isPassphraseStrongEnough(passphrase: string): boolean {
  if (passphrase.length < MIN_PASSPHRASE_LENGTH) return false
  let categories = 0
  if (/[a-z]/.test(passphrase)) categories += 1
  if (/[A-Z]/.test(passphrase)) categories += 1
  if (/[0-9]/.test(passphrase)) categories += 1
  if (/[^A-Za-z0-9]/.test(passphrase)) categories += 1
  return categories >= 2
}

/**
 * Cifra el archivo `plainPath` y escribe `encryptedPath` con header POS1.
 * Si todo va bien, borra el archivo plano. En caso de fallo, no toca el plano.
 */
export function encryptFile(plainPath: string, encryptedPath: string, passphrase: string): void {
  if (!isPassphraseStrongEnough(passphrase)) {
    throw new EncryptionError('passphrase too weak', 'WEAK_PASSPHRASE')
  }
  if (!existsSync(plainPath)) {
    throw new EncryptionError(`source not found: ${plainPath}`, 'IO')
  }

  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = deriveKey(passphrase, salt)

  const plaintext = readFileSync(plainPath)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()

  // Layout: MAGIC(4) | VERSION(1) | SALT(16) | IV(12) | TAG(16) | CIPHERTEXT
  const versionByte = Buffer.from([VERSION])
  const out = Buffer.concat([MAGIC, versionByte, salt, iv, tag, ciphertext])
  writeFileSync(encryptedPath, out)

  try {
    unlinkSync(plainPath)
  } catch (err) {
    console.warn('[encryption] failed to remove plain file after encrypt:', err)
  }
}

/**
 * Descifra `encryptedPath` y escribe `plainPath`. No borra el cifrado en
 * automático: el caller decide la política.
 */
export function decryptFile(encryptedPath: string, plainPath: string, passphrase: string): void {
  if (!existsSync(encryptedPath)) {
    throw new EncryptionError(`encrypted file not found: ${encryptedPath}`, 'IO')
  }

  const blob = readFileSync(encryptedPath)
  const headerSize = MAGIC.length + 1 + SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  if (blob.length < headerSize) {
    throw new EncryptionError('file too small to be a valid POS1 blob', 'CORRUPT_FILE')
  }
  const magic = blob.subarray(0, MAGIC.length)
  if (!magic.equals(MAGIC)) {
    throw new EncryptionError('invalid magic header', 'CORRUPT_FILE')
  }
  const version = blob[MAGIC.length]
  if (version !== VERSION) {
    throw new EncryptionError(`unsupported version ${version}`, 'CORRUPT_FILE')
  }

  let offset = MAGIC.length + 1
  const salt = blob.subarray(offset, offset + SALT_LENGTH)
  offset += SALT_LENGTH
  const iv = blob.subarray(offset, offset + IV_LENGTH)
  offset += IV_LENGTH
  const tag = blob.subarray(offset, offset + TAG_LENGTH)
  offset += TAG_LENGTH
  const ciphertext = blob.subarray(offset)

  const key = deriveKey(passphrase, salt)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  let plaintext: Buffer
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  } catch {
    throw new EncryptionError('passphrase incorrect or file tampered', 'BAD_PASSPHRASE')
  }
  writeFileSync(plainPath, plaintext)
}

/** Útil para tests / detectar si un path corresponde a un blob POS1. */
export function isEncryptedFile(path: string): boolean {
  if (!existsSync(path)) return false
  try {
    const fd = readFileSync(path).subarray(0, MAGIC.length)
    return fd.equals(MAGIC)
  } catch {
    return false
  }
}
