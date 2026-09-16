import { defineRepository } from '@core/storage/Repository'
import { storageAPI } from '@core/storage/StorageAPI'
import { eventBus } from '@core/events/EventBus'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import type { Project, ProjectLink, ProjectEntityType } from './types'

interface ProjectRow extends Record<string, unknown> {
  id: string
  name: string
  color: string
  description: string | null
  archived: number
  archived_at: number | null
  created_at: string
}

interface ProjectLinkRow extends Record<string, unknown> {
  id: string
  project_id: string
  entity_type: string
  entity_id: string
  created_at: string
}

export const projectsRepository = defineRepository<Project, ProjectRow>({
  table: 'work_projects',
  mapRow: (row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    description: row.description ?? '',
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    archivedAt: row.archived_at == null ? null : Number(row.archived_at),
  }),
  toRow: (entity) => ({
    id: entity.id,
    name: entity.name,
    color: entity.color,
    description: entity.description ?? '',
    archived: entity.archived ? 1 : 0,
    archived_at: entity.archivedAt ?? null,
    created_at: entity.createdAt,
  }),
})

function mapLinkRow(row: ProjectLinkRow): ProjectLink {
  return {
    id: row.id,
    projectId: row.project_id,
    entityType: row.entity_type as ProjectEntityType,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }
}

export async function createProject(input: {
  name: string
  color: string
  description?: string
}): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    color: input.color,
    description: input.description ?? '',
    archived: false,
    createdAt: new Date().toISOString(),
    archivedAt: null,
  }
  await projectsRepository.create(project)
  useWorkStore.getState().addProject(project)
  eventBus.emit(WORK_EVENTS.PROJECT_CREATED, { projectId: project.id, name: project.name })
  return project
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const current = useWorkStore.getState().projects.find((p) => p.id === id)
  if (!current) return
  const next = { ...current, ...patch }
  const updated = await projectsRepository.update(id, next)
  useWorkStore.getState().updateProject(id, updated ?? next)
  eventBus.emit(WORK_EVENTS.PROJECT_UPDATED, { projectId: id })
}

export async function archiveProject(id: string): Promise<void> {
  const current = useWorkStore.getState().projects.find((p) => p.id === id)
  if (!current) return
  const next = { ...current, archived: true, archivedAt: Date.now() }
  await projectsRepository.update(id, next)
  useWorkStore.getState().updateProject(id, next)
  eventBus.emit(WORK_EVENTS.PROJECT_UPDATED, { projectId: id })
}

export async function deleteProject(id: string): Promise<{ project: Project; links: ProjectLink[] }> {
  const store = useWorkStore.getState()
  const project = store.projects.find((p) => p.id === id)
  if (!project) {
    throw new Error(`deleteProject: project '${id}' not found`)
  }
  const linkRows = await storageAPI.query<ProjectLinkRow>(
    'SELECT * FROM work_project_links WHERE project_id = ?',
    [id],
  )
  const removedLinks = linkRows.map(mapLinkRow)
  await projectsRepository.delete(id)
  await storageAPI.execute('DELETE FROM work_project_links WHERE project_id = ?', [id])
  store.deleteProject(id)
  eventBus.emit(WORK_EVENTS.PROJECT_DELETED, { projectId: id })
  return { project, links: removedLinks }
}

export async function linkEntity(
  projectId: string,
  entityType: ProjectEntityType,
  entityId: string,
): Promise<void> {
  const id = crypto.randomUUID()
  await storageAPI.execute(
    `INSERT OR IGNORE INTO work_project_links (id, project_id, entity_type, entity_id) VALUES (?, ?, ?, ?)`,
    [id, projectId, entityType, entityId],
  )
  useWorkStore.getState().addProjectLink({
    id,
    projectId,
    entityType,
    entityId,
    createdAt: new Date().toISOString(),
  })
  eventBus.emit(WORK_EVENTS.PROJECT_LINKED, { projectId, entityType, entityId })
}

export async function unlinkLink(
  projectId: string,
  entityType: ProjectEntityType,
  entityId: string,
): Promise<void> {
  await storageAPI.execute(
    `DELETE FROM work_project_links WHERE project_id = ? AND entity_type = ? AND entity_id = ?`,
    [projectId, entityType, entityId],
  )
  useWorkStore.getState().removeProjectLink(projectId, entityType, entityId)
  eventBus.emit(WORK_EVENTS.PROJECT_UNLINKED, { projectId, entityType, entityId })
}

export async function unlinkEntityLinks(entityType: ProjectEntityType, entityId: string): Promise<void> {
  await storageAPI.execute(
    `DELETE FROM work_project_links WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId],
  )
  const store = useWorkStore.getState()
  for (const link of store.projectLinks.filter(
    (l) => l.entityType === entityType && l.entityId === entityId,
  )) {
    store.removeProjectLink(link.projectId, link.entityType, link.entityId)
  }
}