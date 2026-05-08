import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  __telemetryTesting,
  getTelemetryPath,
  trackDownload,
  trackPageView,
} from '../utils/telemetry'

class ImageMock {
  referrerPolicy = ''
  src = ''
  constructor() {
    imageInstances.push(this)
  }
}

const imageInstances: ImageMock[] = []

describe('telemetry', () => {
  beforeEach(() => {
    imageInstances.length = 0
    vi.stubGlobal('Image', ImageMock)
    window.history.pushState(null, '', '/nora-os/#features')
  })

  it('normalizes the landing path and feedback route', () => {
    window.history.pushState(null, '', '/nora-os/#features')
    expect(getTelemetryPath()).toBe('/')

    window.history.pushState(null, '', '/nora-os/#feedback')
    expect(getTelemetryPath()).toBe('/feedback')
  })

  it('returns false without a valid endpoint', () => {
    expect(__telemetryTesting.sendGoatCounterHit({ p: '/' }, '')).toBe(false)
    expect(__telemetryTesting.sendGoatCounterHit({ p: '/' }, 'not-a-url')).toBe(false)
  })

  it('builds a GoatCounter hit URL for page views', () => {
    const sent = __telemetryTesting.sendGoatCounterHit(
      { p: '/', t: 'Nora OS' },
      'https://nora-os.goatcounter.com/count',
    )

    expect(sent).toBe(true)
    expect(imageInstances).toHaveLength(1)
    const url = new URL(imageInstances[0].src)
    expect(url.origin + url.pathname).toBe('https://nora-os.goatcounter.com/count')
    expect(url.searchParams.get('p')).toBe('/')
    expect(url.searchParams.get('t')).toBe('Nora OS')
  })

  it('does not throw when tracking functions are no-op', () => {
    expect(() => trackPageView()).not.toThrow()
    expect(() =>
      trackDownload({
        os: 'windows',
        version: '1.13.2',
        assetName: 'Nora-OS-Setup.exe',
        assetUrl: 'https://example.com/setup.exe',
      }),
    ).not.toThrow()
  })
})
