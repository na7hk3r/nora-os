import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { useTimeStore } from '../store'
import { createProject, deleteProject, updateProject } from '../operations'
import { formatDuration, startOfWeekISO, sumDurationSec } from '../utils'

export function TimeProjectsPage() {
  const projects = useTimeStore((s) => s.projects)
  const entries = useTimeStore((s) => s.entries)

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')

  const submit = () => {
    if (!name.trim()) return
    void createProject({
      name,
      client: client || null,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
    })
    setName('')
    setClient('')
    setHourlyRate('')
  }

  const now = new Date()
  const weekStart = startOfWeekISO(now)

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <p className="text-sm text-muted">Definí proyectos y tarifas por hora para reportes facturables.</p>
      </header>

      <section className="rounded-2xl border border-border bg-surface-light/40 p-5 space-y-3">
        <p className="text-xs uppercase tracking-wider text-muted">Nuevo proyecto</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] items-end">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del proyecto"
            className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="Cliente (opcional)"
            className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            placeholder="Tarifa/h"
            className="rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm focus:border-accent/60 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent hover:bg-accent/80 disabled:opacity-40 px-3 py-2 text-sm font-medium text-white transition-colors"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">Tus proyectos</h2>
        {projects.length === 0 && (
          <p className="text-sm text-muted">Sin proyectos todavía. Creá el primero arriba.</p>
        )}
        <div className="divide-y divide-border rounded-2xl border border-border bg-surface-light/40">
          {projects.map((project) => {
            const projEntries = entries.filter((e) => e.projectId === project.id)
            const weekSec = sumDurationSec(projEntries, weekStart, now)
            const totalSec = projEntries.reduce(
              (acc, e) => acc + (e.end ? e.durationSec : 0),
              0,
            )
            return (
              <div key={project.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    defaultValue={project.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v && v !== project.name) void updateProject(project.id, { name: v })
                    }}
                    className="font-medium bg-transparent border-none px-0 focus:outline-none focus:ring-0 w-full"
                  />
                  <p className="text-xs text-muted">
                    {project.client ?? 'Sin cliente'}
                    {project.hourlyRate ? ` · ${project.hourlyRate}/h` : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-muted">
                  <div className="text-white tabular-nums">{formatDuration(weekSec)}</div>
                  <div>esta semana · {formatDuration(totalSec)} total</div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar "${project.name}"? Las entradas quedarán sin proyecto.`)) {
                      void deleteProject(project.id)
                    }
                  }}
                  className="rounded-md p-1.5 text-muted hover:text-rose-300"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
