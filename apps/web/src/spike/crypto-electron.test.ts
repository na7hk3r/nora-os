/**
 * Interoperabilidad del cifrado web con el formato Electron (Node crypto).
 *
 * Simula EXACTAMENTE lo que produce la app desktop (scryptSync + AES-256-GCM
 * con los magics POS1 / POS-BAK1 / POS-PRF1) y verifica que la web puede:
 *   1. descifrar un archivo exportado por Electron, y
 *   2. generar archivos que el propio Electron (Node) podría descifrar.
 *
 * Modelo de normalización por formato (R4, paridad NFKC):
 *   - `POS1` derivaba SIEMPRE canónico (NFKC) en desktop (`encryption.ts:49`)
 *     y sigue canonical-only en web (R5): `normalize: true` en ambos lados.
 *   - `POS-BAK1`/`POS-PRF1`: el desktop legacy (pre-paridad) derivaba RAW.
 *     El harness modela: node-encrypt con `normalize: false` (legacy raw) y
 *     node-decrypt con política DUAL (canónico → raw), igual que el desktop
 *     nuevo y `decryptElectron` web.
 */
import { describe, it, expect } from 'vitest'
import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { encryptElectron, decryptElectron, isElectronEncrypted, type ElectronFormat } from './crypto-electron'

const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

interface FormatOpts {
  N: number
  versioned: boolean
}

interface NodeKeyOpts extends FormatOpts {
  /** true → passphrase.normalize('NFKC') (POS1 / desktop nuevo); false → raw legacy. */
  normalize: boolean
}

// ── Simulación del lado Electron (Node crypto) ───────────────────────────────

function nodeKey(passphrase: string, salt: Buffer, N: number, normalize: boolean): Buffer {
  return scryptSync(normalize ? passphrase.normalize('NFKC') : passphrase, salt, 32, {
    N,
    r: 8,
    p: 1,
    maxmem: 128 * N * 8 * 2,
  })
}

function nodeEncrypt(
  magic: string,
  plaintext: Buffer,
  passphrase: string,
  opts: NodeKeyOpts,
): Buffer {
  const { N, versioned, normalize } = opts
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = nodeKey(passphrase, salt, N, normalize)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  const parts: Buffer[] = [Buffer.from(magic, 'utf8')]
  if (versioned) parts.push(Buffer.from([1]))
  return Buffer.concat([...parts, salt, iv, tag, ct])
}

function nodeDecrypt(
  magic: string,
  blob: Buffer,
  passphrase: string,
  opts: NodeKeyOpts,
): Buffer {
  const { N, versioned, normalize } = opts
  const magicBuf = Buffer.from(magic, 'utf8')
  let offset = magicBuf.length
  if (versioned) offset += 1
  const salt = blob.subarray(offset, offset + SALT_LEN)
  offset += SALT_LEN
  const iv = blob.subarray(offset, offset + IV_LEN)
  offset += IV_LEN
  const tag = blob.subarray(offset, offset + TAG_LEN)
  offset += TAG_LEN
  const ct = blob.subarray(offset)
  const key = nodeKey(passphrase, salt, N, normalize)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()])
  } catch {
    throw new Error('bad passphrase')
  }
}

/** Política DUAL del desktop nuevo: intento canónico → fallback raw (R2). */
function nodeDecryptDual(magic: string, blob: Buffer, passphrase: string, opts: FormatOpts): Buffer {
  try {
    return nodeDecrypt(magic, blob, passphrase, { ...opts, normalize: true })
  } catch {
    return nodeDecrypt(magic, blob, passphrase, { ...opts, normalize: false })
  }
}

// Formatos con su política de normalización por lado (R4/R5).
const FORMATS: Array<{
  key: ElectronFormat
  magic: string
  N: number
  versioned: boolean
  /** node-encrypt: true solo para POS1 (desktop siempre canónico). */
  nodeEncryptNormalize: boolean
  /** node-decrypt: DUAL para backup/profile (desktop nuevo); canonical-only POS1. */
  dual: boolean
}> = [
  { key: 'backup', magic: 'POS-BAK1', N: 16384, versioned: false, nodeEncryptNormalize: false, dual: true },
  { key: 'profile', magic: 'POS-PRF1', N: 16384, versioned: false, nodeEncryptNormalize: false, dual: true },
  { key: 'pos1', magic: 'POS1', N: 32768, versioned: true, nodeEncryptNormalize: true, dual: false },
]

// Vectores no-ASCII (R4): compuestos (NFKC-estables) + descompuesto NFD real.
// - 'cafe\u0301' (e + COMBINING ACUTE, NFD): NO normalizado diverge del
//   canónico → ejercita el fallback raw de verdad.
// - 'contraseña ñoña' / 'déjà vu' (NFC compuesto): NFKC los deja byte-sin-
//   cambio → round-trip canónico (red de seguridad, no ejercitan fallback).
const NON_ASCII_VECTORS = ['cafe\u0301', 'contraseña ñoña', 'déjà vu']

