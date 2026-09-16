import { useEffect, useMemo, useState } from 'react'
import { FolderKanban, Plus } from 'lucide-react'
import { storageAPI } from '@core/storage/StorageAPI'
import { eventBus } from '@core/events/EventBus'
import type { EventLogEntry } from '@core/types'
import { archiveProject, createProject, deleteProject, linkEntity } from '../projects'
import { computeProjectStats } from '../projectsAggregation'
import { useWorkStore } from '../store'
import { WORK_EVENTS } from '../events'
import { useToast } from '@core/ui/components/ToastProvider'
import { ProjectCard } from './ProjectCard'
import { ProjectDetailPanel } from './ProjectDetailPanel'
import { InlineProjectForm } from './InlineProjectForm'

/**
 * Sección "Proyectos activos" del panel de trabajo: lista de proyectos no
 * archivados con sus estadísticas agregadas (tarjetas, notas, menciones,
 * foco) y un panel de detalle para el proyecto seleccionado. Delega la
 * creación, archivado y eliminación en el servicio, y re-encola la
 * eliminación permitiendo deshacer.
 */
export function ActiveProjectsSection() {
  const cards = useWorkStore((s) => s.cards)
  const notes = useWorkStore((s) => s.notes)
  const sessions = useWorkStore((s) => s.focusSessions)
  const links = useWorkStore((s) => s.projectLinks)
  const projects = useWorkStore((s) => s.projects)
  const selectedProjectId = useWorkStore((s) => s.selectedProjectId)
  const setSelectedProjectId = useWorkStore((s) => s.setSelectedProjectId)
  const { toast } = useToast()
  const [recentEvents, setRecentEvents] = useState<EventLogEntry[]>([])
  const [creating, setCreating] = useState(false)

  const activeProjects = projects.filter((project) => !project.archived)
  const selectedProject =
    activeProjects.find((project) => project.id === selectedProjectId) ?? null

  // Recarga el event log del plugin para computar menciones reales por
  // entidad vinculada (tarjetas, notas y sesiones de foco).
  useEffect(() => {
    const loadRecentEvents = () => {
      storageAPI
        .getRecentEvents(200)
        .then((events) => {
          setRecentEvents(events.filter((entry) => entry.source === 'work'))
        })
        .catch(() => {})
    }

    loadRecentEvents()

    const unsubscribes = Object.values(WORK_EVENTS).map((eventName) =>
      eventBus.on(eventName, loadRecentEvents),
    )

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [])

  const statsByProject = useMemo(
    () => computeProjectStats(projects, links, cards, notes, sessions, recentEvents),
    [projects, links, cards, notes, sessions, recentEvents],
  )

  const handleArchive = async (projectId: string) => {
    await archiveProject(projectId)
    if (selectedProjectId === projectId) setSelectedProjectId(null)
    toast.success('Proyecto archivado')
  }

  const handleDelete = async (projectId: string) => {
    const { project, links: removedLinks } = await deleteProject(projectId)
    if (selectedProjectId === projectId) setSelectedProjectId(null)
    toast.undo({
      message: 'Proyecto eliminado',
      onUndo: async () => {
        const restored = await createProject({
          name: project.name,
          color: project.color,
          description: project.description,
        })
        // Re-vincular las entidades que estaban asociadas al proyecto.
        for (const link of removedLinks) {
          await linkEntity(restored.id, link.entityType, link.entityId)
        }
        setSelectedProjectId(restored.id)
      },
    })
  }

  return (
    <section className="plugin-panel flex flex-col gap-4">
      {selectedProject ? (
        <ProjectDetailPanel
          project={selectedProject}
          stats={statsByProject.get(selectedProject.id)}
          links={links.filter((link) => link.projectId === selectedProject.id)}
          cards={cards}
          notes={notes}
          onDeselect={() => setSelectedProjectId(null)}
          onArchive={(project) => void handleArchive(project.id)}
          onDelete={(project) => void handleDelete(project.id)}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban size={14} className="text-accent-light" aria-hidden="true" />
              <h4 className="text-sm font-semibold text-white">Proyectos activos</h4>
              <span className="text-xs text-muted">{activeProjects.length}</span>
            </div>
            {!creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-white"
              >
                <Plus size={14} className="text-accent-light" aria-hidden="true" />
                Nuevo proyecto
              </button>
            )}
          </div>

          {creating && (
            <InlineProjectForm
              onCreated={(project) => {
                setSelectedProjectId(project.id)
                toast.success(`Proyecto "${project.name}" creado`)
                setCreating(false)
              }}
              onCancel={() => setCreating(false)}
            />
          )}

          {activeProjects.length === 0 ? (
            <p className="text-sm text-muted">No hay proyectos todavía. Crea uno para organizar tu trabajo.</p>
          ) : (
            <ul className="flex flex-col">
              {activeProjects.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    project={project}
                    stats={statsByProject.get(project.id)}
                    selected={project.id === selectedProjectId}
                    onSelect={(p) => setSelectedProjectId(p.id)}
                    onArchive={(p) => void handleArchive(p.id)}
                    onDelete={(p) => void handleDelete(p.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}