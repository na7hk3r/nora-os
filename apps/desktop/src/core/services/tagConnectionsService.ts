import { storageAPI } from '@core/storage/StorageAPI'
import {
  TAG_ENTITY_TYPES,
  tagsService,
  type Tag,
  type TagLink,
} from '@core/services/tagsService'

const PLANNER_STORAGE_KEY = 'corePlannerTasksV1'

export type TagReference = Pick<Tag, 'name' | 'color'> & Partial<Pick<Tag, 'id'>>
export type TagConnectionKind = 'note' | 'work_card' | 'planner_task' | 'other'

export interface TagConnectionItem {
  id: string
  kind: TagConnectionKind
  entityType: string
  title: string
  subtitle?: string
  ctaPath: string
}

export interface TagConnections {
  tag: Tag | null
  queryName: string
  links: TagLink[]
  items: TagConnectionItem[]
}

export const TAG_CONNECTION_KIND_LABEL: Record<TagConnectionKind, string> = {
  note: 'Nota',
  work_card: 'Work',
  planner_task: 'Planner',
  other: 'Otro',
}

function cleanTagQuery(value: string): string {
  return value.trim().replace(/^#/, '').replace(/^tag:/i, '').trim().toLowerCase()
}

export function isTagSearchQuery(value: string): boolean {
  const q = value.trim().toLowerCase()
  return q.startsWith('#') || q.startsWith('tag:')
}

function idsForType(links: TagLink[], entityType: string): string[] {
  return [...new Set(
    links
      .filter((link) => link.entity_type === entityType)
      .map((link) => link.entity_id)
      .filter(Boolean),
  )]
}

async function resolveTag(reference: TagReference): Promise<Tag | null> {
  if (reference.id != null) {
    const byId = await storageAPI
      .query<Tag>('SELECT * FROM core_tags WHERE id = ? LIMIT 1', [reference.id])
      .catch(() => [])
    if (byId[0]) return byId[0]
  }

  const queryName = cleanTagQuery(reference.name)
  if (!queryName) return null
  const byName = await storageAPI
    .query<Tag>('SELECT * FROM core_tags WHERE LOWER(name) = ? LIMIT 1', [queryName])
    .catch(() => [])
  return byName[0] ?? null
}

async function queryLinkedRows(
  table: 'work_notes' | 'work_cards',
  ids: string[],
): Promise<TagConnectionItem[]> {
  if (ids.length === 0) return []
  const placeholders = ids.map(() => '?').join(', ')
  const orderBy = table === 'work_notes' ? 'updated_at DESC' : 'title ASC'
  const rows = await storageAPI
    .query<{ id: string; title: string | null }>(
      `SELECT id, title FROM ${table} WHERE id IN (${placeholders}) ORDER BY ${orderBy}`,
      ids,
    )
    .catch(() => [])

  return rows.map((row) => ({
    id: String(row.id),
    kind: table === 'work_notes' ? 'note' : 'work_card',
    entityType: table === 'work_notes' ? TAG_ENTITY_TYPES.WORK_NOTE : TAG_ENTITY_TYPES.WORK_CARD,
    title: row.title?.trim() || (table === 'work_notes' ? 'Nota sin titulo' : 'Tarjeta sin titulo'),
    subtitle: table === 'work_notes' ? 'Nota' : 'Tarjeta de Work',
    ctaPath: table === 'work_notes' ? '/notes' : '/work',
  }))
}

async function queryPlannerTasks(ids: string[]): Promise<TagConnectionItem[]> {
  if (ids.length === 0) return []
  const raw = await storageAPI.getSetting(PLANNER_STORAGE_KEY).catch(() => undefined)
  if (!raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const idSet = new Set(ids)
  return parsed
    .map((item): TagConnectionItem | null => {
      if (!item || typeof item !== 'object') return null
      const task = item as { id?: unknown; title?: unknown; date?: unknown; completed?: unknown }
      const id = String(task.id ?? '')
      if (!idSet.has(id)) return null
      const title = typeof task.title === 'string' && task.title.trim() ? task.title : 'Tarea sin titulo'
      const date = typeof task.date === 'string' && task.date ? task.date : ''
      const status = task.completed ? 'completada' : 'pendiente'
      return {
        id,
        kind: 'planner_task',
        entityType: TAG_ENTITY_TYPES.PLANNER_TASK,
        title,
        subtitle: date ? `${date} - ${status}` : status,
        ctaPath: '/planner',
      }
    })
    .filter((item): item is TagConnectionItem => Boolean(item))
}

function buildOtherLinks(links: TagLink[]): TagConnectionItem[] {
  const knownTypes = new Set<string>(Object.values(TAG_ENTITY_TYPES))
  return links
    .filter((link) => !knownTypes.has(link.entity_type))
    .map((link) => ({
      id: link.entity_id,
      kind: 'other' as const,
      entityType: link.entity_type,
      title: `${link.entity_type}: ${link.entity_id}`,
      subtitle: 'Enlace registrado',
      ctaPath: '/control',
    }))
}

export async function getTagConnections(reference: TagReference): Promise<TagConnections> {
  const queryName = cleanTagQuery(reference.name)
  const tag = await resolveTag(reference)
  if (!tag) {
    return { tag: null, queryName, links: [], items: [] }
  }

  const links = await tagsService.entitiesForTag(tag.id).catch(() => [])
  const [notes, cards, plannerTasks] = await Promise.all([
    queryLinkedRows('work_notes', idsForType(links, TAG_ENTITY_TYPES.WORK_NOTE)),
    queryLinkedRows('work_cards', idsForType(links, TAG_ENTITY_TYPES.WORK_CARD)),
    queryPlannerTasks(idsForType(links, TAG_ENTITY_TYPES.PLANNER_TASK)),
  ])

  return {
    tag,
    queryName: tag.name,
    links,
    items: [...notes, ...cards, ...plannerTasks, ...buildOtherLinks(links)],
  }
}

export async function searchTagConnections(query: string, limit = 8): Promise<TagConnections[]> {
  const clean = cleanTagQuery(query)
  if (!clean) return []
  const tags = await storageAPI
    .query<Tag>(
      'SELECT * FROM core_tags WHERE LOWER(name) LIKE ? ORDER BY name ASC LIMIT ?',
      [`%${clean}%`, limit],
    )
    .catch(() => [])
  return Promise.all(tags.map((tag) => getTagConnections(tag)))
}
