import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { messages } from '../../messages'

export type FirstActionKind = 'work_task' | 'fitness_weight' | 'skip'

export interface FirstActionResult {
  kind: FirstActionKind
  /** Para 'work_task': título de la tarea. Para 'fitness_weight': peso en kg. */
  value?: string
}

interface Props {
  /** Plugins activados en el paso anterior, para limitar opciones disponibles. */
  available: { fitness: boolean; work: boolean }
  onNext: (result: FirstActionResult) => void
}

/**
 * Paso "primera acción": forzamos al usuario a salir del estado vacío con un
 * dato real antes de entrar al sistema. Esto reduce el churn (el dashboard
 * vacío es la principal causa de abandono inmediato).
 *
 * El paso es opcional ("Saltar"), pero el default es hacerlo.
 */
export function StepFirstAction({ available, onNext }: Props) {
  const initialKind: FirstActionKind = available.work ? 'work_task' : available.fitness ? 'fitness_weight' : 'skip'
  const [kind, setKind] = useState<FirstActionKind>(initialKind)
  const [task, setTask] = useState('')
  const [weight, setWeight] = useState('')

  const canSubmit = (() => {
    if (kind === 'skip') return true
    if (kind === 'work_task') return task.trim().length > 0
    if (kind === 'fitness_weight') return parseFloat(weight) > 0
    return false
  })()

  const submit = () => {
    if (!canSubmit) return
    if (kind === 'work_task') onNext({ kind, value: task.trim() })
    else if (kind === 'fitness_weight') onNext({ kind, value: weight })
    else onNext({ kind: 'skip' })
  }

  return (
    <div className="flex flex-col items-center text-center gap-7 animate-fade-in">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Último paso</p>
        <h2 className="text-3xl font-bold">{messages.onboarding.firstActionHeading}</h2>
        <p className="text-sm text-muted max-w-md">{messages.onboarding.firstActionHelp}</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {available.work && (
          <ActionCard
            active={kind === 'work_task'}
            onSelect={() => setKind('work_task')}
            title="Crear tu primera tarea"
            description="Una cosa concreta para hacer hoy."
          >
            {kind === 'work_task' && (
              <input
                autoFocus
                type="text"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Ej: revisar mails de la mañana"
                className="mt-3 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            )}
          </ActionCard>
        )}

        {available.fitness && (
          <ActionCard
            active={kind === 'fitness_weight'}
            onSelect={() => setKind('fitness_weight')}
            title="Registrar tu peso de hoy"
            description="Punto de partida para el seguimiento."
          >
            {kind === 'fitness_weight' && (
              <input
                autoFocus
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="70"
                className="mt-3 w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/20"
              />
            )}
          </ActionCard>
        )}

        <button
          type="button"
          onClick={() => setKind('skip')}
          className={`w-full rounded-xl border p-3 text-sm transition-all ${
            kind === 'skip'
              ? 'border-border bg-surface-light/60 text-white'
              : 'border-border/60 bg-surface-light/20 text-muted hover:text-white'
          }`}
        >
          Saltar y entrar al sistema
        </button>
      </div>

      <button
        onClick={submit}
        disabled={!canSubmit}
        className="rounded-2xl bg-accent hover:bg-accent/80 disabled:opacity-40 active:scale-95 transition-all px-12 py-3 text-sm font-semibold text-white shadow-xl shadow-accent/20"
      >
        {messages.onboarding.finish}
      </button>
    </div>
  )
}

function ActionCard({
  active,
  onSelect,
  title,
  description,
  children,
}: {
  active: boolean
  onSelect: () => void
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
        active
          ? 'border-accent/60 bg-accent/5'
          : 'border-border bg-surface-light/40 hover:bg-surface-light/60'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex-shrink-0 text-accent-light">
          {active ? <CheckCircle2 size={18} /> : <Sparkles size={18} className="opacity-60" />}
        </span>
        <div className="flex-1">
          <p className="font-medium text-white text-sm">{title}</p>
          <p className="mt-0.5 text-xs text-muted">{description}</p>
          {children}
        </div>
      </div>
    </button>
  )
}