describe('crypto-electron: interop con Electron (Node crypto)', () => {
  const pass = 'passphrase-de-prueba-123'

  it('web descifra un backup .posbak exportado por Electron', async () => {
    const plaintext = Buffer.from(JSON.stringify({ db: 'bytes sqlite', n: 1 }))
    const nodeBlob = nodeEncrypt('POS-BAK1', plaintext, pass, { N: 16384, versioned: false, normalize: false })
    const { format, plaintext: out } = await decryptElectron(new Uint8Array(nodeBlob), pass)
    expect(format).toBe('backup')
    expect(Buffer.from(out).toString('utf8')).toBe(plaintext.toString('utf8'))
    expect(isElectronEncrypted(new Uint8Array(nodeBlob))).toBe(true)
  })

  it('web descifra un perfil .posprof exportado por Electron', async () => {
    const plaintext = Buffer.from(JSON.stringify({ schemaVersion: 1, profile: { name: 'Ada' } }))
    const nodeBlob = nodeEncrypt('POS-PRF1', plaintext, pass, { N: 16384, versioned: false, normalize: false })
    const { format, plaintext: out } = await decryptElectron(new Uint8Array(nodeBlob), pass)
    expect(format).toBe('profile')
    expect(Buffer.from(out).toString('utf8')).toBe(plaintext.toString('utf8'))
  })

  it('web descifra una DB cifrada .db.enc (POS1, versionado) exportada por Electron', async () => {
    const plaintext = Buffer.from([
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74,
    ])
    const nodeBlob = nodeEncrypt('POS1', plaintext, pass, { N: 32768, versioned: true, normalize: true })
    const { format, plaintext: out } = await decryptElectron(new Uint8Array(nodeBlob), pass)
    expect(format).toBe('pos1')
    expect(out).toEqual(new Uint8Array(plaintext))
  })

  it('web falla con passphrase incorrecta', async () => {
    const nodeBlob = nodeEncrypt('POS-BAK1', Buffer.from('secret'), pass, {
      N: 16384,
      versioned: false,
      normalize: false,
    })
    await expect(decryptElectron(new Uint8Array(nodeBlob), 'otra-passphrase')).rejects.toThrow(
      /passphrase/i,
    )
  })

  it('Electron (Node) puede descifrar lo que cifra la web (backup + profile + pos1)', async () => {
    const payload = Buffer.from('contenido del respaldo 123')
    for (const fmt of FORMATS) {
      const webBlob = await encryptElectron(fmt.key, new Uint8Array(payload), pass)
      const out = fmt.dual
        ? nodeDecryptDual(fmt.magic, Buffer.from(webBlob), pass, fmt)
        : nodeDecrypt(fmt.magic, Buffer.from(webBlob), pass, { ...fmt, normalize: true })
      expect(out.equals(payload)).toBe(true)
    }
  })

  it('rechaza un archivo sin magic reconocido', async () => {
    await expect(decryptElectron(new Uint8Array([0x01, 0x02, 0x03, 0x04]), pass)).rejects.toThrow(
      /Formato inválido/,
    )
  })

  it('NFD: el vector cafe\\u0301 diverge entre raw y canónico (ejercita el fallback de verdad)', () => {
    // Un export legacy desktop usa la derivación raw del passphrase NFD.
    // La key canónica (NFKC → 'café' compuesto) NO abre ese blob; la raw sí.
    const passNfd = 'cafe\u0301'
    const plaintext = Buffer.from('legacy nfd backup')
    const legacyBlob = nodeEncrypt('POS-BAK1', plaintext, passNfd, {
      N: 16384,
      versioned: false,
      normalize: false,
    })
    expect(() =>
      nodeDecrypt('POS-BAK1', legacyBlob, passNfd, { N: 16384, versioned: false, normalize: true }),
    ).toThrow('bad passphrase')
    expect(
      nodeDecrypt('POS-BAK1', legacyBlob, passNfd, { N: 16384, versioned: false, normalize: false }).equals(
        plaintext,
      ),
    ).toBe(true)
  })

  it('vectores no-ASCII por formato, en ambas direcciones (node→web y web→node)', async () => {
    const payload = Buffer.from('respaldo con passphrase no-ASCII')
    for (const fmt of FORMATS) {
      for (const passNonAscii of NON_ASCII_VECTORS) {
        // node → web: node cifra como desktop (raw legacy para backup/profile,
        // canónico para POS1); web descifra con política por formato.
        const nodeBlob = nodeEncrypt(fmt.magic, payload, passNonAscii, {
          N: fmt.N,
          versioned: fmt.versioned,
          normalize: fmt.nodeEncryptNormalize,
        })
        const { format, plaintext: webOut } = await decryptElectron(new Uint8Array(nodeBlob), passNonAscii)
        expect(format).toBe(fmt.key)
        expect(Buffer.from(webOut).equals(payload)).toBe(true)

        // web → node: web cifra canónico (encryptElectron); node descifra con
        // DUAL para backup/profile y canonical-only para POS1.
        const webBlob = await encryptElectron(fmt.key, new Uint8Array(payload), passNonAscii)
        const nodeOut = fmt.dual
          ? nodeDecryptDual(fmt.magic, Buffer.from(webBlob), passNonAscii, fmt)
          : nodeDecrypt(fmt.magic, Buffer.from(webBlob), passNonAscii, { ...fmt, normalize: true })
        expect(nodeOut.equals(payload)).toBe(true)
      }
    }
  })

  it('POS1 permanece canonical-only en web: un blob derivado raw NO se abre (R5)', async () => {
    // El desktop real POS1 siempre normaliza NFKC; un blob con derive raw no
    // es un export válido y la web no debe abrirlo vía fallback.
    const passNfd = 'cafe\u0301'
    const rawBlob = nodeEncrypt('POS1', Buffer.from('nope'), passNfd, {
      N: 32768,
      versioned: true,
      normalize: false,
    })
    await expect(decryptElectron(new Uint8Array(rawBlob), passNfd)).rejects.toThrow(/passphrase/i)
  })
})