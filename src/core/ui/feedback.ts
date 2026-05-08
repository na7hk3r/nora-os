export interface FeedbackEventSnapshot {
  event: string
  timestamp: number
}

export interface FeedbackContext {
  version?: string
  route?: string
  theme?: string
  activePlugins?: string[]
  platform?: string
  recentEvents?: FeedbackEventSnapshot[]
}

const MAX_RECENT_EVENTS = 20

function serializeArray<T>(value: T[] | undefined): string | null {
  if (!value || value.length === 0) return null
  return JSON.stringify(value)
}

function isSupportedFeedbackUrl(url: URL): boolean {
  return url.protocol === 'https:' || url.protocol === 'http:'
}

export function buildFeedbackFormUrl(
  baseUrl: string | null | undefined,
  context?: FeedbackContext,
  includeContext = false,
): string | null {
  const trimmed = baseUrl?.trim()
  if (!trimmed) return null

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  if (!isSupportedFeedbackUrl(url)) return null
  if (!includeContext || !context) return url.toString()

  const entries: Array<[keyof FeedbackContext, string | null | undefined]> = [
    ['version', context.version],
    ['route', context.route],
    ['theme', context.theme],
    ['activePlugins', serializeArray(context.activePlugins)],
    ['platform', context.platform],
    [
      'recentEvents',
      serializeArray(context.recentEvents?.slice(-MAX_RECENT_EVENTS)),
    ],
  ]

  for (const [key, value] of entries) {
    if (value) url.searchParams.set(key, value)
  }

  return url.toString()
}
