import { useState } from 'react'
import { Archive, ChevronDown, ChevronUp, FolderKanban, Search, Timer, Trash2 } from 'lucide-react'
import type { Project } from '../types'
import type { ProjectStats } from '../projectsAggregation'

interface Props {
  project: Project
  /** Estadísticas del proyecto (ya computadas por `computeProjectStats`). */
  stats: ProjectStats | undefined
  selected: boolean
  onSelect: (project: Project) => void
  onArchive: (project: Project) => void
  onDelete: (project: Project) => void
}

function formatFocus(ms: number): string {
  if (ms <= 0) return '0m'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

/**
 * Tarjeta de proyecto activo: en reposo muestra solo el avatar con inicial y el
 * nombre (fila compacta) con un toggle para expandir. Al expandir muestra la
 * descripción recortada, chips de estadísticas (tarjetas, notas, foco,
 * menciones, tags) y las acciones de archivar/eliminar. Las acciones se delegan
 * en el padre.
 */
export function ProjectCard({ project, stats, selected, onSelect, onArchive, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = `project-details-${project.id}`

  return (
    <article
      className={`group relative rounded-2xl border bg-surface transition-colors ${
        expanded ? 'p-4' : 'p-1'
      } ${
        selected
          ? 'border-accent/40 bg-accent/5'
          : 'border-border hover:border-accent/25 hover:bg-surface-light/40'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelect(project)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl text-left focus:outline-none"
          aria-label={`Ver detalle del proyecto ${project.name}`}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white"
            style={{ backgroundColor: project.color }}
            aria-hidden="true"
          >
            {project.name.charAt(0).toUpperCase()}
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-white">{project.name}</span>
              {selected && (
                <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-accent-light">
                  Detalle
                </span>
              )}
            </span>
          </span>
        </button>

        <button
          type="button"
          aria-label={expanded ? `Contraer proyecto ${project.name}` : `Expandir proyecto ${project.name}`}
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((value) => !value)
          }}
          className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-white focus:outline-none"
        >
          {expanded ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>
      </div>

      {expanded && (
        <div id={detailsId} className="mt-3 border-t border-border/50 pt-3">
          {project.description && (
            <p className="line-clamp-2 text-xs text-muted">{project.description}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1">
              <FolderKanban size={12} aria-hidden="true" />
              {stats?.cardCount ?? 0} tarjetas
            </span>
            {stats && stats.noteCount > 0 && <span>{stats.noteCount} notas</span>}
            {stats && stats.sessionCount > 0 && (
              <span className="flex items-center gap-1">
                <Timer size={12} aria-hidden="true" />
                {stats.sessionCount} sesiones · {formatFocus(stats.focusMs)}
              </span>
            )}
            {stats && stats.mentionCount > 0 && (
              <span className="flex items-center gap-1 rounded-full border border-accent/20 bg-accent/5 px-2 py-0.5 text-accent-light">
                <Search size={11} aria-hidden="true" />
                {stats.mentionCount} menciones
              </span>
            )}
          </div>

          {stats && stats.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1" aria-label="Etiquetas del proyecto">
              {stats.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border/70 bg-surface-light px-1.5 py-0.5 text-[10px] text-muted"
                >
                  #{tag}
                </span>
              ))}
              {stats.tags.length > 3 && (
                <span className="text-[10px] text-muted">+{stats.tags.length - 3}</span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-0.5 border-t border-border/50 pt-2">
            <button
              type="button"
              title="Archivar proyecto"
              aria-label={`Archivar proyecto ${project.name}`}
              onClick={() => onArchive(project)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface hover:text-white focus:outline-none"
            >
              <Archive size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              title="Eliminar proyecto"
              aria-label={`Eliminar proyecto ${project.name}`}
              onClick={() => onDelete(project)}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger focus:outline-none"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
