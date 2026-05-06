import { motion } from 'framer-motion'
import { Download as DownloadIcon, ToggleRight, Sparkles } from 'lucide-react'
import { Section } from '../components/Section'
import { useI18n } from '../i18n'

const stepIcons = [DownloadIcon, ToggleRight, Sparkles] as const

export function HowItWorks() {
  const { t } = useI18n()

  return (
    <Section
      id="how-it-works"
      eyebrow={t.how.eyebrow}
      title={t.how.title}
      description={t.how.description}
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="absolute left-[16.66%] right-[16.66%] top-12 hidden h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent md:block"
        />

        <ol className="relative grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
          {t.how.steps.map(({ number, title, description }, idx) => {
            const Icon = stepIcons[idx]

            return (
              <motion.li
                key={number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="relative flex flex-col items-center px-2 text-center"
              >
                <div className="relative mb-5 sm:mb-6">
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 -z-10 animate-glow-pulse rounded-full bg-accent/20 blur-2xl"
                  />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface shadow-glow-sm sm:h-24 sm:w-24">
                    {Icon && <Icon className="h-7 w-7 text-accent sm:h-8 sm:w-8" aria-hidden="true" />}
                    <span
                      aria-hidden="true"
                      className="absolute -right-2 -top-2 rounded-full bg-accent px-2 py-0.5 font-mono text-xs font-bold text-white shadow"
                    >
                      {number}
                    </span>
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-bold leading-snug text-foreground text-pretty">{title}</h3>
                <p className="max-w-sm text-[1rem] leading-relaxed text-muted text-pretty sm:max-w-xs">
                  {description}
                </p>
              </motion.li>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}
