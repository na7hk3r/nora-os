import type { EventLogEntry } from '@core/types'
import type { Card, FocusSession, Note, Project, ProjectLink } from './types'

export interface ProjectStats {
  projectId: string
  cardCount: number
  noteCount: number
  mentionCount: number
  focusMs: number
  sessionCount: number
  tags: string[]
}

/**
 * Cuenta menciones por entidad (card/note/session) desde el event log.
 * Sólo considera eventos del plugin Work y parsea el payload como JSON.
 */
export function countMentionsPerEntity(events: EventLogEntry[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (!event.event_type.startsWith('WORK_')) continue
    let payload: unknown
    try {
      payload = JSON.parse(event.payload)
    } catch {
      continue
    }
    if (typeof payload !== 'object' || payload === null) continue
    const record = payload as Record<string, unknown>
    const entityId = record.taskId ?? record.id
    if (typeof entityId !== 'string' || entityId.length === 0) continue
    counts.set(entityId, (counts.get(entityId) ?? 0) + 1)
  }
  return counts
}

export function computeProjectStats(
  projects: Project[],
  links: ProjectLink[],
  cards: Card[],
  notes: Note[],
  sessions: FocusSession[],
  events: EventLogEntry[],
): Map<string, ProjectStats> {
  const mentions = countMentionsPerEntity(events)
  const stats = new Map<string, ProjectStats>()

  for (const project of projects) {
    const projectLinks = links.filter((l) => l.projectId === project.id)

    const linkedCards = cards.filter((card) =>
      projectLinks.some((l) => l.entityType === 'work_card' && l.entityId === card.id),
    )
    const linkedNotes = notes.filter((note) =>
      projectLinks.some((l) => l.entityType === 'work_note' && l.entityId === note.id),
    )
    const linkedSessionIds = projectLinks
      .filter((l) => l.entityType === 'work_focus_session')
      .map((l) => l.entityId)
    const linkedSessions = sessions.filter((s) => linkedSessionIds.includes(s.id))

    let focusMs = 0
    let sessionCount = 0
    for (const session of linkedSessions) {
      if (session.interrupted || session.endTime == null) continue
      focusMs += session.duration ?? Math.max(0, session.endTime - session.startTime)
      sessionCount += 1
    }

    const mentionEntityIds = [
      ...linkedCards.map((c) => c.id),
      ...linkedNotes.map((n) => n.id),
      ...linkedSessionIds,
    ]
    let mentionCount = 0
    for (const entityId of mentionEntityIds) {
      mentionCount += mentions.get(entityId) ?? 0
    }

    const tags: string[] = []
    for (const card of linkedCards) {
      for (const tag of card.labels ?? []) {
        if (!tags.includes(tag)) tags.push(tag)
      }
    }
    for (const note of linkedNotes) {
      for (const tag of note.tags ?? []) {
        if (!tags.includes(tag)) tags.push(tag)
      }
    }

    stats.set(project.id, {
      projectId: project.id,
      cardCount: linkedCards.length,
      noteCount: linkedNotes.length,
      mentionCount,
      focusMs,
      sessionCount,
      tags,
    })
  }

  return stats
}