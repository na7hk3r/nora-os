const GOATCOUNTER_ENDPOINT = import.meta.env.VITE_GOATCOUNTER_ENDPOINT ?? ''

export type TelemetryEventName = 'download'

export interface PageViewPayload {
  path?: string
  title?: string
  referrer?: string
}

export interface DownloadPayload {
  os: string
  version?: string
  assetName?: string
  assetUrl?: string
}

function getEndpoint(): string {
  return GOATCOUNTER_ENDPOINT.trim()
}

function isValidEndpoint(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function sendGoatCounterHit(params: Record<string, string | undefined>, endpoint = getEndpoint()): boolean {
  if (!isValidEndpoint(endpoint)) return false

  const url = new URL(endpoint)
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value)
  }
  url.searchParams.set('rnd', `${Date.now()}${Math.random().toString(36).slice(2)}`)

  const img = new Image()
  img.referrerPolicy = 'strict-origin-when-cross-origin'
  img.src = url.toString()
  return true
}

export function getTelemetryPath(): string {
  const path = window.location.pathname.replace(/^\/nora-os/, '') || '/'
  const hash = window.location.hash
  if (hash.startsWith('#feedback')) return '/feedback'
  return path
}

export function trackPageView(payload: PageViewPayload = {}): boolean {
  return sendGoatCounterHit({
    p: payload.path ?? getTelemetryPath(),
    t: payload.title ?? document.title,
    r: payload.referrer ?? document.referrer,
    q: window.location.search.replace(/^\?/, '') || undefined,
  })
}

export function trackDownload(payload: DownloadPayload): boolean {
  const parts = ['download', payload.os, payload.version].filter(Boolean)
  return sendGoatCounterHit({
    p: parts.join('-'),
    t: payload.assetName ? `Download ${payload.assetName}` : `Download ${payload.os}`,
    e: 'true',
    r: getTelemetryPath(),
    q: payload.assetUrl ? new URLSearchParams({ assetUrl: payload.assetUrl }).toString() : undefined,
  })
}

export const __telemetryTesting = {
  sendGoatCounterHit,
}
