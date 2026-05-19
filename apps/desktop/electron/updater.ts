/**
 * Auto-update scheduler.
 *
 * Manejo del check periodico de actualizaciones. La integracion real con
 * `electron-updater` (eventos, descarga, instalacion) vive en
 * `services/app-update-ipc.ts`. Este modulo solo decide CUANDO disparar el
 * check (boot delay + intervalo).
 *
 * Diseno pensado para ser testeable: la funcion no toca `electron-updater`
 * directamente, recibe un `check()` inyectado.
 */

const DEFAULT_BOOT_DELAY_MS = 10_000
const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6h

export interface AutoUpdateScheduleOptions {
  /** Funcion que dispara el check (tipicamente `autoUpdater.checkForUpdates`). */
  check: () => void | Promise<unknown>
  /** Si es true se omite todo el scheduling (modo dev). */
  disabled?: boolean
  /** Override del delay inicial post-boot. Default 10s. */
  bootDelayMs?: number
  /** Override del intervalo de re-chequeo. Default 6h. */
  intervalMs?: number
  /** Inyeccion para tests. */
  setTimeoutFn?: (cb: () => void, ms: number) => unknown
  setIntervalFn?: (cb: () => void, ms: number) => unknown
  clearTimeoutFn?: (handle: unknown) => void
  clearIntervalFn?: (handle: unknown) => void
}

export interface AutoUpdateScheduleHandle {
  /** Cancela los timers y deja de checkear. Idempotente. */
  stop: () => void
  /** True si los checks estan agendados. */
  isActive: boolean
}

/**
 * Agenda un primer check tras `bootDelayMs` y luego re-checks cada `intervalMs`.
 * Si `disabled` es true, no agenda nada y devuelve un handle inerte.
 */
export function scheduleAutoUpdateChecks(opts: AutoUpdateScheduleOptions): AutoUpdateScheduleHandle {
  const {
    check,
    disabled = false,
    bootDelayMs = DEFAULT_BOOT_DELAY_MS,
    intervalMs = DEFAULT_INTERVAL_MS,
    setTimeoutFn = setTimeout,
    setIntervalFn = setInterval,
    clearTimeoutFn = clearTimeout,
    clearIntervalFn = clearInterval,
  } = opts

  if (disabled) {
    return { stop: () => {}, isActive: false }
  }

  const safeCheck = (): void => {
    try {
      const result = check()
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        void (result as Promise<unknown>).catch(() => {
          /* Errores se broadcastean por el listener `error` del autoUpdater. */
        })
      }
    } catch {
      /* idem */
    }
  }

  const bootHandle: unknown = setTimeoutFn(safeCheck, bootDelayMs)
  const intervalHandle: unknown = setIntervalFn(safeCheck, intervalMs)

  const handle: AutoUpdateScheduleHandle = {
    isActive: true,
    stop: () => {
      if (!handle.isActive) return
      ;(clearTimeoutFn as (h: unknown) => void)(bootHandle)
      ;(clearIntervalFn as (h: unknown) => void)(intervalHandle)
      handle.isActive = false
    },
  }
  return handle
}

export const __testing = {
  DEFAULT_BOOT_DELAY_MS,
  DEFAULT_INTERVAL_MS,
}
