// Navbar nuevo: sticky transparente que vira a backdrop-blur al hacer scroll, mobile menu animado.
import { useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import { ChevronDown, Github, Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from './ThemeToggle'
import { NoraLogo } from './NoraLogo'
import { DownloadButton } from './DownloadButton'
import { useLatestRelease } from '../hooks/useLatestRelease'
import { languageOptions, useI18n } from '../i18n'

const REPO_URL = 'https://github.com/na7hk3r/nora-os'
const NAVBAR_SCROLL_OFFSET = 72
const MOBILE_MENU_EXIT_MS = 240

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [pendingHash, setPendingHash] = useState<string | null>(null)
  const { release } = useLatestRelease()
  const { language, setLanguage, t } = useI18n()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cerrar el menú móvil cuando se cambia de tamaño a desktop.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const scrollToHash = (href: string) => {
    const target = document.querySelector<HTMLElement>(href)
    if (!target) return

    const top = Math.max(
      target.getBoundingClientRect().top + window.scrollY - NAVBAR_SCROLL_OFFSET,
      0,
    )

    window.history.replaceState(null, '', href)
    window.scrollTo({ top, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!pendingHash || open) return

    const timeoutId = window.setTimeout(() => {
      scrollToHash(pendingHash)
      setPendingHash(null)
    }, MOBILE_MENU_EXIT_MS)

    return () => window.clearTimeout(timeoutId)
  }, [open, pendingHash])

  const navigateToHash = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith('#')) {
      setOpen(false)
      return
    }

    event.preventDefault()

    if (open) {
      setPendingHash(href)
      setOpen(false)
      return
    }

    scrollToHash(href)
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-md bg-base/75 border-b border-border/70 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <a
          href="#main"
          onClick={navigateToHash('#main')}
          className="flex items-center gap-2 group"
          aria-label={t.nav.homeAria}
        >
          {/* <NoraLogo variant="mark-original" size={36} className="transition-transform group-hover:scale-105" /> */}
          <NoraLogo variant="wordmark" size={20} />
        </a>

        <nav
          aria-label="Principal"
          className="hidden lg:flex items-center gap-4 text-[13px] text-muted"
        >
          {t.nav.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={navigateToHash(l.href)}
              className="max-w-[8.5rem] text-center leading-snug hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {release && (
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.nav.releaseAria.replace('{version}', release.version)}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-accent/30 text-xs font-mono text-accent hover:bg-accent/20 transition-colors"
            >
              v{release.version}
            </a>
          )}
          <label className="relative inline-flex items-center">
            <span className="sr-only">{t.language.aria}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as typeof language)}
              aria-label={t.language.label}
              className="h-7 w-12 appearance-none rounded-md border border-border/70 bg-surface/60 pl-2 pr-4 text-[10px] font-semibold text-muted transition-colors hover:bg-surface-light hover:text-foreground focus:border-border/70 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-8 sm:w-14 sm:pl-2.5 sm:pr-5 sm:text-[11px]"
            >
              {languageOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.shortLabel}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1 h-2.5 w-2.5 text-muted sm:right-1.5 sm:h-3 sm:w-3" aria-hidden="true" />
          </label>
          <ThemeToggle className="h-7 w-7 sm:h-8 sm:w-8" />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.nav.repoAria}
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface/60 text-muted transition-colors hover:bg-surface-light hover:text-foreground"
          >
            <Github className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          <div className="hidden sm:inline-flex">
            <DownloadButton size="sm" compact className="h-8 rounded-md px-2.5 py-0 text-xs shadow-none shadow-transparent hover:shadow-none" />
          </div>
          <button
            type="button"
            aria-label={open ? t.nav.closeMenu : t.nav.openMenu}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface/60 text-foreground lg:hidden sm:h-8 sm:w-8"
          >
            {open ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label={t.nav.mobileLabel}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="lg:hidden overflow-hidden border-t border-border/60 bg-base/90 backdrop-blur-md"
          >
            <ul className="flex flex-col gap-1 px-4 py-3 text-[13px] sm:text-sm">
              {t.nav.links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={navigateToHash(l.href)}
                    className="block rounded-md px-3 py-2 text-foreground hover:bg-surface-light"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="mt-2 grid grid-cols-2 gap-2">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface-light px-3 text-sm text-foreground"
                >
                  <Github className="w-4 h-4" aria-hidden="true" /> {t.common.github}
                </a>
                <div className="flex-1" onClick={() => setOpen(false)}>
                  <DownloadButton
                    size="sm"
                    compact
                    className="h-9 w-full rounded-md px-3 py-0 text-sm shadow-none shadow-transparent hover:shadow-none"
                  />
                </div>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
