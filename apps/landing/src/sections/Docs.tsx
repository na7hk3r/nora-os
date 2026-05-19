import { useEffect, useMemo, useState } from 'react'
import { marked } from 'marked'
import { FileText, ExternalLink, Search } from 'lucide-react'
import { Section } from '../components/Section'
import { useI18n } from '../i18n'

const docModules = import.meta.glob<string>('../../../docs/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

interface DocEntry {
  slug: string
  label: string
  source: string
  filename: string
}

const REPO_DOCS_URL = 'https://github.com/na7hk3r/nora-os/blob/main/docs'

function prettifySlug(slug: string): string {
  return slug
    .split('_')
    .map((part) => {
      if (part.length <= 3 && part === part.toUpperCase()) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

const docs: DocEntry[] = Object.entries(docModules)
  .map(([path, source]) => {
    const filename = path.split('/').pop() ?? path
    const slug = filename.replace(/\.md$/i, '')
    return {
      slug,
      label: prettifySlug(slug),
      source,
      filename,
    }
  })
  .sort((a, b) => a.label.localeCompare(b.label, 'es'))

marked.setOptions({
  gfm: true,
  breaks: false,
})

function getInitialSlug(): string {
  if (typeof window === 'undefined') return docs[0]?.slug ?? ''
  const hash = window.location.hash
  const match = hash.match(/#docs\/([\w.-]+)/i)
  if (match) {
    const wanted = match[1].replace(/\.md$/i, '')
    const found = docs.find((d) => d.slug.toLowerCase() === wanted.toLowerCase())
    if (found) return found.slug
  }
  return docs[0]?.slug ?? ''
}

export function Docs() {
  const [activeSlug, setActiveSlug] = useState<string>(getInitialSlug)
  const [query, setQuery] = useState('')
  const { t } = useI18n()

  useEffect(() => {
    function onHashChange() {
      const next = getInitialSlug()
      if (next) setActiveSlug(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const active = useMemo(
    () => docs.find((d) => d.slug === activeSlug) ?? docs[0],
    [activeSlug],
  )

  const html = useMemo(() => {
    if (!active) return ''
    try {
      return marked.parse(active.source) as string
    } catch (err) {
      console.error('Error rendering markdown', err)
      return `<pre>${active.source}</pre>`
    }
  }, [active])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.slug.toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q),
    )
  }, [query])

  if (docs.length === 0) {
    return (
      <Section id="docs" eyebrow={t.docs.eyebrow} title={t.docs.emptyTitle}>
        <p className="text-center text-muted">{t.docs.emptyMessage}</p>
      </Section>
    )
  }

  return (
    <Section
      id="docs"
      eyebrow={t.docs.eyebrow}
      title={t.docs.title}
      description={t.docs.description}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-surface/60 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <label className="relative mb-4 block">
            <span className="sr-only">{t.docs.searchLabel}</span>
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder={t.docs.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-base/60 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </label>
          <nav aria-label={t.docs.navLabel}>
            <ul className="space-y-1">
              {filtered.map((d) => {
                const isActive = d.slug === active?.slug
                return (
                  <li key={d.slug}>
                    <a
                      href={`#docs/${d.slug}`}
                      onClick={() => setActiveSlug(d.slug)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? 'border-accent/40 bg-accent/15 text-foreground'
                          : 'border-transparent text-muted hover:bg-surface-light hover:text-foreground'
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                      <span className="truncate">{d.label}</span>
                    </a>
                  </li>
                )
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted">{t.docs.noResults}</li>
              )}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0 rounded-2xl border border-border bg-surface/60 p-4 sm:p-6 md:p-10 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {active && (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <h3 className="text-2xl font-bold leading-tight text-foreground text-pretty">
                  {active.label}
                </h3>
                <a
                  href={`${REPO_DOCS_URL}/${active.filename}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs leading-relaxed text-muted transition-colors hover:text-accent"
                >
                  {t.docs.github}
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
              <div
                className="markdown-body"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </>
          )}
        </article>
      </div>
    </Section>
  )
}
