// Navbar nuevo: sticky transparente que vira a backdrop-blur al hacer scroll, mobile menu animado.
import { useEffect, useState } from 'react'
import { Github, Menu, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeToggle } from './ThemeToggle'
import { NoraLogo } from './NoraLogo'
import { DownloadButton } from './DownloadButton'
import { useLatestRelease } from '../hooks/useLatestRelease'

const REPO_URL = 'https://github.com/na7hk3r/nora-os'

interface NavLink {
  href: string
  label: string
}

const links: NavLink[] = [
  { href: '#features', label: 'Para vos' },
  { href: '#how-it-works', label: 'Cómo funciona' },
  { href: '#plugins', label: 'Plugins' },
  { href: '#copilot-demo', label: 'Copiloto' },
  { href: '#faq', label: 'FAQ' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { release } = useLatestRelease()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cerrar el menú móvil cuando se cambia de tamaño a desktop.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-md bg-base/75 border-b border-border/70 shadow-sm'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <a
          href="#"
          className="flex items-center gap-2 group"
          aria-label="Nora OS — inicio"
        >
          <NoraLogo variant="mark-original" size={36} className="transition-transform group-hover:scale-105" />
          <NoraLogo variant="wordmark" size={20} />
        </a>

        <nav
          aria-label="Principal"
          className="hidden md:flex items-center gap-7 text-sm text-muted"
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {release && (
            <a
              href={release.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Versión ${release.version}`}
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md bg-accent/10 border border-accent/30 text-xs font-mono text-accent hover:bg-accent/20 transition-colors"
            >
              v{release.version}
            </a>
          )}
          <ThemeToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Repositorio en GitHub"
            className="hidden sm:inline-flex p-2 rounded-lg bg-surface-light hover:bg-surface-lighter border border-border transition-colors text-foreground"
          >
            <Github className="w-4 h-4" aria-hidden="true" />
          </a>
          <div className="hidden sm:inline-flex">
            <DownloadButton size="sm" />
          </div>
          <button
            type="button"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg bg-surface-light border border-border text-foreground"
          >
            {open ? <X className="w-4 h-4" aria-hidden="true" /> : <Menu className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Menú móvil"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="md:hidden overflow-hidden border-t border-border/60 bg-base/90 backdrop-blur-md"
          >
            <ul className="px-4 py-4 flex flex-col gap-1 text-sm">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2.5 rounded-md text-foreground hover:bg-surface-light"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="mt-2 flex gap-2">
                <a
                  href={REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-md bg-surface-light border border-border text-foreground"
                >
                  <Github className="w-4 h-4" aria-hidden="true" /> GitHub
                </a>
                <div className="flex-1" onClick={() => setOpen(false)}>
                  <DownloadButton size="md" />
                </div>
              </li>
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
