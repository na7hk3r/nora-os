import { NoraLogo } from '../components/NoraLogo'
import { WebButton } from '../components/WebButton'
import { useI18n } from '../i18n'
import { SITE_URL, REPO_URL } from '../constants'

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="relative mt-20 border-t border-border bg-surface/30 backdrop-blur">
      <div className="mx-auto max-w-4xl px-4 pb-10 pt-14 text-center sm:px-6 md:px-8 md:pt-16">
        <div className="mb-8 flex justify-center">
          <NoraLogo variant="full" size={125} glow />
        </div>
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <WebButton source="footer" className="h-10 rounded-md px-4 py-0 text-sm" />
          <a
            href={`${SITE_URL}/#download`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-light px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-lighter"
          >
            {t.download.download}
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface-light px-4 text-sm font-medium text-foreground transition-colors hover:bg-surface-lighter"
          >
            {t.common.github}
          </a>
        </div>
        <p className="mx-auto max-w-2xl font-display text-2xl font-medium leading-snug text-foreground text-pretty md:text-3xl">
          {t.footer.line1}{' '}
          <span className="text-gradient-accent">{t.footer.accent}</span>{' '}
          {t.footer.line2}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted text-pretty">{t.footer.body}</p>
        <p className="mt-10 text-xs text-muted">
          {t.footer.by}{' '}
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
