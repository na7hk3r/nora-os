/**
 * Shared passphrase derivation and blob crypto for POS-BAK1 / POS-PRF1.
 *
 * - Encrypt always uses NFKC-canonical key derivation (R1).
 * - Decrypt attempts canonical then legacy raw; bad-passphrase only when both
 *   fail (R2 — false-accept ≈ 2⁻¹²⁸).
 * - Layout: MAGIC(8) + SALT(16) + IV(12) + TAG(16) + CT — unchanged.
 * - N=16384, r=8, p=1 — same as pre-change inline deriveKey.
 *
 * R5 scope guard: this helper is for POS-BAK1/POS-PRF1 only.
 * `encryption.ts` (POS1, N=32768) is NOT touched.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

/**
 * Derive AES-256-GCM key from NFKC-normalized passphrase.
 * For non-NFKC-stable passphrases this differs from `deriveRawKey`.
 */
export function deriveCanonicalKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase.normalize('NFKC'), salt, KEY_LEN, { N: 16384, r: 8, p: 1 })
}

/**
 * Derive AES-256-GCM key from raw (un-normalized) passphrase.
 * Matches the pre-change behavior in backup-ipc / profile-ipc / scheduled-backup.
 */
export function deriveRawKey(passphrase: string, salt: Buffer): Buffer {
  return scryptSync(passphrase, salt, KEY_LEN, { N: 16384, r: 8, p: 1 })
}

/**
 * Encrypt a payload using NFKC-canonical key derivation.
 *
 * Returns: MAGIC(8) + SALT(16) + IV(12) + TAG(16) + CT
 */
export function encryptBlob(
  passphrase: string,
  payload: Buffer,
  magic: Buffer,
): Buffer {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = deriveCanonicalKey(passphrase, salt)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([magic, salt, iv, tag, encrypted])
}

/**
 * Decrypt a blob using dual-attempt strategy (canonical then raw).
 *
 * Tries canonical first; on GCM auth failure falls back to raw key.
 * Throws only when both attempts fail.
 */
export function decryptBlob(
  passphrase: string,
  blob: Buffer,
  magic: Buffer,
): Buffer {
  if (blob.length < magic.length + SALT_LEN + IV_LEN + TAG_LEN) {
    throw new Error('File is too small or corrupted')
  }

  const blobMagic = blob.subarray(0, magic.length)
  if (!blobMagic.equals(magic)) {
    throw new Error('Invalid file format')
  }

  let offset = magic.length
  const salt = blob.subarray(offset, offset + SALT_LEN)
  offset += SALT_LEN
  const iv = blob.subarray(offset, offset + IV_LEN)
  offset += IV_LEN
  const tag = blob.subarray(offset, offset + TAG_LEN)
  offset += TAG_LEN
  const ciphertext = blob.subarray(offset)

  // Attempt 1: canonical (NFKC) key
  try {
    return tryDecrypt(passphrase, salt, iv, tag, ciphertext, true)
  } catch {
    // Fall through to raw attempt
  }

  // Attempt 2: raw (legacy) key
  return tryDecrypt(passphrase, salt, iv, tag, ciphertext, false)
}

function tryDecrypt(
  passphrase: string,
  salt: Buffer,
  iv: Buffer,
  tag: Buffer,
  ciphertext: Buffer,
  canonical: boolean,
): Buffer {
  const key = canonical
    ? deriveCanonicalKey(passphrase, salt)
    : deriveRawKey(passphrase, salt)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
