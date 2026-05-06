import { Puzzle, Code2, GitBranch, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Section } from '../components/Section'
import { Docs } from './Docs'
import { useI18n } from '../i18n'

const REPO_URL = 'https://github.com/na7hk3r/nora-os'

const cardMeta = [
  {
    href: `${REPO_URL}/blob/main/docs/PLUGIN_BASE_STRUCTURE.md`,
    icon: Puzzle,
  },
  {
    href: `${REPO_URL}/blob/main/docs/PLUGIN_API.md`,
    icon: Code2,
  },
  {
    href: REPO_URL,
    icon: GitBranch,
  },
] as const

export function ForDevs() {
  const [docsOpen, setDocsOpen] = useState(false)
  const { t } = useI18n()

  return (
    <Section
      id="devs"
      eyebrow={t.devs.eyebrow}
      title={t.devs.title}
      description={t.devs.description}
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {t.devs.cards.map(({ title, description, linkText }, idx) => {
          const meta = cardMeta[idx]
          const Icon = meta.icon

          return (
            <article
              key={title}
              className="flex flex-col rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur transition-all duration-300 hover:border-accent/50 sm:p-6"
            >
              <div className="mb-4 inline-flex w-fit rounded-xl bg-accent/10 p-3 text-accent">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mb-2 text-lg font-semibold leading-snug text-foreground text-pretty">{title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-muted text-pretty">{description}</p>
              <a
                href={meta.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1 break-all font-mono text-sm leading-relaxed text-accent hover:underline"
              >
                → {linkText}
              </a>
            </article>
          )
        })}
      </div>

      <div className="mt-12 text-left sm:text-center">
        <button
          type="button"
          onClick={() => setDocsOpen((v) => !v)}
          aria-expanded={docsOpen}
          aria-controls="devs-docs-viewer"
          className="inline-flex max-w-full items-center gap-2 rounded-xl border border-border bg-surface-light px-5 py-3 text-left font-medium leading-snug text-foreground transition-colors hover:bg-surface-lighter sm:text-center"
        >
          {docsOpen ? t.devs.closeDocs : t.devs.openDocs}
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${docsOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {docsOpen && (
        <div id="devs-docs-viewer" className="mt-8 animate-fade-in">
          <Docs />
        </div>
      )}
    </Section>
  )
}
