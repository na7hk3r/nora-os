import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@core/ui/components/ToastProvider'
import { useWorkStore } from '../store'
import { ActiveProjectsSection } from './ActiveProjectsSection'
import * as projectsService from '../projects'
import type { Card, Project, ProjectLink } from '../types'

const project: Project = {
  id: 'proj_1',
  name: 'Lanzamiento',
  color: '#60a5fa',
  description: 'Release v2',
  archived: false,
  createdAt: '2026-09-01T10:00:00.000Z',
  archivedAt: null,
}

const linkedCard: Card = {
  id: 'card_1',
  columnId: 'todo',
  title: 'Preparar release',
  description: '',
  content: '',
  labels: [],
  dueDate: null,
  position: 0,
}

const projectLink: ProjectLink = {
  id: 'pl_1',
  projectId: 'proj_1',
  entityType: 'work_card',
  entityId: 'card_1',
  createdAt: '2026-09-01T10:00:00.000Z',
}

function renderSection() {
  return render(
    <ToastProvider>
      <ActiveProjectsSection />
    </ToastProvider>,
  )
}

describe('ActiveProjectsSection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useWorkStore.setState({
      projects: [],
      projectLinks: [],
      selectedProjectId: null,
      cards: [],
      notes: [],
      focusSessions: [],
    })
  })

  it('muestra el estado vacío sin proyectos', async () => {
    renderSection()

    await screen.findByText(/no hay proyectos todavía/i)
    expect(screen.getByText('Proyectos activos')).toBeInTheDocument()
  })

  it('lista el proyecto activo con sus estadísticas y menciones del event log', async () => {
    useWorkStore.setState({
      projects: [project],
      projectLinks: [projectLink],
      cards: [linkedCard],
    })
    vi.spyOn(window.storage, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes('events_log')) {
        return [
          {
            id: 1,
            event_type: 'WORK_TASK_UPDATED',
            source: 'work',
            payload: JSON.stringify({ taskId: 'card_1' }),
            created_at: '2026-09-01T10:00:00.000Z',
          },
        ]
      }
      return []
    })

    renderSection()

    expect(screen.getByText('Lanzamiento')).toBeInTheDocument()
    expect(screen.getByText(/1 tarjetas/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/1 menciones/)).toBeInTheDocument()
    })
  })

  it('archiva el proyecto desde el botón de la tarjeta', async () => {
    useWorkStore.setState({ projects: [project] })
    const archiveSpy = vi.spyOn(projectsService, 'archiveProject').mockResolvedValue()

    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /archivar proyecto lanzamiento/i }))

    await waitFor(() => expect(archiveSpy).toHaveBeenCalledWith('proj_1'))
  })

  it('elimina el proyecto y encola el toast de undo', async () => {
    useWorkStore.setState({ projects: [project] })
    const deleteSpy = vi
      .spyOn(projectsService, 'deleteProject')
      .mockResolvedValue({ project, links: [] })

    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /eliminar proyecto lanzamiento/i }))

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith('proj_1'))
    expect(screen.getByText(/proyecto eliminado/i)).toBeInTheDocument()
  })

  it('crea un proyecto desde el formulario inline y lo muestra en la lista', async () => {
    const createSpy = vi
      .spyOn(projectsService, 'createProject')
      .mockImplementation(async (input) => {
        const created: Project = {
          ...project,
          id: 'proj_2',
          name: input.name,
          color: input.color,
        }
        useWorkStore.getState().addProject(created)
        return created
      })

    renderSection()

    fireEvent.click(screen.getByRole('button', { name: /nuevo proyecto/i }))
    const nameInput = screen.getByPlaceholderText(/nuevo proyecto/i)
    fireEvent.change(nameInput, { target: { value: 'Proyecto nuevo' } })
    fireEvent.click(screen.getByRole('button', { name: /crear/i }))

    await waitFor(() =>
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Proyecto nuevo' })),
    )
    expect(await screen.findByText('Proyecto nuevo')).toBeInTheDocument()
  })
})