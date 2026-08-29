/**
 * CryptoWebSpike
 *
 * Spike de viabilidad Fase 0: validar que WebCrypto (crypto.subtle) puede
 * replicar los dos usos criptográficos que Nora OS hoy delega en Node crypto:
 *
 *  1. Hashing de contraseñas / respuestas de recuperación (auth.ts usa
 *     `scryptSync(secret, salt, 64)` con formato `salt:digest`).
 *  2. Cifrado en reposo de la DB (encryption.ts usa AES-256-GCM con key
 *     derivada por scrypt N=32768, r=8, p=1 y header POS1).
 *
 * Hallazgo a confirmar:
 *  - WebCrypto NO implementa scrypt nativo. Solo ofrece PBKDF2, HKDF, y
 *    primitivas simétricas.
 *  - Por lo tanto, para compatibilidad total con los datos/export de la app
 *    Electron, habría que enchufar scrypt vía wasm/js (ej. `scrypt-js`), o
 *    definir un formato web nuevo con PBKDF2.
 *
 * Este módulo valida que el camino WebCrypto (PBKDF2 + AES-GCM) funciona y
 * produce hashes/derivaciones de la misma interfaz.
 */

// ── 1. Password hashing por PBKDF2 (formato `salt:iterations:digest`) ──
const PBKDF2_ITERATIONS = 100_000
const KEY_LEN = 64

export function randomSalt(bytes = 16): Uint8Array {
  const salt = new Uint8Array(bytes)
  crypto.getRandomValues(salt)
  return salt
}

function bufToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return out
}

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomSalt()
  const digest = await derivePbkdf2(secret, salt, PBKDF2_ITERATIONS)
  return `${bufToHex(salt)}:${PBKDF2_ITERATIONS}:${bufToHex(digest)}`
}

export async function verifySecret(secret: string, encodedHash: string): Promise<boolean> {
  const parts = encodedHash.split(':')
  if (parts.length !== 3) return false
  const [saltHex, iterationsStr, digestHex] = parts
  const salt = hexToBytes(saltHex)
  const iterations = Number(iterationsStr)
  if (!Number.isInteger(iterations)) return false

  const computed = await derivePbkdf2(secret, salt, iterations)
  const expected = hexToBytes(digestHex)
  if (computed.length !== expected.length) return false
  return timingSafeEqual(computed, expected)
}

async function derivePbkdf2(
  secret: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LEN * 8,
  )
  return new Uint8Array(bits)
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

// ── 2. AES-256-GCM cifrado en reposo (formato Fogware-esque) ──────────
export interface EncryptedBlob {
  magic: string // 'WSEC'
  version: number
  salt: Uint8Array
  iv: Uint8Array
  tag: Uint8Array
  ciphertext: Uint8Array
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

const MAGIC = 'WSEC'
const VERSION = 1
const SALT_LENGTH = 16
const IV_LENGTH = 12

export async function encryptBytes(
  plaintext: Uint8Array,
  passphrase: string,
): Promise<EncryptedBlob> {
  const salt = randomSalt(SALT_LENGTH)
  const iv = randomSalt(IV_LENGTH)
  const key = await deriveAesKey(passphrase, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource, tagLength: 128 },
    key,
    plaintext as BufferSource,
  )
  // El tag GCM va al final del buffer devuelto por WebCrypto.
  const total = new Uint8Array(encrypted)
  const ciphertext = total.subarray(0, total.length - 16)
  const tag = total.subarray(total.length - 16)
  return { magic: MAGIC, version: VERSION, salt, iv, tag, ciphertext }
}

export async function decryptBytes(blob: EncryptedBlob, passphrase: string): Promise<Uint8Array> {
  if (blob.magic !== MAGIC || blob.version !== VERSION) {
    throw new Error('unsupported header')
  }
  const key = await deriveAesKey(passphrase, blob.salt)
  const combined = new Uint8Array(blob.ciphertext.length + blob.tag.length)
  combined.set(blob.ciphertext, 0)
  combined.set(blob.tag, blob.ciphertext.length)
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: blob.iv as BufferSource, tagLength: 128 },
      key,
      combined as BufferSource,
    )
    return new Uint8Array(decrypted)
  } catch {
    throw new Error('passphrase incorrect or data tampered')
  }
}

/** Serializa el blob en un formato único (para persistir o exportar). */
export function serializeBlob(blob: EncryptedBlob): Uint8Array {
  const head = new Uint8Array(4 + 1 + SALT_LENGTH + IV_LENGTH + 16)
  const text = new TextEncoder().encode(blob.magic)
  head.set(text, 0)
  head[4] = blob.version
  head.set(blob.salt, 5)
  head.set(blob.iv, 5 + SALT_LENGTH)
  head.set(blob.tag, 5 + SALT_LENGTH + IV_LENGTH)
  const out = new Uint8Array(head.length + blob.ciphertext.length)
  out.set(head, 0)
  out.set(blob.ciphertext, head.length)
  return out
}

export function parseBlob(bytes: Uint8Array): EncryptedBlob {
  const text = new TextDecoder().decode(bytes.subarray(0, 4))
  if (text !== MAGIC) throw new Error('invalid magic header')
  const version = bytes[4]
  const salt = bytes.subarray(5, 5 + SALT_LENGTH)
  const iv = bytes.subarray(5 + SALT_LENGTH, 5 + SALT_LENGTH + IV_LENGTH)
  const tag = bytes.subarray(5 + SALT_LENGTH + IV_LENGTH, 5 + SALT_LENGTH + IV_LENGTH + 16)
  const ciphertext = bytes.subarray(5 + SALT_LENGTH + IV_LENGTH + 16)
  return { magic: MAGIC, version, salt, iv, tag, ciphertext }
}

/** Endurecimiento grosso: analizado vs. formato Electron (scrypt vs pbkdf2). */
export function isPassphraseStrongEnough(passphrase: string): boolean {
  if (passphrase.length < 12) return false
  let categories = 0
  if (/[a-z]/.test(passphrase)) categories += 1
  if (/[A-Z]/.test(passphrase)) categories += 1
  if (/[0-9]/.test(passphrase)) categories += 1
  if (/[^A-Za-z0-9]/.test(passphrase)) categories += 1
  return categories >= 2
}

// Solución stand-in mientras cryptos del formato actual (Electron) se
// documentan: usamos fallback a PBKDF2 cuando scrypt-web no esté presente.
export const CRYPTO_BACKEND = 'webcrypto-pbkdf2'
