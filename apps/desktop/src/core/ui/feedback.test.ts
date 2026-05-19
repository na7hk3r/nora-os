import { describe, expect, it } from 'vitest'
import { buildFeedbackFormUrl, type FeedbackContext } from './feedback'

const context: FeedbackContext = {
  version: '1.13.2',
  route: '/work?view=kanban',
  theme: 'default',
  activePlugins: ['work', 'habits'],
  platform: 'Win32',
  recentEvents: [
    { event: 'CORE_SETTINGS_UPDATED', timestamp: 1710000000000 },
    { event: 'WORK_TASK_CREATED', timestamp: 1710000000100 },
  ],
}

describe('buildFeedbackFormUrl', () => {
  it('preserves existing query params', () => {
    const result = buildFeedbackFormUrl('https://forms.example.com/beta?source=nora', context, false)
    expect(result).not.toBeNull()

    const url = new URL(result!)
    expect(url.origin + url.pathname).toBe('https://forms.example.com/beta')
    expect(url.searchParams.get('source')).toBe('nora')
    expect(url.searchParams.has('version')).toBe(false)
  })

  it('adds context only when requested', () => {
    const withoutContext = buildFeedbackFormUrl('https://forms.example.com/beta', context, false)
    const withContext = buildFeedbackFormUrl('https://forms.example.com/beta', context, true)

    expect(new URL(withoutContext!).searchParams.has('version')).toBe(false)
    expect(new URL(withContext!).searchParams.get('version')).toBe('1.13.2')
    expect(new URL(withContext!).searchParams.get('route')).toBe('/work?view=kanban')
  })

  it('encodes arrays and recent events as JSON query params', () => {
    const result = buildFeedbackFormUrl('https://forms.example.com/beta', context, true)
    const params = new URL(result!).searchParams

    expect(params.get('activePlugins')).toBe(JSON.stringify(['work', 'habits']))
    expect(params.get('recentEvents')).toBe(JSON.stringify(context.recentEvents))
  })

  it('returns null for empty or invalid URLs', () => {
    expect(buildFeedbackFormUrl('', context, true)).toBeNull()
    expect(buildFeedbackFormUrl('not a url', context, true)).toBeNull()
    expect(buildFeedbackFormUrl('mailto:hello@example.com', context, true)).toBeNull()
  })
})
