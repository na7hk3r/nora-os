import { useState, type FormEvent } from 'react'
import { Palette, Plus } from 'lucide-react'
import { createProject } from '../projects'
import type { Project } from '../types'

interface Props {
  /** Se delega al padre al crear y persistir el proyecto. */
  onCreated: (project: Project) => void
  /** Cancela la creación y cierra el formulario. */
  onCancel: () => void
}

export const PROJECT_COLOR_PRESETS: string[] = [
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#a78bfa',
  '#22d3ee',
  '#fb923c',
  '#f472b6',
]

const DEFAULT_NAME = 'Nuevo proyecto'

/**
 * Formulario inline de creación de proyecto: nombre + selector de color.
 * Delega en el servicio `createProject` (persistencia + store + evento) y
 * reporta el proyecto creado al padre mediante `onCreated`.
 */
export function InlineProjectForm({ onCreated, onCancel }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PROJECT_COLOR_PRESETS[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length === 0 || saving) return

    setSaving(true)
    setError(null)
    try {
      const project = await createProject({ name: trimmed, color })
      onCreated(project)
    } catch {
      setError('No se pudo crear el proyecto')
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      aria-label="Nuevo proyecto"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Nombre</span>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={DEFAULT_NAME}
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

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent/40 hover:text-white"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          <Plus size={14} aria-hidden="true" />
          Crear
        </button>
      </div>
    </form>
  )
}
