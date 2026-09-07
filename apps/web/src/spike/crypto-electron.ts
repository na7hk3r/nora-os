/**
 * crypto-electron.ts — formato de cifrado compatible con Electron de Nora OS.
 *
 * Reproduce byte-a-byte el cifrado AES-256-GCM con derivación **scrypt** que
 * usa la app desktop, para que la web pueda EXportar/IMportar los mismos
 * archivos (backups, perfil, cifrado en reposo de la DB).
 *
 * Formatos (todos AES-256-GCM, scrypt N=16384|32768, r=8, p=1):
 *   - `POS1`     (.db.enc, cifrado en reposo DB)  N=32768 → MAGIC(4) VERSION(1) SALT IV TAG CT
 *   - `POS-BAK1` (.posbak, backup)                N=16384 → MAGIC(8) SALT IV TAG CT
 *   - `POS-PRF1` (.posprof, perfil)               N=16384 → MAGIC(8) SALT IV TAG CT
 *
 * Verificado en tests contra los mismos formatos generados con Node `crypto`.
 */
import { scryptWeb } from './scrypt-web'

const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

export const ELECTRON_FORMATS = {
  pos1: { magic: 'POS1', N: 32768, versioned: true, name: 'POS1' },
  backup: { magic: 'POS-BAK1', N: 16384, versioned: false, name: 'POS-BAK1' },
  profile: { magic: 'POS-PRF1', N: 16384, versioned: false, name: 'POS-PRF1' },
} as const

export type ElectronFormat = keyof typeof ELECTRON_FORMATS

const textEncoder = new TextEncoder()

function readBytes(u8: Uint8Array, from: number, len: number): Uint8Array {
  return u8.slice(from, from + len)
}

/** Concatena los bytes dados (añade cada parte secuencialmente). */
function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

async function aesGcmEncrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
): Promise<{ ciphertext: Uint8Array; tag: Uint8Array }> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    plaintext as unknown as BufferSource,
  )
  const full = new Uint8Array(buf)
  const tag = full.slice(full.length - TAG_LEN)
  const ciphertext = full.slice(0, full.length - TAG_LEN)
  return { ciphertext, tag }
}

async function aesGcmDecrypt(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  tag: Uint8Array,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )
  const full = concatBytes([ciphertext, tag])
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as unknown as BufferSource, tagLength: 128 },
    key,
    full as unknown as BufferSource,
  )
  return new Uint8Array(buf)
}

/**
 * Cifra `plaintext` en el formato Electron de `format`. Devuelve los bytes
 * del archivo cifrado (MAGIC + header + ciphertext). Es un formato no
 * determinista (sal/iv aleatorios).
 */
export async function encryptElectron(
  format: ElectronFormat,
  plaintext: Uint8Array,
  passphrase: string,
): Promise<Uint8Array> {
  const cfg = ELECTRON_FORMATS[format]
  const magic = textEncoder.encode(cfg.magic)
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN))
  const key = await scryptWeb(passphrase, salt, 32, { N: cfg.N, r: 8, p: 1 })
  const { ciphertext, tag } = await aesGcmEncrypt(key, iv, plaintext)
  const parts: Uint8Array[] = [magic]
  if (cfg.versioned) parts.push(new Uint8Array([1])) // VERSION = 1 (POS1)
  parts.push(salt, iv, tag, ciphertext)
  return concatBytes(parts)
}

/**
 * Descifra un archivo en formato Electron. Devuelve el plaintext o lanza
 * `Error` identificando la causa (passphrase incorrecta vs formato inválido).
 */
export async function decryptElectron(
  blob: Uint8Array,
  passphrase: string,
): Promise<{ format: ElectronFormat; plaintext: Uint8Array }> {
  // Detectar formato por magic.
  let format: ElectronFormat | null = null
  for (const key of Object.keys(ELECTRON_FORMATS) as ElectronFormat[]) {
    const magic = textEncoder.encode(ELECTRON_FORMATS[key].magic)
    if (
      blob.length >= magic.length &&
      readBytes(blob, 0, magic.length).every((b, i) => b === magic[i])
    ) {
      format = key
      break
    }
  }
  if (!format) throw new Error('Formato inválido: el archivo no es un export cifrado de Nora OS')

  const cfg = ELECTRON_FORMATS[format]
  const magicLen = textEncoder.encode(cfg.magic).length
  let offset = magicLen
  if (cfg.versioned) {
    const version = blob[offset]
    offset += 1
    if (version !== 1) throw new Error(`Versión de cifrado no soportada: ${version}`)
  }
  const headerSize = magicLen + (cfg.versioned ? 1 : 0) + SALT_LEN + IV_LEN + TAG_LEN
  if (blob.length < headerSize) throw new Error('Archivo cifrado demasiado pequeño o corrupto')

  const salt = readBytes(blob, offset, SALT_LEN)
  offset += SALT_LEN
  const iv = readBytes(blob, offset, IV_LEN)
  offset += IV_LEN
  const tag = readBytes(blob, offset, TAG_LEN)
  offset += TAG_LEN
  const ciphertext = readBytes(blob, offset, blob.length - offset)

  // Intento canónico (NFKC). POS1 es canonical-only (R5): sin fallback raw.
  const attempts: Array<{ normalize: boolean }> = [{ normalize: true }]
  if (format === 'backup' || format === 'profile') {
    // Legacy desktop derivaba raw (pre-paridad NFKC): reintento raw si el
    // intento canónico falla la autenticación GCM.
    attempts.push({ normalize: false })
  }

  for (const { normalize } of attempts) {
    try {
      const key = await scryptWeb(passphrase, salt, 32, { N: cfg.N, r: 8, p: 1, normalize })
      const plaintext = await aesGcmDecrypt(key, iv, ciphertext, tag)
      return { format, plaintext }
    } catch {
      // intento fallido (auth GCM o derive): probar el siguiente
    }
  }
  // Ambos intentos fallaron: mismo error que el comportamiento single-attempt
  // (R2) — indistinguible para el usuario.
  throw new Error('La passphrase es incorrecta o el archivo fue alterado')
}

/** Detecta si un blob parece un export cifrado de Nora OS (por magic). */
export function isElectronEncrypted(blob: Uint8Array): boolean {
  if (!blob || blob.length < 4) return false
  for (const key of Object.keys(ELECTRON_FORMATS) as ElectronFormat[]) {
    const magic = textEncoder.encode(ELECTRON_FORMATS[key].magic)
    if (
      blob.length >= magic.length &&
      readBytes(blob, 0, magic.length).every((b, i) => b === magic[i])
    ) {
      return true
    }
  }
  return false
}
