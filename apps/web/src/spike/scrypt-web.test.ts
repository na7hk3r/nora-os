/**
 * Verificación de `scryptWeb` contra `crypto.scryptSync` de Node.
 *
 * Es la prueba crítica de compatibilidad de Fase 2: la app desktop usa scrypt
 * para derivar keys de cifrado (backups/perfil/DB). Si scryptWeb no reproduce
 * EXACTAMENTE los bytes de Node, no se podrán descifrar esos archivos en web.
 */
import { describe, it, expect } from 'vitest'
import { scryptSync } from 'crypto'
import { scryptWeb } from './scrypt-web'

const toHex = (b: Uint8Array): string =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')

describe('scryptWeb vs Node scryptSync (compatibilidad de bytes)', () => {
  it('reproduce el vector de test del RFC 7914 (N=16384, r=8, p=1)', async () => {
    const key = await scryptWeb('pleaseletmein', new TextEncoder().encode('SodiumChloride'), 64, {
      N: 16384,
      r: 8,
      p: 1,
    })
    const expected =
      '7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2' +
      'd5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887'
    expect(toHex(key)).toBe(expected)
  })

  it('coincide con Node para los parámetros de backup/perfil (N=16384, r=8, p=1)', async () => {
    const password = 'contraseña-ñ-123'
    const salt = new TextEncoder().encode('salt-de-prueba-!!')
    const nodeKey = scryptSync(password, salt, 32, {
      N: 16384,
      r: 8,
      p: 1,
      maxmem: 128 * 16384 * 8 * 2,
    })
    const webKey = await scryptWeb(password, salt, 32, { N: 16384, r: 8, p: 1 })
    expect(toHex(webKey)).toBe(toHex(new Uint8Array(nodeKey)))
  })

  it('coincide con Node para los parámetros de cifrado de DB (N=32768, r=8, p=1)', async () => {
    const password = 'otra-passphrase-larga-12345'
    const saltBytes = crypto.getRandomValues(new Uint8Array(16))
    const nodeKey = scryptSync(password, saltBytes, 32, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 128 * 32768 * 8 * 2,
    })
    const webKey = await scryptWeb(password, saltBytes, 32, { N: 32768, r: 8, p: 1 })
    expect(toHex(webKey)).toBe(toHex(new Uint8Array(nodeKey)))
  })

  it('es determinista y sensible a cambios de passphrase', async () => {
    const salt = new TextEncoder().encode('salt-fijo')
    const a1 = await scryptWeb('pass-A', salt, 32, { N: 16, r: 8, p: 1 })
    const a2 = await scryptWeb('pass-A', salt, 32, { N: 16, r: 8, p: 1 })
    const b = await scryptWeb('pass-B', salt, 32, { N: 16, r: 8, p: 1 })
    expect(toHex(a1)).toBe(toHex(a2))
    expect(toHex(a1)).not.toBe(toHex(b))
  })
})
