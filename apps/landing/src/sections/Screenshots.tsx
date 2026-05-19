import { motion } from 'framer-motion'
import { Section } from '../components/Section'
import { ScreenshotTabs } from '../components/ScreenshotTabs'
import { useI18n } from '../i18n'

export function Screenshots() {
  const { t } = useI18n()

  return (
    <Section
      id="screenshots"
      eyebrow={t.screenshots.eyebrow}
      title={t.screenshots.title}
      description={t.screenshots.description}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-4xl"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-8 bottom-4 top-16 -z-10 rounded-full bg-accent/20 blur-3xl sm:inset-x-20"
        />
        <ScreenshotTabs
          tabs={t.screenshots.tabs}
          ariaLabel={t.screenshots.tabAria}
          missingLabel={t.screenshots.missing}
        />
      </motion.div>
    </Section>
  )
}
