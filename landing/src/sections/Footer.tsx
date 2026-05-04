// Footer minimalista: filosofía + atribución única "por na7hk3r".
import { NoraLogo } from '../components/NoraLogo'

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface/30 backdrop-blur mt-20">
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-16 pb-10 text-center">
        <div className="flex justify-center mb-8">
          <NoraLogo variant="full" size={125} glow />
        </div>
        <p className="font-display text-2xl md:text-3xl font-medium text-foreground leading-snug max-w-2xl mx-auto">
          Hecho con convicción.{' '}
          <span className="text-gradient-accent">Local-first.</span>{' '}
          Sin telemetría. Sin VC money.
        </p>
        <p className="mt-4 text-sm text-muted">
          Una herramienta que vive donde tienen que vivir las cosas tuyas: en tu máquina.
        </p>
        <p className="mt-10 text-xs text-muted">
          por{' '}
          <a
            href="https://smcurbelo.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            S.M. Curbelo.
          </a>
        </p>
      </div>
    </footer>
  )
}
