/**
 * Versión de la app — fuente única de verdad: `package.json`.
 *
 * Se importa directamente vía `resolveJsonModule` (ver tsconfig.json), de modo
 * que el bundler la inlinea a build-time. Esto garantiza que Sidebar y Footer
 * SIEMPRE muestran exactamente la versión publicada, sin depender de defines
 * globales que pueden no propagarse en todos los entry-points de electron-vite.
 *
 * Además se persiste en `localStorage` cada vez que cambia, dejando rastro
 * para auditoría de upgrades entre sesiones.
 */

import pkg from '../../../../../package.json'

const STORAGE_KEY = 'app.version'

function readStored(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(value: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // localStorage bloqueado — ignorar.
  }
}

const buildTimeVersion: string = (pkg as { version?: string }).version ?? '0.0.0'

// Sincronizar storage con la versión actual al cargar el módulo.
const previous = readStored()
if (previous !== buildTimeVersion) {
  writeStored(buildTimeVersion)
  if (previous) {
     
    console.info(`[app] version updated: ${previous} → ${buildTimeVersion}`)
  }
}

export const APP_VERSION: string = buildTimeVersion
