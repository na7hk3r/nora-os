import { Link2, X } from 'lucide-react'
import type { Card, Note, Project, ProjectLink } from '../types'
import type { ProjectStats } from '../projectsAggregation'

interface Props {
  project: Project
  /** Estadísticas del proyecto (ya computadas por `computeProjectStats`). */
  stats: ProjectStats | undefined
  /** Vínculos del proyecto con sus entidades resueltas. */
  links: ProjectLink[]
  cards: Card[]
  notes: Note[]
  /** Deselecciona el proyecto (cierra el panel). */
  onDeselect: () => void
  /** Archiva el proyecto. */
  onArchive: (project: Project) => void
  /** Elimina el proyecto (con confirmación y deshacer delegados en el padre). */
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

function resolveTitle(
  link: ProjectLink,
  cards: Card[],
  notes: Note[],
): string {
  if (link.entityType === 'work_card') {
    return cards.find((card) => card.id === link.entityId)?.title ?? 'Tarjeta'
  }
  if (link.entityType === 'work_note') {
    return notes.find((note) => note.id === link.entityId)?.title ?? 'Nota'
  }
  return 'Sesión de foco'
}

function entityLabel(link: ProjectLink): string {
  if (link.entityType === 'work_card') return 'Tarjeta'
  if (link.entityType === 'work_note') return 'Nota'
  return 'Foco'
}

/**
 * Panel de detalle de un proyecto: descripción y estadísticas individuales,
 * además de la lista de entidades vinculadas (tarjetas, notas y sesiones de
 * foco) con sus títulos resueltos. Componente presentacional — las acciones
 * (archivar, eliminar) se delegan en el padre.
 */
export function ProjectDetailPanel({
  project,
  stats,
  links,
  cards,
  notes,
  onDeselect,
  onArchive,
  onDelete,
}: Props) {
  return (
    <aside className="plugin-panel flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <span
            className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: project.color }}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-sm font-semibold text-white">{project.name}</h4>
            {project.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{project.description}</p>
            )}
          </div>
        </div>
        <button
          type="button"
          title="Cerrar detalle"
          aria-label="Cerrar detalle"
          onClick={onDeselect}
          className="shrink-0 rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-light hover:text-white focus:outline-none"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {stats ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <dt className="text-muted">Tarjetas</dt>
            <dd className="text-sm text-white">{stats.cardCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Notas</dt>
            <dd className="text-sm text-white">{stats.noteCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Menciones</dt>
            <dd className="text-sm text-white">{stats.mentionCount}</dd>
          </div>
          <div>
            <dt className="text-muted">Sesiones</dt>
            <dd className="text-sm text-white">{stats.sessionCount}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted">Tiempo de foco</dt>
            <dd className="text-sm text-white">{formatFocus(stats.focusMs)}</dd>
          </div>
          {stats.tags.length > 0 && (
            <div className="col-span-2">
              <dt className="text-muted">Etiquetas</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1">
                {stats.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-light px-1.5 py-0.5 text-[10px] text-muted">
                    #{tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      ) : null}

      <section aria-label="Entidades vinculadas">
        <h5 className="mb-1.5 flex items-center gap-1.5 text-xs text-muted">
          <Link2 size={12} aria-hidden="true" />
          Vinculado
          <span className="text-muted">({links.length})</span>
        </h5>
        {links.length === 0 ? (
          <p className="text-xs text-muted">Sin entidades vinculadas aún.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={`${link.entityType}-${link.entityId}`} className="text-xs text-white">
                <span className="font-medium">{resolveTitle(link, cards, notes)}</span>
                <span className="ml-1.5 text-[10px] uppercase text-muted">{entityLabel(link)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onArchive(project)}
          className="flex-1 rounded-xl border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-white"
        >
          Archivar
        </button>
        <button
          type="button"
          onClick={() => onDelete(project)}
          className="rounded-xl border border-danger/30 px-3 py-2 text-sm text-danger transition-colors hover:border-danger/60"
        >
          Eliminar
        </button>
      </div>
    </aside>
  )
}
