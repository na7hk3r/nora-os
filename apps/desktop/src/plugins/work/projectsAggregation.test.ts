import { describe, expect, it } from 'vitest'
import { computeProjectStats, countMentionsPerEntity } from './projectsAggregation'
import type { EventLogEntry } from '@core/types'
import type { Card, FocusSession, Note, Project, ProjectLink } from './types'

function makeEvent(overrides: Partial<EventLogEntry> & { payload?: string }): EventLogEntry {
  return {
    id: overrides.id ?? 1,
    event_type: overrides.event_type ?? 'WORK_TASK_CREATED',
    source: overrides.source ?? 'work',
    payload: overrides.payload ?? '{}',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  }
}

function makeCard(partial: Partial<Card> & { id: string }): Card {
  return {
    ...partial,
    id: partial.id,
    columnId: partial.columnId ?? 'col1',
    title: partial.title ?? partial.id,
    description: '',
    content: '',
    labels: partial.labels ?? [],
    dueDate: null,
    position: 0,
  }
}

function makeNote(partial: Partial<Note> & { id: string }): Note {
  return {
    ...partial,
    id: partial.id,
    title: partial.title ?? partial.id,
    content: '',
    tags: partial.tags ?? [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeSession(partial: Partial<FocusSession> & { id: string }): FocusSession {
  return {
    ...partial,
    id: partial.id,
    taskId: partial.taskId ?? null,
    startTime: partial.startTime ?? 1_000_000,
    endTime: partial.endTime ?? 2_000_000,
    duration: partial.duration,
    interrupted: partial.interrupted ?? false,
    pausedAt: null,
    pausedTotal: 0,
  }
}

function makeProject(partial: Partial<Project> & { id: string }): Project {
  return {
    ...partial,
    id: partial.id,
    name: partial.name ?? partial.id,
    color: '#60a5fa',
    description: '',
    archived: partial.archived ?? false,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  }
}

function makeLink(partial: Partial<ProjectLink> & { id: string }): ProjectLink {
  return {
    ...partial,
    id: partial.id,
    projectId: partial.projectId ?? 'p1',
    entityType: partial.entityType ?? 'work_card',
    entityId: partial.entityId ?? 'c1',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  }
}

describe('countMentionsPerEntity', () => {
  it('counts taskId from WORK_ events', () => {
    const events = [
      makeEvent({ id: 1, event_type: 'WORK_TASK_CREATED', payload: JSON.stringify({ taskId: 'c1' }) }),
      makeEvent({ id: 2, event_type: 'WORK_FOCUS_COMPLETED', payload: JSON.stringify({ taskId: 'c1' }) }),
      makeEvent({ id: 3, event_type: 'WORK_NOTE_CREATED', payload: JSON.stringify({ id: 'n1' }) }),
    ]
    const counts = countMentionsPerEntity(events)
    expect(counts.get('c1')).toBe(2)
    expect(counts.get('n1')).toBe(1)
  })

  it('skips non-WORK_ events', () => {
    const events = [
      makeEvent({ id: 1, event_type: 'FITNESS_DAILY_LOG', payload: JSON.stringify({ taskId: 'c1' }) }),
    ]
    const counts = countMentionsPerEntity(events)
    expect(counts.size).toBe(0)
  })

  it('handles malformed JSON payloads', () => {
    const events = [
      makeEvent({ id: 1, payload: 'not json' }),
      makeEvent({ id: 2, payload: '{"taskId":"c2"}' }),
    ]
    const counts = countMentionsPerEntity(events)
    expect(counts.size).toBe(1)
    expect(counts.get('c2')).toBe(1)
  })
})

describe('computeProjectStats', () => {
  it('returns empty stats for a project with no linked entities', () => {
    const stats = computeProjectStats([makeProject({ id: 'p1' })], [], [], [], [], [])
    const s = stats.get('p1')!
    expect(s.cardCount).toBe(0)
    expect(s.noteCount).toBe(0)
    expect(s.sessionCount).toBe(0)
    expect(s.focusMs).toBe(0)
    expect(s.mentionCount).toBe(0)
    expect(s.tags).toEqual([])
  })

  it('counts linked cards and notes', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' }),
      makeLink({ id: 'l2', projectId: 'p1', entityType: 'work_card', entityId: 'c2' }),
      makeLink({ id: 'l3', projectId: 'p1', entityType: 'work_note', entityId: 'n1' }),
    ]
    const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' }), makeCard({ id: 'c3' })]
    const notes = [makeNote({ id: 'n1' })]

    const stats = computeProjectStats([project], links, cards, notes, [], [])
    const s = stats.get('p1')!
    expect(s.cardCount).toBe(2)
    expect(s.noteCount).toBe(1)
  })

  it('computes focusMs from completed non-interrupted sessions', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_focus_session', entityId: 'f1' }),
      makeLink({ id: 'l2', projectId: 'p1', entityType: 'work_focus_session', entityId: 'f2' }),
    ]
    const sessions = [
      makeSession({ id: 'f1', duration: 1_800_000, endTime: 5_000_000, interrupted: false }),
      makeSession({ id: 'f2', duration: 3_600_000, endTime: 10_000_000, interrupted: true }),
    ]

    const stats = computeProjectStats([project], links, [], [], sessions, [])
    const s = stats.get('p1')!
    expect(s.focusMs).toBe(1_800_000)
    expect(s.sessionCount).toBe(1)
  })

  it('computes focusMs from sessions of a linked card via taskId', () => {
    const project = makeProject({ id: 'p1' })
    const links = [makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' })]
    const cards = [makeCard({ id: 'c1' })]
    const sessions = [
      makeSession({ id: 'f1', taskId: 'c1', duration: 1_200_000, endTime: 5_000_000, interrupted: false }),
      makeSession({ id: 'f2', taskId: 'c1', duration: 2_000_000, endTime: 6_000_000, interrupted: true }),
      makeSession({ id: 'f3', taskId: 'c2', duration: 9_000_000, endTime: 7_000_000, interrupted: false }),
    ]

    const stats = computeProjectStats([project], links, cards, [], sessions, [])
    const s = stats.get('p1')!
    expect(s.focusMs).toBe(1_200_000)
    expect(s.sessionCount).toBe(1)
  })

  it('counts mentions for sessions derived from linked cards', () => {
    const project = makeProject({ id: 'p1' })
    const links = [makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' })]
    const cards = [makeCard({ id: 'c1' })]
    const sessions = [makeSession({ id: 'f1', taskId: 'c1' })]
    const events = [
      makeEvent({ id: 1, event_type: 'WORK_FOCUS_COMPLETED', payload: JSON.stringify({ taskId: 'f1' }) }),
    ]

    const stats = computeProjectStats([project], links, cards, [], sessions, events)
    expect(stats.get('p1')!.mentionCount).toBe(1)
  })

  it('no duplica sesiones alcanzadas por tarjeta y vínculo explícito a la vez', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' }),
      makeLink({ id: 'l2', projectId: 'p1', entityType: 'work_focus_session', entityId: 'f1' }),
    ]
    const cards = [makeCard({ id: 'c1' })]
    const sessions = [makeSession({ id: 'f1', taskId: 'c1', duration: 1_500_000, interrupted: false })]

    const stats = computeProjectStats([project], links, cards, [], sessions, [])
    const s = stats.get('p1')!
    expect(s.sessionCount).toBe(1)
    expect(s.focusMs).toBe(1_500_000)
  })

  it('falls back to endTime - startTime when duration is undefined', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_focus_session', entityId: 'f1' }),
    ]
    const sessions = [
      makeSession({ id: 'f1', startTime: 1000, endTime: 4_001_000, interrupted: false }),
    ]

    const stats = computeProjectStats([project], links, [], [], sessions, [])
    expect(stats.get('p1')!.focusMs).toBe(4_000_000)
  })

  it('unions tags from linked cards and notes (deduplicated, preserving order)', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' }),
      makeLink({ id: 'l2', projectId: 'p1', entityType: 'work_note', entityId: 'n1' }),
    ]
    const cards = [makeCard({ id: 'c1', labels: ['a', 'b'] })]
    const notes = [makeNote({ id: 'n1', tags: ['b', 'c'] })]

    const stats = computeProjectStats([project], links, cards, notes, [], [])
    expect(stats.get('p1')!.tags).toEqual(['a', 'b', 'c'])
  })

  it('counts mentions across linked cards, notes, and sessions', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' }),
      makeLink({ id: 'l2', projectId: 'p1', entityType: 'work_note', entityId: 'n1' }),
    ]
    const events = [
      makeEvent({ id: 1, event_type: 'WORK_TASK_CREATED', payload: JSON.stringify({ taskId: 'c1' }) }),
      makeEvent({ id: 2, event_type: 'WORK_TASK_CREATED', payload: JSON.stringify({ taskId: 'c1' }) }),
      makeEvent({ id: 3, event_type: 'WORK_NOTE_CREATED', payload: JSON.stringify({ id: 'n1' }) }),
    ]

    const stats = computeProjectStats([project], links, [makeCard({ id: 'c1' })], [makeNote({ id: 'n1' })], [], events)
    expect(stats.get('p1')!.mentionCount).toBe(3)
  })

  it('ignores links from other projects', () => {
    const project = makeProject({ id: 'p1' })
    const links = [
      makeLink({ id: 'l1', projectId: 'p2', entityType: 'work_card', entityId: 'c1' }),
    ]
    const cards = [makeCard({ id: 'c1' })]

    const stats = computeProjectStats([project], links, cards, [], [], [])
    expect(stats.get('p1')!.cardCount).toBe(0)
  })
})