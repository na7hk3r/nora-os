import { Github, ExternalLink, Cloud, ShieldCheck, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../components/Button'
import { DownloadButton } from '../components/DownloadButton'
import { BrandIcon } from '../components/BrandIcon'
import { NoraLogo } from '../components/NoraLogo'
import { useTypewriter } from '../hooks/useTypewriter'
import { useLatestRelease } from '../hooks/useLatestRelease'
import { useI18n } from '../i18n'

const REPO_URL = 'https://github.com/na7hk3r/nora-os'

const FLOATING_ICONS = [
  { name: 'LaptopShell', x: '-78%', y: '8%', delay: 0.1 },
  { name: 'Magic', x: '78%', y: '12%', delay: 0.18 },
  { name: 'TreasureChest', x: '-90%', y: '70%', delay: 0.25 },
  { name: 'HourGlass', x: '90%', y: '68%', delay: 0.33 },
  { name: 'TomeIdea', x: '-50%', y: '105%', delay: 0.42 },
  { name: 'CrystalBallEye', x: '50%', y: '105%', delay: 0.5 },
] as const

const proofIcons = [Cloud, ShieldCheck, Cpu] as const

export function Hero() {
  const { release } = useLatestRelease()
  const { t } = useI18n()
  const { text, done, ref } = useTypewriter<HTMLDivElement>(t.hero.copilotLine, {
    speed: 28,
    startDelay: 600,
    whenVisible: true,
  })

  return (
    <section className="relative isolate overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pt-28 md:px-8 md:pb-28 md:pt-36">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-0 h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px] animate-glow-pulse" />
        <div className="absolute left-[-10%] top-40 h-[480px] w-[480px] rounded-full bg-blue-500/15 blur-[120px]" />
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

      <div className="relative z-10 mx-auto max-w-5xl text-left sm:text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-6 flex justify-center"
        >
          <NoraLogo variant="mark-original" size={160} glow />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-border bg-surface-light/80 px-3 py-1 text-xs leading-relaxed text-muted backdrop-blur sm:text-sm"
        >
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
          {t.hero.badge}
          {release && (
            <span className="ml-0 inline-flex items-center gap-1 border-border/70 text-xs font-mono text-foreground sm:ml-2 sm:border-l sm:pl-2">
              v{release.version}
            </span>
          )}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-[2.45rem] font-bold leading-tight text-foreground text-balance sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {t.hero.titlePrefix}{' '}
          <span className="text-gradient-accent animate-gradient-shift">{t.hero.titleAccent}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-4 font-mono text-[11px] uppercase tracking-[0.25em] text-accent-light/80 sm:tracking-[0.35em] md:text-xs"
        >
          {t.hero.mantra}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mx-0 mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-muted text-pretty sm:mx-auto md:text-xl"
        >
          {t.hero.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          <DownloadButton size="lg" className="w-full sm:w-auto" />
          <Button
            as="a"
            href={REPO_URL}
            variant="secondary"
            size="lg"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto"
            leftIcon={<Github className="h-5 w-5 shrink-0" aria-hidden="true" />}
            rightIcon={<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />}
          >
            {t.hero.githubCta}
          </Button>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 flex flex-col items-start gap-2 text-xs text-muted sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-5"
        >
          {t.hero.proof.map((item, idx) => {
            const Icon = proofIcons[idx]
            return (
              <li key={item} className="inline-flex items-start gap-1.5 leading-relaxed">
                {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-light" aria-hidden="true" />}
                <span>{item}</span>
              </li>
            )
          })}
        </motion.ul>
      </div>

      <div className="relative z-10 mx-auto mt-14 max-w-4xl md:mt-20">
        <div aria-hidden="true" className="absolute inset-0 hidden pointer-events-none lg:block">
          {FLOATING_ICONS.map((icon, idx) => (
            <motion.div
              key={icon.name}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 + icon.delay, ease: 'backOut' }}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `translate(${icon.x}, ${icon.y})` }}
            >
              <div className="animate-floaty" style={{ animationDelay: `${icon.delay * 2}s` }}>
                <div
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border/60 bg-surface/90 px-3 py-2 shadow-glow-sm backdrop-blur"
                  title={t.hero.floatingLabels[idx]}
                >
                  <BrandIcon name={icon.name} size={36} tile={false} />
                  <span className="text-[10px] uppercase tracking-widest text-muted">
                    {t.hero.floatingLabels[idx]}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-x-4 bottom-0 top-10 -z-10 rounded-full bg-accent/25 blur-3xl sm:inset-x-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: 'easeOut' }}
          className="relative window-frame"
        >
          <div className="flex min-w-0 items-center gap-1.5 border-b border-border/60 bg-surface-light/60 px-4 py-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-400/70" aria-hidden="true" />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400/70" aria-hidden="true" />
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400/70" aria-hidden="true" />
            <NoraLogo variant="mark-original" size={16} className="ml-2 shrink-0 sm:ml-3" />
            <span className="truncate font-mono text-[11px] tracking-wider text-muted">
              {t.hero.mockupTitle}
            </span>
          </div>

          <div className="grid min-h-[300px] grid-cols-1 md:grid-cols-[200px_1fr]">
            <aside className="hidden space-y-3 border-r border-border/60 bg-base/40 p-4 text-[11px] uppercase tracking-widest text-muted md:block">
              <div className="text-xs font-semibold normal-case tracking-normal text-foreground/70">
                {t.hero.mockupTime}
              </div>
              <div className="space-y-2">
                {t.hero.mockupSidebar.map((item, idx) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2 ${idx === 0 ? 'text-accent' : 'text-muted/80'}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-muted/40'}`}
                      aria-hidden="true"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </aside>

            <div ref={ref} className="space-y-5 p-4 text-left sm:p-6 md:p-8" aria-live="polite">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" aria-hidden="true" />
                {t.hero.copilotNow}
              </div>
              <p className="min-h-[3em] font-mono text-sm leading-relaxed text-foreground md:text-[1rem]">
                {text}
                <span
                  aria-hidden="true"
                  className={`ml-[1px] inline-block w-[0.55ch] -mb-[2px] bg-accent ${done ? 'animate-pulse' : ''}`}
                  style={{ height: '1em', verticalAlign: 'middle' }}
                />
              </p>

              <div className="grid grid-cols-1 gap-2 border-t border-border/40 pt-2 sm:grid-cols-2">
                {t.hero.stats.map((stat) => (
                  <div key={stat.k} className="rounded-lg border border-border/50 bg-surface/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted">{stat.k}</p>
                    <p className="text-sm font-semibold text-foreground">{stat.v}</p>
                    <p className="text-[10px] leading-relaxed text-muted">{stat.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7 }}
        className="relative z-10 mx-auto mt-20 max-w-3xl text-left sm:mt-24 sm:text-center md:mt-32"
      >
        <p className="mb-5 text-xs uppercase tracking-[0.25em] text-accent">
          {t.hero.feelingEyebrow}
        </p>
        <div className="space-y-3 text-2xl font-medium leading-snug text-foreground text-pretty md:text-3xl">
          <p>{t.hero.feelingLines[0]}</p>
          <p className="text-muted">{t.hero.feelingLines[1]}</p>
          <p>{t.hero.feelingLines[2]}</p>
          <p className="font-semibold text-gradient-accent">{t.hero.feelingLines[3]}</p>
        </div>
      </motion.div>
    </section>
  )
}
