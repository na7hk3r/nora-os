/**
 * scrypt (RFC 7914) en JS/TS puro, compatible con `crypto.scryptSync` de Node.
 *
 * WebCrypto no expone scrypt de forma nativa (solo PBKDF2/HKDF), y la app
 * desktop de Electron usa scrypt (`N = 16384 | 32768, r = 8, p = 1`) para
 * derivar la key AES-GCM de backups/perfil/DB. Para descifrar esos archivos
 * en el navegador necesitamos una implementación que reproduzca exactamente
 * los bytes de Node (WebCrypto PBKDF2 + Salsa20/8 ROMix propios).
 *
 * Verificado contra Node en los tests:
 *   `await scryptWeb(pass, salt, keyLen, {N,r,p}) === scryptSync(pass, salt,
 *   keyLen, {N,r,p})`.
 */

const ROTL = (x: number, b: number): number => (x << b) | (x >>> (32 - b))

/** Salsa20/8 en-place sobre 16 palabras (64 bytes), IEEE [[x, y]] round. */
function salsa20_8(x: Uint32Array): void {
  const x0 = x[0],
    x1 = x[1],
    x2 = x[2],
    x3 = x[3]
  const x4 = x[4],
    x5 = x[5],
    x6 = x[6],
    x7 = x[7]
  const x8 = x[8],
    x9 = x[9],
    x10 = x[10],
    x11 = x[11]
  const x12 = x[12],
    x13 = x[13],
    x14 = x[14],
    x15 = x[15]
  let v0 = x0,
    v1 = x1,
    v2 = x2,
    v3 = x3
  let v4 = x4,
    v5 = x5,
    v6 = x6,
    v7 = x7
  let v8 = x8,
    v9 = x9,
    v10 = x10,
    v11 = x11
  let v12 = x12,
    v13 = x13,
    v14 = x14,
    v15 = x15

  for (let i = 8; i > 0; i -= 2) {
    // Column round
    v4 ^= ROTL((v0 + v12) | 0, 7)
    v8 ^= ROTL((v4 + v0) | 0, 9)
    v12 ^= ROTL((v8 + v4) | 0, 13)
    v0 ^= ROTL((v12 + v8) | 0, 18)
    v9 ^= ROTL((v5 + v1) | 0, 7)
    v13 ^= ROTL((v9 + v5) | 0, 9)
    v1 ^= ROTL((v13 + v9) | 0, 13)
    v5 ^= ROTL((v1 + v13) | 0, 18)
    v14 ^= ROTL((v10 + v6) | 0, 7)
    v2 ^= ROTL((v14 + v10) | 0, 9)
    v6 ^= ROTL((v2 + v14) | 0, 13)
    v10 ^= ROTL((v6 + v2) | 0, 18)
    v3 ^= ROTL((v15 + v11) | 0, 7)
    v7 ^= ROTL((v3 + v15) | 0, 9)
    v11 ^= ROTL((v7 + v3) | 0, 13)
    v15 ^= ROTL((v11 + v7) | 0, 18)
    // Row round
    v1 ^= ROTL((v0 + v3) | 0, 7)
    v2 ^= ROTL((v1 + v0) | 0, 9)
    v3 ^= ROTL((v2 + v1) | 0, 13)
    v0 ^= ROTL((v3 + v2) | 0, 18)
    v6 ^= ROTL((v5 + v4) | 0, 7)
    v7 ^= ROTL((v6 + v5) | 0, 9)
    v4 ^= ROTL((v7 + v6) | 0, 13)
    v5 ^= ROTL((v4 + v7) | 0, 18)
    v11 ^= ROTL((v10 + v9) | 0, 7)
    v8 ^= ROTL((v11 + v10) | 0, 9)
    v9 ^= ROTL((v8 + v11) | 0, 13)
    v10 ^= ROTL((v9 + v8) | 0, 18)
    v12 ^= ROTL((v15 + v14) | 0, 7)
    v13 ^= ROTL((v12 + v15) | 0, 9)
    v14 ^= ROTL((v13 + v12) | 0, 13)
    v15 ^= ROTL((v14 + v13) | 0, 18)
  }
  x[0] = (v0 + x0) | 0
  x[1] = (v1 + x1) | 0
  x[2] = (v2 + x2) | 0
  x[3] = (v3 + x3) | 0
  x[4] = (v4 + x4) | 0
  x[5] = (v5 + x5) | 0
  x[6] = (v6 + x6) | 0
  x[7] = (v7 + x7) | 0
  x[8] = (v8 + x8) | 0
  x[9] = (v9 + x9) | 0
  x[10] = (v10 + x10) | 0
  x[11] = (v11 + x11) | 0
  x[12] = (v12 + x12) | 0
  x[13] = (v13 + x13) | 0
  x[14] = (v14 + x14) | 0
  x[15] = (v15 + x15) | 0
}

