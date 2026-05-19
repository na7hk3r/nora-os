import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { featureIcons } from '../data/features'
import { useI18n } from '../i18n'

export function Features() {
  const { t } = useI18n()

  return (
    <Section
      id="features"
      eyebrow={t.features.eyebrow}
      title={t.features.title}
      description={t.features.description}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {t.features.cards.map(({ title, description, tag }, idx) => {
          const Icon = featureIcons[idx]

          return (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: (idx % 3) * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-border card-gradient p-5 hover-glow sm:p-6 md:p-7"
            >
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
              />

              <div className="relative">
                {Icon && (
                  <div className="mb-5 inline-flex rounded-xl bg-accent/15 p-3 text-accent ring-1 ring-accent/20 transition-colors group-hover:bg-accent group-hover:text-white">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                )}
                {tag && (
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
                    {tag}
                  </p>
                )}
                <h3 className="mb-3 text-lg font-semibold leading-snug text-foreground text-pretty md:text-xl">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-muted md:text-[1rem]">{description}</p>
              </div>
            </motion.article>
          )
        })}
      </div>
    </Section>
  )
}
