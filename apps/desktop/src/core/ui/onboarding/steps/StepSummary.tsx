import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { messages } from '../../messages'
import type { FirstActionResult } from './StepFirstAction'

interface SummaryItem {
  label: string
  value: string
}

interface Props {
  name: string
  bigGoal?: string
  plugins: { fitness: boolean; work: boolean }
  fitnessGoal?: string
  firstAction?: FirstActionResult | null
  onFinish: (opts?: { loadDemo?: boolean }) => void
}

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Bajar de peso',
  gain_weight: 'Subir de peso',
  consistency: 'Mantener constancia',
}

function firstActionLabel(action: FirstActionResult | null | undefined): string | null {
  if (!action || action.kind === 'skip') return null
  if (action.kind === 'work_task') return `Tarea creada: "${action.value ?? ''}"`
  if (action.kind === 'fitness_weight') return `Peso registrado: ${action.value} kg`
  return null
}

export function StepSummary({ name, bigGoal, plugins, fitnessGoal, firstAction, onFinish }: Props) {
  const [loadDemo, setLoadDemo] = useState(false)

  const items: SummaryItem[] = [
    { label: 'Nombre', value: name },
    ...(bigGoal ? [{ label: 'Tu objetivo', value: bigGoal }] : []),
    {
      label: 'Módulos activos',
      value: [plugins.fitness && 'Fitness', plugins.work && 'Work']
        .filter(Boolean)
        .join(' · '),
    },
    ...(fitnessGoal ? [{ label: 'Objetivo fitness', value: GOAL_LABELS[fitnessGoal] ?? fitnessGoal }] : []),
  ]
  const actionLine = firstActionLabel(firstAction)
  if (actionLine) {
    items.push({ label: 'Primera acción', value: actionLine })
  }

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <div className="flex justify-center">
          <Sparkles size={40} className="text-accent-light" />
        </div>
        <h2 className="text-3xl font-bold">{messages.onboarding.summaryHeading(name)}</h2>
        <p className="text-sm text-muted">{messages.onboarding.summaryHelp}</p>
      </div>

      <div className="w-full max-w-sm bg-surface-light/60 border border-border rounded-2xl divide-y divide-border overflow-hidden">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-5 py-3.5 text-sm gap-3">
            <span className="text-muted flex-shrink-0">{item.label}</span>
            <span className="text-white font-medium text-right truncate max-w-[60%]">{item.value}</span>
          </div>
        ))}
      </div>

      <label className="flex items-start gap-3 w-full max-w-sm cursor-pointer rounded-xl border border-border bg-surface-light/40 px-4 py-3 text-left hover:border-accent/40 transition-colors">
        <input
          type="checkbox"
          checked={loadDemo}
          onChange={(e) => setLoadDemo(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border bg-surface text-accent focus:ring-accent/40"
        />
        <span className="text-xs text-muted">
          <span className="text-white font-medium block mb-0.5">Cargar datos de ejemplo</span>
          Inserta 2–3 filas en cada plugin activo para que el copiloto y el dashboard tengan algo
          que mostrarte. Podés borrarlos después.
        </span>
      </label>

      <div className="space-y-2 text-center max-w-xs">
        <p className="text-xs text-muted">
          Nora OS guarda todo localmente. Tus datos son solo tuyos.
        </p>
      </div>

      <button
        onClick={() => onFinish({ loadDemo })}
        className="rounded-2xl bg-accent hover:bg-accent/80 active:scale-95 transition-all px-12 py-3.5 text-base font-semibold text-white shadow-xl shadow-accent/20"
      >
        {messages.onboarding.finish}
      </button>
    </div>
  )
}
