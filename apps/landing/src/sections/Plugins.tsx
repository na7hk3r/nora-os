import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { BrandIcon } from '../components/BrandIcon'
import { plugins } from '../data/plugins'
import { useI18n } from '../i18n'

const REPO_URL = 'https://github.com/na7hk3r/nora-os'

export function Plugins() {
  const { t } = useI18n()

  return (
    <Section
      id="plugins"
      eyebrow={t.plugins.eyebrow}
      title={t.plugins.title}
      description={t.plugins.description}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {plugins.map(({ id, icon: Icon, accent, brandArt }, idx) => {
          const item = t.plugins.cards[id]
          if (!item) return null

          return (
            <motion.article
              key={id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: (idx % 3) * 0.08 }}
              className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-border card-gradient p-5 hover-glow sm:p-6"
            >
              <div
                aria-hidden="true"
                className={`absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-br ${accent} pointer-events-none opacity-70 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
              />
              <BrandIcon
                name={brandArt}
                size={120}
                tile={false}
                className="pointer-events-none absolute -bottom-3 -right-3 opacity-25 transition-all duration-500 group-hover:rotate-3 group-hover:scale-110 group-hover:opacity-75"
              />
              <div className="relative">
                <div className="mb-3 flex items-start gap-3">
                  <span className="inline-flex shrink-0 rounded-lg bg-accent/15 p-2.5 text-accent ring-1 ring-accent/20">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold leading-snug text-foreground text-pretty">
                      {item.name}
                    </h3>
                    <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted">
                      {item.domainLabel}
                    </p>
                  </div>
                </div>
                <p className="mt-4 max-w-none text-sm leading-relaxed text-muted text-pretty sm:max-w-[88%]">
                  {item.description}
                </p>
              </div>
            </motion.article>
          )
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-10 rounded-2xl border border-dashed border-border bg-surface/30 p-5 text-left sm:p-6 sm:text-center"
      >
        <p className="text-sm leading-relaxed text-muted">
          {t.plugins.roadmapPrefix}{' '}
          {t.plugins.roadmapItems.map((item, idx) => (
            <span key={item}>
              <span className="font-medium text-foreground">{item}</span>
              {idx < t.plugins.roadmapItems.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
        <a
          href={`${REPO_URL}/blob/main/docs/PLUGIN_IDEAS.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          {t.plugins.roadmapLink}
        </a>
      </motion.div>
    </Section>
  )
}
