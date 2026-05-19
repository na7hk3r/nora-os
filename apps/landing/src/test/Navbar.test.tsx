import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { Navbar } from '../components/Navbar'
import { I18nProvider } from '../i18n'

vi.mock('../hooks/useLatestRelease', () => ({
  useLatestRelease: () => ({
    release: null,
    loading: false,
    error: null,
  }),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: unknown }) => children,
  motion: {
    nav: ({ children, ...props }: ComponentProps<'nav'>) => <nav {...props}>{children}</nav>,
  },
}))

function renderNavbar() {
  return render(
    <I18nProvider>
      <Navbar />
    </I18nProvider>,
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/')
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
    vi.useRealTimers()
  })

  it('navega a la seccion desde el menu movil y cierra el panel', async () => {
    const target = document.createElement('section')
    target.id = 'features'
    target.getBoundingClientRect = () =>
      ({
        bottom: 420,
        height: 100,
        left: 0,
        right: 100,
        top: 320,
        width: 100,
        x: 0,
        y: 320,
        toJSON: () => ({}),
      }) as DOMRect
    document.body.appendChild(target)

    renderNavbar()

    fireEvent.click(screen.getByRole('button', { name: /open menu|abrir men|abrir menu|abrir men/i }))

    const mobileNav = document.getElementById('mobile-nav')
    expect(mobileNav).not.toBeNull()

    const featuresLink = within(mobileNav as HTMLElement)
      .getAllByRole('link')
      .find((link) => link.getAttribute('href') === '#features')

    expect(featuresLink).toBeDefined()
    fireEvent.click(featuresLink as HTMLElement)

    act(() => {
      vi.advanceTimersByTime(260)
    })

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 248, behavior: 'smooth' })
    expect(window.location.hash).toBe('#features')
    expect(
      screen.getByRole('button', { name: /open menu|close menu|abrir men|cerrar men/i }),
    ).toHaveAttribute('aria-expanded', 'false')
  })

  it('usa controles compactos en mobile', () => {
    renderNavbar()

    expect(screen.getByRole('button', { name: /open menu|abrir men|abrir menu/i }).className).toContain('h-7')
    expect(screen.getByRole('combobox').className).toContain('h-7')
    expect(screen.getByRole('button', { name: /switch to|cambiar a tema|mudar para tema/i }).className).toContain('h-7')
  })
})
