/**
 * CryptoWebSpike — valida que WebCrypto puede replicar hash + cifrado.
 *
 * Deja en claro el hallazgo de scrypt: el backend actual de Electron usa
 * scrypt (nativo de Node), que WebCrypto NO ofrece. Este spike valida el
 * camino alternativo (PBKDF2) que produce la misma interfaz.
 */
import { describe, it, expect } from 'vitest'
import {
  hashSecret,
  verifySecret,
  encryptBytes,
  decryptBytes,
  serializeBlob,
  parseBlob,
  isPassphraseStrongEnough,
} from './crypto-web'

describe('WebCrypto password hashing (PBKDF2)', () => {
  it('verifica correctamente un hash que generó', async () => {
    const h = await hashSecret('S3cret!!pass')
    expect(h.split(':')).toHaveLength(3)
    await expect(verifySecret('S3cret!!pass', h)).resolves.toBe(true)
  })

  it('rechaza una contraseña equivocada', async () => {
    const h = await hashSecret('S3cret!!pass')
    await expect(verifySecret('wrong', h)).resolves.toBe(false)
  })

  it('produce hashes distintos con salts aleatorios', async () => {
    const a = await hashSecret('same-pass')
    const b = await hashSecret('same-pass')
    expect(a).not.toBe(b)
  })
})

describe('WebCrypto AES-256-GCM cifrado en reposo', () => {
  it('cifra y descifra un blob redondo', async () => {
    const plain = new TextEncoder().encode('schema core de Nora OS'.repeat(20))
    const blob = await encryptBytes(plain, 'Contraseña-muy-fuerte-42!')
    expect(blob.magic).toBe('WSEC')
    expect(blob.ciphertext.length).toBe(plain.length)

    const round = await decryptBytes(blob, 'Contraseña-muy-fuerte-42!')
    expect(new TextDecoder().decode(round)).toBe(new TextDecoder().decode(plain))
  })

  it('falla con passphrase incorrecta (GCM tag)', async () => {
    const blob = await encryptBytes(new TextEncoder().encode('secret'), 'Pass-strong-42!')
    await expect(decryptBytes(blob, 'otra-pass--88')).rejects.toThrow()
  })

  it('serializa y parsea el blob (formato único)', async () => {
    const blob = await encryptBytes(new TextEncoder().encode('hola'), 'Pass-strong-42!')
    const bytes = serializeBlob(blob)
    const parsed = parseBlob(bytes)
    expect(parsed.magic).toBe('WSEC')
    expect(parsed.version).toBe(1)
    const round = await decryptBytes(parsed, 'Pass-strong-42!')
    expect(new TextDecoder().decode(round)).toBe('hola')
  })
})

describe('Fortaleza de passphrase (mismo criterio que Electron)', () => {
  it('acepta passphrases fuertes', () => {
    expect(isPassphraseStrongEnough('Este-ejemplo-2026!')).toBe(true)
  })
  it('rechaza las cortas', () => {
    expect(isPassphraseStrongEnough('corta')).toBe(false)
  })
})
