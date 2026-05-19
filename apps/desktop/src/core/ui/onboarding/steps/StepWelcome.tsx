import { Brain, Dumbbell, BriefcaseBusiness, Sparkles } from 'lucide-react'
import { NoraLogoMark } from '../../components/NoraLogo'

interface Props {
  onNext: () => void
}

const WELCOME_ITEMS = [
  { icon: Dumbbell, text: 'Seguí tu fitness, peso y hábitos' },
  { icon: BriefcaseBusiness, text: 'Organizá tu trabajo con Kanban y notas' },
  { icon: Brain, text: 'El sistema aprende de tu actividad y te sugiere acciones' },
  { icon: Sparkles, text: 'Ganás XP y subís de nivel mientras vivís tu vida' },
]

export function StepWelcome({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center text-center gap-8 animate-fade-in">
      <div className="space-y-3">
        {/* Logo oficial Nora OS - ver visual-id/. */}
        <NoraLogoMark size={72} glow className="mx-auto text-foreground/80" />
        <p className="text-xs uppercase tracking-[0.25em] text-muted font-display">Bienvenidx a</p>
        <h1 className="font-display text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-accent-light to-accent bg-clip-text text-transparent">
          Nora OS
        </h1>
        <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
          Tu sistema operativo personal. No una app más —<br />
          <span className="text-white/80">un motor para organizarte, crecer y entenderte.</span>
        </p>
      </div>

      <div className="max-w-md text-sm text-muted space-y-3 text-left bg-surface-light/60 border border-border rounded-2xl p-6">
        <p className="text-white font-medium">¿Qué es Nora OS?</p>
        <ul className="space-y-2">
          {WELCOME_ITEMS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-2">
              <Icon size={14} className="mt-0.5 text-muted/90" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onNext}
        className="rounded-2xl bg-accent hover:bg-accent/80 active:scale-95 transition-all px-10 py-3.5 text-base font-semibold text-white shadow-xl shadow-accent/20"
      >
        Comenzar →
      </button>
    </div>
  )
}
