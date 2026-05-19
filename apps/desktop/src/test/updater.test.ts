import { describe, it, expect, vi } from 'vitest'
import { scheduleAutoUpdateChecks, __testing } from '../../electron/updater'

describe('scheduleAutoUpdateChecks', () => {
  it('returns an inert handle when disabled (dev mode)', () => {
    const check = vi.fn()
    const handle = scheduleAutoUpdateChecks({ check, disabled: true })

    expect(handle.isActive).toBe(false)
    expect(check).not.toHaveBeenCalled()
    // Idempotente
    handle.stop()
    handle.stop()
  })

  it('schedules a boot check and a recurring interval check', () => {
    const setTimeoutFn = vi.fn().mockReturnValue('boot-handle')
    const setIntervalFn = vi.fn().mockReturnValue('interval-handle')
    const check = vi.fn()

    const handle = scheduleAutoUpdateChecks({
      check,
      bootDelayMs: 1234,
      intervalMs: 5678,
      setTimeoutFn,
      setIntervalFn,
      clearTimeoutFn: vi.fn(),
      clearIntervalFn: vi.fn(),
    })

    expect(handle.isActive).toBe(true)
    expect(setTimeoutFn).toHaveBeenCalledTimes(1)
    expect(setTimeoutFn.mock.calls[0]?.[1]).toBe(1234)
    expect(setIntervalFn).toHaveBeenCalledTimes(1)
    expect(setIntervalFn.mock.calls[0]?.[1]).toBe(5678)
  })

  it('uses 10s boot delay and 6h interval by default', () => {
    expect(__testing.DEFAULT_BOOT_DELAY_MS).toBe(10_000)
    expect(__testing.DEFAULT_INTERVAL_MS).toBe(6 * 60 * 60 * 1000)
  })

  it('invokes check() when the boot timer fires and swallows rejected promises', async () => {
    const captured: { boot: (() => void) | null } = { boot: null }
    const setTimeoutFn = vi.fn((cb: () => void) => {
      captured.boot = cb
      return 'h'
    })
    const setIntervalFn = vi.fn().mockReturnValue('i')
    const check = vi.fn().mockRejectedValue(new Error('network'))

    scheduleAutoUpdateChecks({
      check,
      setTimeoutFn,
      setIntervalFn,
      clearTimeoutFn: vi.fn(),
      clearIntervalFn: vi.fn(),
    })

    expect(captured.boot).not.toBeNull()
    captured.boot?.()
    expect(check).toHaveBeenCalledTimes(1)
    // Esperar microtask para que el .catch() del scheduler corra sin throw.
    await Promise.resolve()
  })

  it('stop() clears both timers and flips isActive', () => {
    const clearTimeoutFn = vi.fn()
    const clearIntervalFn = vi.fn()
    const handle = scheduleAutoUpdateChecks({
      check: vi.fn(),
      setTimeoutFn: vi.fn().mockReturnValue('boot-id'),
      setIntervalFn: vi.fn().mockReturnValue('interval-id'),
      clearTimeoutFn,
      clearIntervalFn,
    })

    handle.stop()
    expect(clearTimeoutFn).toHaveBeenCalledWith('boot-id')
    expect(clearIntervalFn).toHaveBeenCalledWith('interval-id')
    expect(handle.isActive).toBe(false)

    // Segundo stop es no-op.
    handle.stop()
    expect(clearTimeoutFn).toHaveBeenCalledTimes(1)
    expect(clearIntervalFn).toHaveBeenCalledTimes(1)
  })

  it('does not throw when check() throws synchronously', () => {
    const captured: { boot: (() => void) | null } = { boot: null }
    const check = vi.fn(() => {
      throw new Error('boom')
    })
    scheduleAutoUpdateChecks({
      check,
      setTimeoutFn: (cb: () => void) => {
        captured.boot = cb
        return 'h'
      },
      setIntervalFn: vi.fn().mockReturnValue('i'),
      clearTimeoutFn: vi.fn(),
      clearIntervalFn: vi.fn(),
    })
    expect(() => captured.boot?.()).not.toThrow()
    expect(check).toHaveBeenCalled()
  })
})
