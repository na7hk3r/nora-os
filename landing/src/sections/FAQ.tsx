import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { Section } from '../components/Section'
import { useI18n } from '../i18n'

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  const { t } = useI18n()

  return (
    <Section
      id="faq"
      eyebrow={t.faq.eyebrow}
      title={t.faq.title}
      description={t.faq.description}
    >
      <div className="mx-auto max-w-3xl space-y-3">
        {t.faq.items.map((it, idx) => {
          const isOpen = openIdx === idx
          const triggerId = `faq-trigger-${idx}`
          const panelId = `faq-panel-${idx}`
          return (
            <motion.div
              key={it.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className={`overflow-hidden rounded-xl border bg-surface/60 backdrop-blur transition-colors ${
                isOpen ? 'border-accent/50 shadow-glow-sm' : 'border-border hover:border-accent/40'
              }`}
            >
              <h3 className="m-0">
                <button
                  id={triggerId}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left font-medium leading-snug text-foreground transition-colors hover:bg-surface-light/40 sm:px-5"
                >
                  <span className="text-pretty">{it.q}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 text-accent transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-5 text-sm leading-relaxed text-muted text-pretty md:text-[1rem] sm:px-5">
                      {it.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </Section>
  )
}
