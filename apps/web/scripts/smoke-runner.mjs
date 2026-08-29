/**
 * Ejecuta el smoke E2E: inicia `vite preview` como subproceso del mismo proceso
 * Node (evita backgrounding de shell) y luego corre el test en Chromium real.
 */
import { createRequire } from 'module'
import { spawn } from 'child_process'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
// Resolver vite y playwright-core desde node_modules de apps/web.
const webNodeModules = new URL('../node_modules/', import.meta.url).pathname
const webRoot = new URL('../', import.meta.url).pathname
const vitePkgRoot = require.resolve('vite/package.json', { paths: [webNodeModules] })
const pwcPath = require.resolve('playwright-core', { paths: [webNodeModules] })
const vitePath = join(dirname(vitePkgRoot), 'bin', 'vite.js')

const previewHost = '127.0.0.1'
const previewRoot = `http://${previewHost}:4176`
// vite preview sirve la app bajo el base configurado en vite.config.ts.
const basePath = '/nora-os/web/'
const previewUrl = previewRoot + basePath

// 1) Levantar vite preview en un child process.
const child = spawn(
  'node',
  [vitePath, 'preview', '--port', '4176', '--strictPort', '--host', previewHost],
  { cwd: webRoot, stdio: 'inherit', detached: false },
)

async function waitForServer(url, retries = 30) {
  const t = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {
      /* not ready */
    }
    await t(400)
  }
  throw new Error('vite preview no respondió a tiempo')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

try {
  await waitForServer(previewUrl)
  console.log('preview listo en', previewUrl)
} catch (e) {
  console.error('No se pudo iniciar preview:', e.message)
  child.kill('SIGKILL')
  process.exit(1)
}

// 2) Cargar playwright-core (CJS) y correr la prueba.
const playwright = require(pwcPath)
const chromePath =
  process.env.CHROME_PATH ??
  '/home/nathker/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'

const browser = await playwright.chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'],
})

const page = await browser.newPage()
const consoleErrors = []
const pageErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error' && !/favicon/i.test(msg.text())) consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => pageErrors.push(String(err)))

await page.goto(previewUrl, { waitUntil: 'networkidle' }).catch((e) => {
  console.error('goto falló:', e.message)
})
await sleep(2500)

const boot = await page.evaluate(() => ({
  hasAuth: !!window.auth,
  hasStorage: !!window.storage,
  hasDbEnc: !!window.dbEncryption,
  bodyText: (document.body?.innerText ?? '').slice(0, 200),
}))

console.log('boot:', JSON.stringify(boot, null, 2))

let e2e = null
try {
  e2e = await page.evaluate(async () => {
    const u = 'smoke_' + Date.now()
    const user = await window.auth.register({
      username: u,
      password: 'smoke-pass-123',
      recoveryQuestion: 'test',
      recoveryAnswer: 'respuesta',
    })
    await window.storage.setActiveUser(user.id)
    await window.storage.execute(`INSERT INTO settings (key, value) VALUES (?, ?)`, [
      'smoke',
      'valor',
    ])
    const rows = await window.storage.query(`SELECT value FROM settings WHERE key = ?`, ['smoke'])
    const me = await window.auth.me()
    return { username: user.username, stored: rows[0] && rows[0].value, meUser: me && me.username }
  })
} catch (e) {
  console.error('e2e falló:', e)
}

// Fase 2: cifrado en reposo (dbEncryption) end-to-end en IndexedDB real.
let crypto2 = null
try {
  crypto2 = await page.evaluate(async () => {
    const statusBefore = await window.dbEncryption.status()
    const en = await window.dbEncryption.enable('passphrase-demo-123!')
    const afterEnable = await window.dbEncryption.status()
    const bad = await window.dbEncryption.unlock('passphrase-incorrecta')
    const ok = await window.dbEncryption.unlock('passphrase-demo-123!')
    const afterUnlock = await window.dbEncryption.status()
    const rows = await window.storage.query(`SELECT value FROM settings WHERE key = ?`, ['smoke'])
    await window.dbEncryption.disable()
    const afterDisable = await window.dbEncryption.status()
    return {
      statusBefore,
      en,
      afterEnable,
      bad,
      ok,
      afterUnlock,
      dataIntact: rows[0] && rows[0].value,
      afterDisable,
    }
  })
} catch (e) {
  console.error('crypto2 falló:', e)
}

console.log('crypto2 (dbEncryption):', JSON.stringify(crypto2))

// Fase 3: PWA — manifest, service worker y precache offline.
let pwa = null
try {
  pwa = await page.evaluate(async () => {
    const manifestLink = document.querySelector('link[rel="manifest"]')
    const manifestUrl = manifestLink ? manifestLink.getAttribute('href') : null
    let manifest = null
    if (manifestUrl) {
      const res = await fetch(manifestUrl)
      if (res.ok) manifest = await res.json()
    }
    const swRegistered = 'serviceWorker' in navigator
    const swState = swRegistered
      ? ((await navigator.serviceWorker.getRegistration())?.active?.state ?? 'none')
      : 'unsupported'
    const hasIcon192 = manifest && manifest.icons.some((i) => i.sizes === '192x192')
    const hasMaskable = manifest && manifest.icons.some((i) => i.purpose === 'maskable')
    return {
      manifestUrl,
      name: manifest && manifest.name,
      startUrl: manifest && manifest.start_url,
      display: manifest && manifest.display,
      hasIcon192,
      hasMaskable,
      swState,
    }
  })
} catch (e) {
  console.error('pwa evaluó:', e)
}

console.log('pwa (manifest/sw):', JSON.stringify(pwa))

console.log('e2e:', JSON.stringify(e2e))
console.log('pageErrors:', pageErrors.length, pageErrors.slice(0, 5))
console.log('consoleErrors:', consoleErrors.length, consoleErrors.slice(0, 8))

await browser.close()
child.kill('SIGTERM')

const failed =
  pageErrors.length > 0 ||
  consoleErrors.length > 0 ||
  !boot.hasAuth ||
  !boot.hasStorage ||
  !e2e ||
  !crypto2 ||
  !pwa
process.exit(failed ? 1 : 0)
