// Reformado: hero centrado al estilo inkdrop, mockup + glow violeta, micro-animación stagger y bloque emocional integrado.
import { Github, ExternalLink, Cloud, ShieldCheck, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { DownloadButton } from '../components/DownloadButton'
import { BrandIcon } from '../components/BrandIcon'
import { NoraLogo } from '../components/NoraLogo'
import { useTypewriter } from '../hooks/useTypewriter'
import { useLatestRelease } from '../hooks/useLatestRelease'

const REPO_URL = 'https://github.com/na7hk3r/nora-os'

const COPILOT_LINE =
  'Hoy estás 18% por debajo de tu foco semanal. Tenés 2 tareas que vencen hoy.'

// Iconos brand flotantes — orbita alrededor del mockup. Decisión: 6 elementos con stagger
// ligero para no saturar; siguen la regla "estética nunca a costa de claridad".
const FLOATING_ICONS = [
  { name: 'LaptopShell', label: 'Productividad', x: '-78%', y: '8%', delay: 0.1 },
  { name: 'Magic', label: 'Hábitos', x: '78%', y: '12%', delay: 0.18 },
  { name: 'TreasureChest', label: 'Finanzas', x: '-90%', y: '70%', delay: 0.25 },
  { name: 'HourGlass', label: 'Tiempo', x: '90%', y: '68%', delay: 0.33 },
  { name: 'TomeIdea', label: 'Conocimiento', x: '-50%', y: '105%', delay: 0.42 },
  { name: 'CrystalBallEye', label: 'Copiloto IA', x: '50%', y: '105%', delay: 0.5 },
] as const

export function Hero() {
  const { release } = useLatestRelease()
  const { text, done, ref } = useTypewriter<HTMLDivElement>(COPILOT_LINE, {
    speed: 28,
    startDelay: 600,
    whenVisible: true,
  })

  return (
    <section className="relative pt-24 pb-16 md:pt-36 md:pb-28 px-4 md:px-8 overflow-hidden">
      {/* Capa de gradiente reforzado — tensión azul/violeta detrás del hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full bg-accent/20 blur-[140px] animate-glow-pulse" />
        <div className="absolute top-40 left-[-10%] w-[480px] h-[480px] rounded-full bg-blue-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(rgb(var(--color-muted) / 0.35) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage:
              'radial-gradient(ellipse at 50% 30%, #000 35%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at 50% 30%, #000 35%, transparent 75%)',
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto text-center">
        {/* Logo principal del hero — isotipo grande con glow. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex justify-center mb-6"
        >
          <NoraLogo variant="mark-original" size={160} glow />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-light/80 backdrop-blur border border-border text-xs sm:text-sm text-muted mb-6"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
          Copiloto local · Sin nube · Open source
          {release && (
            <span className="hidden sm:inline-flex items-center gap-1 ml-2 pl-2 border-l border-border/70 text-foreground font-mono text-xs">
              v{release.version}
            </span>
          )}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-[1.05]"
        >
          El copiloto que conoce
          <span className="block mt-2 text-gradient-accent animate-gradient-shift">
            toda tu vida.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 font-mono text-[11px] md:text-xs uppercase tracking-[0.4em] text-accent-light/80"
        >
          Tu sistema · Tu vida · Una sola IA
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted leading-relaxed"
        >
          Nora OS conecta tu trabajo, salud, hábitos y finanzas para decirte
          qué hacer hoy — sin enviar tus datos a ningún servidor.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <DownloadButton size="lg" />
          <Button
            as="a"
            href={REPO_URL}
            variant="secondary"
            size="lg"
            target="_blank"
            rel="noopener noreferrer"
            leftIcon={<Github className="w-5 h-5" aria-hidden="true" />}
            rightIcon={<ExternalLink className="w-4 h-4" aria-hidden="true" />}
          >
            Ver en GitHub
          </Button>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted"
        >
          <li className="inline-flex items-center gap-1.5">
            <Cloud className="w-3.5 h-3.5 text-accent-light" aria-hidden="true" /> Sin cuenta requerida
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-light" aria-hidden="true" /> Cifrado AES-256-GCM
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-accent-light" aria-hidden="true" /> 100% local · Licencia ISC
          </li>
        </motion.ul>
      </div>

      {/* MOCKUP + iconos flotantes. Inspirado en el device shot de inkdrop. */}
      <div className="relative max-w-4xl mx-auto mt-16 md:mt-20">
        {/* Iconos brand orbitando — solo desktop para no saturar mobile. */}
        <div aria-hidden="true" className="hidden lg:block absolute inset-0 pointer-events-none">
          {FLOATING_ICONS.map((icon) => (
            <motion.div
              key={icon.name}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 + icon.delay, ease: 'backOut' }}
              className="absolute top-1/2 left-1/2"
              style={{ transform: `translate(${icon.x}, ${icon.y})` }}
            >
              <div className="animate-floaty" style={{ animationDelay: `${icon.delay * 2}s` }}>
                <div
                  className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl bg-surface/90 backdrop-blur border border-border/60 shadow-glow-sm"
                  title={icon.label}
                >
                  <BrandIcon name={icon.name} size={36} tile={false} />
                  <span className="text-[10px] uppercase tracking-widest text-muted">
                    {icon.label}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Glow detrás del mockup */}
        <div
          aria-hidden="true"
          className="absolute inset-x-10 top-10 bottom-0 bg-accent/25 blur-3xl rounded-full -z-10"
        />

        {/* Window frame estilizado: chrome + área que aloja la línea del copiloto.
            Decisión: usar un placeholder elegante (no screenshot real) para reducir CLS y no inflar el bundle. */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
          className="relative window-frame"
        >
          <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/60 bg-surface-light/60">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" aria-hidden="true" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" aria-hidden="true" />
            <NoraLogo variant="mark-original" size={16} className="ml-3" />
            <span className="text-[11px] font-mono text-muted tracking-wider">
              nora-os · daily brief
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] min-h-[300px]">
            {/* Sidebar simulada */}
            <aside className="hidden md:block border-r border-border/60 bg-base/40 p-4 text-[11px] uppercase tracking-widest text-muted space-y-3">
              <div className="text-foreground/70 font-semibold normal-case tracking-normal text-xs">
                Hoy · 09:14
              </div>
              <div className="space-y-2">
                {['Daily', 'Work', 'Hábitos', 'Fitness', 'Finanzas', 'Knowledge'].map((s, i) => (
                  <div
                    key={s}
                    className={`flex items-center gap-2 ${
                      i === 0 ? 'text-accent' : 'text-muted/80'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        i === 0 ? 'bg-accent' : 'bg-muted/40'
                      }`}
                      aria-hidden="true"
                    />
                    {s}
                  </div>
                ))}
              </div>
            </aside>

            {/* Body — el typewriter del copiloto vive acá adentro */}
            <div ref={ref} className="p-6 md:p-8 space-y-5 text-left" aria-live="polite">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse"
                  aria-hidden="true"
                />
                Copiloto · ahora
              </div>
              <p className="font-mono text-sm md:text-[1rem] text-foreground min-h-[3em] leading-relaxed">
                {text}
                <span
                  aria-hidden="true"
                  className={`inline-block w-[0.55ch] -mb-[2px] ml-[1px] bg-accent ${
                    done ? 'animate-pulse' : ''
                  }`}
                  style={{ height: '1em', verticalAlign: 'middle' }}
                />
              </p>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
                {[
                  { k: 'Foco', v: '2h 40m', sub: 'objetivo 4h' },
                  { k: 'Hábitos', v: '4/6', sub: 'racha activa' },
                  { k: 'Finanzas', v: '+12%', sub: 'sobre presupuesto' },
                  { k: 'Sueño', v: '6h 10m', sub: 'objetivo 7h' },
                ].map((s) => (
                  <div
                    key={s.k}
                    className="rounded-lg border border-border/50 bg-surface/60 px-3 py-2"
                  >
                    <p className="text-[10px] uppercase tracking-widest text-muted">{s.k}</p>
                    <p className="text-sm font-semibold text-foreground">{s.v}</p>
                    <p className="text-[10px] text-muted">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* BLOQUE EMOCIONAL — cierre del hero. Se integra como puente hacia Features. */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="relative max-w-3xl mx-auto mt-24 md:mt-32 text-center"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-accent mb-5">
          Así se siente Nora OS
        </p>
        <p className="text-2xl md:text-3xl font-medium text-foreground leading-snug">
          Abrís Nora y todo está ahí.
          <span className="block text-muted mt-2">
            Sin logins. Sin sincronizar. Sin esperar.
          </span>
          <span className="block mt-4">
            Tu work en progreso, tus hábitos de la semana, tu balance del mes.
          </span>
          <span className="block text-gradient-accent font-semibold mt-3">
            Todo tuyo. Solo tuyo.
          </span>
        </p>
      </motion.div>
    </section>
  )
}
