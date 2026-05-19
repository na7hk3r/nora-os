import { useState } from 'react'
import { messages } from '../../messages'

interface Props {
  initialName: string
  initialBigGoal?: string
  onNext: (data: { name: string; bigGoal: string }) => void
}

export function StepName({ initialName, initialBigGoal = '', onNext }: Props) {
  const [name, setName] = useState(initialName)
  const [bigGoal, setBigGoal] = useState(initialBigGoal)

  const submit = () => {
    if (name.trim()) onNext({ name: name.trim(), bigGoal: bigGoal.trim() })
  }

  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Paso 1 de 4</p>
        <h2 className="text-3xl font-bold">{messages.onboarding.nameHeading}</h2>
        <p className="text-sm text-muted">{messages.onboarding.nameHelp}</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Tu nombre"
          className="w-full rounded-xl border border-border bg-surface/80 px-5 py-3.5 text-lg text-center placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
        />

        <div className="text-left space-y-1">
          <label className="text-xs uppercase tracking-eyebrow text-muted">
            ¿Cuál es tu gran objetivo este año? <span className="text-muted/60 normal-case tracking-normal">(opcional)</span>
          </label>
          <textarea
            value={bigGoal}
            onChange={(e) => setBigGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
            }}
            placeholder="Ej: terminar la carrera, sostener foco profundo cada mañana…"
            rows={2}
            className="w-full rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm placeholder:text-muted/40 focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
          />
          <p className="text-caption text-muted/70">
            Tu copiloto lo va a recordar y te lo va a devolver cuando te disperses.
          </p>
        </div>

        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full rounded-2xl bg-accent hover:bg-accent/80 disabled:opacity-40 active:scale-95 transition-all px-8 py-3 text-sm font-semibold text-white"
        >
          {messages.actions.continue}
        </button>
      </div>
    </div>
  )
}
