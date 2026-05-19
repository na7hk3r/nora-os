import { useState } from 'react'
import { BriefcaseBusiness, Dumbbell } from 'lucide-react'

export interface PluginSelection {
  fitness: boolean
  work: boolean
}

interface Props {
  initial: PluginSelection
  onNext: (selection: PluginSelection) => void
}

const PLUGIN_OPTIONS = [
  {
    id: 'fitness' as const,
    icon: <Dumbbell size={24} />,
    title: 'Fitness & Salud',
    description: 'Registrá tu peso, comidas, entrenamientos y medidas corporales. Seguí tus hábitos día a día.',
    color: 'hover:border-success/60',
    activeColor: 'border-success/60 bg-success/5',
  },
  {
    id: 'work' as const,
    icon: <BriefcaseBusiness size={24} />,
    title: 'Work & Productividad',
    description: 'Tablero Kanban, notas y gestión de enlaces. Todo lo que necesitás para organizar tu trabajo.',
    color: 'hover:border-accent/60',
    activeColor: 'border-accent/60 bg-accent/5',
  },
]

export function StepPlugins({ initial, onNext }: Props) {
  const [selection, setSelection] = useState<PluginSelection>(initial)

  const toggle = (id: keyof PluginSelection) => {
    setSelection((s) => ({ ...s, [id]: !s[id] }))
  }

  const anySelected = selection.fitness || selection.work

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Paso 2 de 4</p>
        <h2 className="text-3xl font-bold">¿Qué módulos querés activar?</h2>
        <p className="text-sm text-muted">
          Podés cambiarlos después en Configuración.
        </p>
      </div>

      <div className="w-full max-w-lg space-y-3">
        {PLUGIN_OPTIONS.map((plugin) => {
          const active = selection[plugin.id]
          return (
            <button
              key={plugin.id}
              onClick={() => toggle(plugin.id)}
              className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 ${
                active ? plugin.activeColor : 'border-border bg-surface-light/40 hover:bg-surface-light/60 ' + plugin.color
              }`}
            >
              <div className="flex items-start gap-4">
                <span className="leading-none text-muted/90">{plugin.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-white">{plugin.title}</p>
                    <span
                      className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        active ? 'border-success bg-success' : 'border-border'
                      }`}
                    >
                      {active && <span className="text-micro text-white font-bold">✓</span>}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{plugin.description}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <button
        onClick={() => onNext(selection)}
        disabled={!anySelected}
        className="rounded-2xl bg-accent hover:bg-accent/80 disabled:opacity-40 active:scale-95 transition-all px-10 py-3 text-sm font-semibold text-white"
      >
        Continuar →
      </button>

      {!anySelected && (
        <p className="text-xs text-muted -mt-4">Seleccioná al menos un módulo para continuar.</p>
      )}
    </div>
  )
}
