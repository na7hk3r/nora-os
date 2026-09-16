import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { eventBus } from '@core/events/EventBus'
import { useWorkStore } from './store'
import { WORK_EVENTS } from './events'
import {
  archiveProject,
  createProject,
  deleteProject,
  linkEntity,
  unlinkEntityLinks,
  unlinkLink,
  updateProject,
} from './projects'
import type { Project, ProjectLink } from './types'

function resetWorkStore() {
  useWorkStore.setState({
    projects: [],
    projectLinks: [],
    selectedProjectId: null,
  })
}

function makeProject(partial: Partial<Project> = {}): Project {
  return {
    id: partial.id ?? 'p1',
    name: partial.name ?? 'Proyecto A',
    color: partial.color ?? '#60a5fa',
    description: partial.description ?? '',
    archived: partial.archived ?? false,
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    archivedAt: partial.archivedAt ?? null,
  }
}

function makeLink(partial: Partial<ProjectLink> = {}): ProjectLink {
  return {
    id: partial.id ?? 'l1',
    projectId: partial.projectId ?? 'p1',
    entityType: partial.entityType ?? 'work_card',
    entityId: partial.entityId ?? 'c1',
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
  }
}

describe('work projects service', () => {
  let emit: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    resetWorkStore()
    emit = vi.spyOn(eventBus, 'emit').mockImplementation(() => undefined)
    vi.spyOn(window.storage, 'execute').mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
    vi.spyOn(window.storage, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes('FROM work_project_links')) {
        return [
          { id: 'l1', project_id: 'p1', entity_type: 'work_card', entity_id: 'c1', created_at: '2026-01-01T00:00:00.000Z' },
          { id: 'l2', project_id: 'p1', entity_type: 'work_note', entity_id: 'n1', created_at: '2026-01-01T00:00:00.000Z' },
        ]
      }
      return []
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetWorkStore()
  })

  it('createProject inserts via storage, updates the store and emits PROJECT_CREATED', async () => {
    const project = await createProject({ name: 'Nuevo', color: '#22d3ee' })

    expect(window.storage.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO work_projects'),
      expect.arrayContaining([project.id, 'Nuevo', '#22d3ee']),
    )
    expect(useWorkStore.getState().projects).toEqual([project])
    expect(emit).toHaveBeenCalledWith(WORK_EVENTS.PROJECT_CREATED, {
      projectId: project.id,
      name: 'Nuevo',
    })
    expect(project).toMatchObject({ name: 'Nuevo', color: '#22d3ee', archived: false })
  })

  it('updateProject patches the entity and emits PROJECT_UPDATED', async () => {
    useWorkStore.setState({ projects: [makeProject()] })

    await updateProject('p1', { name: 'Renombrado', description: 'desc' })

    expect(useWorkStore.getState().projects[0]).toMatchObject({
      name: 'Renombrado',
      description: 'desc',
      color: '#60a5fa',
    })
    expect(emit).toHaveBeenCalledWith(WORK_EVENTS.PROJECT_UPDATED, { projectId: 'p1' })
  })

  it('archiveProject marks the project as archived with archivedAt', async () => {
    useWorkStore.setState({ projects: [makeProject()] })

    await archiveProject('p1')

    const archived = useWorkStore.getState().projects[0]
    expect(archived.archived).toBe(true)
    expect(archived.archivedAt).toEqual(expect.any(Number))
    expect(emit).toHaveBeenCalledWith(WORK_EVENTS.PROJECT_UPDATED, { projectId: 'p1' })
  })

  it('linkEntity inserts with OR IGNORE and dedupes in the store', async () => {
    await linkEntity('p1', 'work_card', 'c1')
    await linkEntity('p1', 'work_card', 'c1')

    const inserts = (window.storage.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT OR IGNORE INTO work_project_links'),
    )
    expect(inserts).toHaveLength(2)
    expect(useWorkStore.getState().projectLinks).toHaveLength(1)
    expect(useWorkStore.getState().projectLinks[0]).toMatchObject({
      projectId: 'p1',
      entityType: 'work_card',
      entityId: 'c1',
    })
    expect(emit).toHaveBeenCalledWith(WORK_EVENTS.PROJECT_LINKED, {
      projectId: 'p1',
      entityType: 'work_card',
      entityId: 'c1',
    })
  })

  it('unlinkLink removes the triple and emits PROJECT_UNLINKED', async () => {
    useWorkStore.setState({ projectLinks: [makeLink()] })

    await unlinkLink('p1', 'work_card', 'c1')

    expect(window.storage.execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM work_project_links WHERE project_id = ? AND entity_type = ? AND entity_id = ?'),
      ['p1', 'work_card', 'c1'],
    )
    expect(useWorkStore.getState().projectLinks).toHaveLength(0)
    expect(emit).toHaveBeenCalledWith(WORK_EVENTS.PROJECT_UNLINKED, {
      projectId: 'p1',
      entityType: 'work_card',
      entityId: 'c1',
    })
  })

  it('deleteProject returns project + links and removes both from the store', async () => {
    useWorkStore.setState({
      projects: [makeProject()],
      projectLinks: [
        makeLink({ id: 'l1', entityType: 'work_card', entityId: 'c1' }),
        makeLink({ id: 'l2', entityType: 'work_note', entityId: 'n1' }),
      ],
      selectedProjectId: 'p1',
    })

    const result = await deleteProject('p1')

    expect(result.project.id).toBe('p1')
    expect(result.links).toHaveLength(2)
    expect(window.storage.execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM work_project_links WHERE project_id = ?'),
      ['p1'],
    )
    const state = useWorkStore.getState()
    expect(state.projects).toHaveLength(0)
    expect(state.projectLinks).toHaveLength(0)
    expect(state.selectedProjectId).toBeNull()
    expect(emit).toHaveBeenCalledWith(WORK_EVENTS.PROJECT_DELETED, { projectId: 'p1' })
  })

  it('unlinkEntityLinks removes every link pointing to the entity', async () => {
    useWorkStore.setState({
      projectLinks: [
        makeLink({ id: 'l1', projectId: 'p1', entityType: 'work_card', entityId: 'c1' }),
        makeLink({ id: 'l2', projectId: 'p2', entityType: 'work_card', entityId: 'c1' }),
        makeLink({ id: 'l3', projectId: 'p1', entityType: 'work_note', entityId: 'n1' }),
      ],
    })

    await unlinkEntityLinks('work_card', 'c1')

    expect(window.storage.execute).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM work_project_links WHERE entity_type = ? AND entity_id = ?'),
      ['work_card', 'c1'],
    )
    const remaining = useWorkStore.getState().projectLinks
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toMatchObject({ projectId: 'p1', entityType: 'work_note', entityId: 'n1' })
  })
})