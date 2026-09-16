import { useEffect, useState } from 'react'
import { Link2, Palette, X } from 'lucide-react'
import type { Card, Note, Project, ProjectLink } from '../types'
import type { ProjectStats } from '../projectsAggregation'
import { updateProject } from '../projects'
import { useToast } from '@core/ui/components/ToastProvider'
import { PROJECT_COLOR_PRESETS } from './InlineProjectForm'

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
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(project.name)
  const [color, setColor] = useState(project.color)
  const [description, setDescription] = useState(project.description)
  const [saving, setSaving] = useState(false)

  // Sincroniza el formulario cuando cambia el proyecto seleccionado.
  useEffect(() => {
    setName(project.name)
    setColor(project.color)
    setDescription(project.description)
    setEditing(false)
  }, [project.id, project.name, project.color, project.description])

  const handleSave = async () => {
    if (saving || !name.trim()) return
    setSaving(true)
    try {
      await updateProject(project.id, { name: name.trim(), color, description })
      toast.success('Proyecto actualizado')
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(project.name)
    setColor(project.color)
    setDescription(project.description)
    setEditing(false)
  }

  return (
    <aside className="plugin-panel flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleSave()
            }}
            className="flex min-w-0 flex-1 flex-col gap-3"
            aria-label="Editar proyecto"
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Nombre</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent/60 focus:outline-none"
              />
            </label>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="flex items-center gap-1.5 text-xs text-muted">
                <Palette size={12} aria-hidden="true" />
                Color
              </legend>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    aria-label={`Color ${preset}`}
                    aria-pressed={color === preset}
                    className={`h-6 w-6 rounded-full transition-transform ${
                      color === preset ? 'scale-110 ring-2 ring-white/70' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </fieldset>

            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Descripción</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={2}
                placeholder="Descripción opcional..."
                className="resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm text-white placeholder:text-muted focus:border-accent/60 focus:outline-none"
              />
            </label>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        ) : (
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
        )}
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar proyecto"
            className="shrink-0 rounded-lg border border-border px-2 py-1.5 text-xs text-muted transition-colors hover:border-accent/40 hover:text-white focus:outline-none"
          >
            Editar
          </button>
        )}
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
