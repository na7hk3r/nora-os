/**
 * Interoperabilidad del cifrado web con el formato Electron (Node crypto).
 *
 * Simula EXACTAMENTE lo que produce la app desktop (scryptSync + AES-256-GCM
 * con los magics POS1 / POS-BAK1 / POS-PRF1) y verifica que la web puede:
 *   1. descifrar un archivo exportado por Electron, y
 *   2. generar archivos que el propio Electron (Node) podría descifrar.
 */
import { describe, it, expect } from 'vitest'
import { scryptSync, createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { encryptElectron, decryptElectron, isElectronEncrypted } from './crypto-electron'

const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16

// ── Simulación del lado Electron (Node crypto) ───────────────────────────────

function nodeEncrypt(
  magic: string,
  plaintext: Buffer,
  passphrase: string,
  N: number,
  versioned: boolean,
): Buffer {
  const salt = randomBytes(SALT_LEN)
  const iv = randomBytes(IV_LEN)
  const key = scryptSync(passphrase, salt, 32, { N, r: 8, p: 1, maxmem: 128 * N * 8 * 2 })
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
  N: number,
  versioned: boolean,
): Buffer {
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
  const key = scryptSync(passphrase, salt, 32, { N, r: 8, p: 1, maxmem: 128 * N * 8 * 2 })
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  try {
    return Buffer.concat([decipher.update(ct), decipher.final()])
  } catch {
    throw new Error('bad passphrase')
  }
}

describe('crypto-electron: interop con Electron (Node crypto)', () => {
  const pass = 'passphrase-de-prueba-123'

  it('web descifra un backup .posbak exportado por Electron', async () => {
    const plaintext = Buffer.from(JSON.stringify({ db: 'bytes sqlite', n: 1 }))
    const nodeBlob = nodeEncrypt('POS-BAK1', plaintext, pass, 16384, false)
    const { format, plaintext: out } = await decryptElectron(new Uint8Array(nodeBlob), pass)
    expect(format).toBe('backup')
    expect(Buffer.from(out).toString('utf8')).toBe(plaintext.toString('utf8'))
    expect(isElectronEncrypted(new Uint8Array(nodeBlob))).toBe(true)
  })

  it('web descifra un perfil .posprof exportado por Electron', async () => {
    const plaintext = Buffer.from(JSON.stringify({ schemaVersion: 1, profile: { name: 'Ada' } }))
    const nodeBlob = nodeEncrypt('POS-PRF1', plaintext, pass, 16384, false)
    const { format, plaintext: out } = await decryptElectron(new Uint8Array(nodeBlob), pass)
    expect(format).toBe('profile')
    expect(Buffer.from(out).toString('utf8')).toBe(plaintext.toString('utf8'))
  })

  it('web descifra una DB cifrada .db.enc (POS1, versionado) exportada por Electron', async () => {
    const plaintext = Buffer.from([
      0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x20, 0x66, 0x6f, 0x72, 0x6d, 0x61, 0x74,
    ])
    const nodeBlob = nodeEncrypt('POS1', plaintext, pass, 32768, true)
    const { format, plaintext: out } = await decryptElectron(new Uint8Array(nodeBlob), pass)
    expect(format).toBe('pos1')
    expect(out).toEqual(new Uint8Array(plaintext))
  })

  it('web falla con passphrase incorrecta', async () => {
    const nodeBlob = nodeEncrypt('POS-BAK1', Buffer.from('secret'), pass, 16384, false)
    await expect(decryptElectron(new Uint8Array(nodeBlob), 'otra-passphrase')).rejects.toThrow(
      /passphrase/i,
    )
  })

  it('Electron (Node) puede descifrar lo que cifra la web (backup + profile + pos1)', async () => {
    const payload = Buffer.from('contenido del respaldo 123')
    for (const { magic, N, versioned, key } of [
      { magic: 'POS-BAK1', N: 16384, versioned: false, key: 'backup' as const },
      { magic: 'POS-PRF1', N: 16384, versioned: false, key: 'profile' as const },
      { magic: 'POS1', N: 32768, versioned: true, key: 'pos1' as const },
    ]) {
      const webBlob = await encryptElectron(key, new Uint8Array(payload), pass)
      const out = nodeDecrypt(magic, Buffer.from(webBlob), pass, N, versioned)
      expect(out.equals(payload)).toBe(true)
    }
  })

  it('rechaza un archivo sin magic reconocido', async () => {
    await expect(decryptElectron(new Uint8Array([0x01, 0x02, 0x03, 0x04]), pass)).rejects.toThrow(
      /Formato inválido/,
    )
  })
})