// ── PBKDF2-HMAC-SHA256 vía WebCrypto ────────────────────────────────────────

async function pbkdf2(
  password: Uint8Array,
  salt: Uint8Array,
  keyLen: number,
  iterations: number,
): Promise<Uint8Array> {
  if (typeof crypto === 'undefined' || !crypto?.subtle) {
    throw new Error('WebCrypto (crypto.subtle) no está disponible')
  }
  const key = await crypto.subtle.importKey(
    'raw',
    password as unknown as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations, hash: 'SHA-256' },
    key,
    keyLen * 8,
  )
  return new Uint8Array(bits)
}

// ── BlockMix-Salsa8 (RFC 7914) ───────────────────────────────────────────────
// B es un bloque de 128*r bytes. Devuelve B' de 128*r bytes: B'[i] = B'[2i] y
// B'[2i+1] = Blockix(B[2i] ⊕ B[2i+1]...). Implementación directa (correcta).

const BYTES_PER_BLOCK = 64

function blockMixSalsa8(B: Uint8Array, r: number): Uint8Array {
  const X = new Uint32Array(16)
  // X = B[2r-1] (último sub-bloque de 64 bytes)
  const wordCount = B.byteLength / 4
  const words = new Uint32Array(wordCount)
  // Leer B como words: construimos un view sobre copia para evitar alineación
  const scratch = new Uint8Array(B.byteLength)
  scratch.set(B)
  const dv = new DataView(scratch.buffer)
  for (let i = 0; i < wordCount; i++) words[i] = dv.getUint32(i * 4, true)

  for (let i = 0; i < 16; i++) X[i] = words[(BYTES_PER_BLOCK / 4) * (2 * r - 1) + i]

  for (let i = 0; i < 2 * r; i++) {
    const base = (BYTES_PER_BLOCK / 4) * i
    for (let j = 0; j < 16; j++) X[j] ^= words[base + j]
    salsa20_8(X)
    const outBase = (BYTES_PER_BLOCK / 4) * (Math.floor(i / 2) + (i % 2) * r)
    for (let j = 0; j < 16; j++) {
      dv.setUint32((outBase + j) * 4, X[j] >>> 0, true)
    }
  }
  return new Uint8Array(scratch)
}

// ── SMix (ROMix de RFC 7914) ────────────────────────────────────────────────

async function smix(B: Uint8Array, r: number, N: number): Promise<Uint8Array> {
  const X = new Uint8Array(B)
  const V = new Uint8Array(128 * r * N)
  const X64 = new Uint8Array(128 * r)
  for (let i = 0; i < N; i++) {
    V.set(X, i * (128 * r))
    X64.set(X)
    X.set(blockMixSalsa8(X64, r))
  }
  for (let i = 0; i < N; i++) {
    const j = integerify(X, r) & (N - 1)
    X64.set(X)
    for (let k = 0; k < 128 * r; k++) X[k] = X64[k] ^ V[j * (128 * r) + k]
    X64.set(X)
    X.set(blockMixSalsa8(X64, r))
  }
  return X
}

/**
 * Devuelve la palabra (u32 LE) del inicio del último sub-bloque (64B) de X,
 * que es el valor de `integerify(B, r)` mod N (N es potencia de 2 con N-1 < 2^32).
 */
function integerify(X: Uint8Array, r: number): number {
  const dv = new DataView(X.buffer, X.byteOffset, X.byteLength)
  const wordOffset = (2 * r - 1) * 16
  return dv.getUint32(wordOffset * 4, true)
}

// ── API pública ──────────────────────────────────────────────────────────────

export interface ScryptParams {
  N: number
  r: number
  p: number
}

/**
 * scryptSync reimplementado (async por WebCrypto). Devuelve `keyLen` bytes.
 * Parametros idénticos a `crypto.scryptSync(password, salt, keyLen, {N,r,p})`.
 */
export async function scryptWeb(
  password: string | Uint8Array,
  salt: Uint8Array,
  keyLen: number,
  { N, r, p }: ScryptParams,
): Promise<Uint8Array> {
  const pwBytes =
    typeof password === 'string' ? new TextEncoder().encode(password.normalize('NFKC')) : password
  // 1) B = PBKDF2-HMAC-SHA256(password, salt, 1, p * 128 * r) in blocks de 128*r
  const blocks = 128 * r * p
  const B = await pbkdf2(pwBytes, salt, blocks, 1)
  // 2) for i in 0..p-1: B_i = SMix(B_i, N, r)
  const mixed = new Uint8Array(B)
  for (let i = 0; i < p; i++) {
    const slice = mixed.subarray(i * 128 * r, (i + 1) * 128 * r)
    const out = await smix(slice, r, N)
    mixed.set(out, i * 128 * r)
  }
  // 3) DK = PBKDF2-HMAC-SHA256(password, B, 1, keyLen)
  return pbkdf2(pwBytes, mixed, keyLen, 1)
}
