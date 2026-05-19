import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { ScreenshotTabs } from '../components/ScreenshotTabs'
import type { ScreenshotTab } from '../components/ScreenshotTabs'

const tabs: ScreenshotTab[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    src: 'screenshots/screenshot-dashboard.png',
    alt: 'Dashboard screenshot',
    caption: 'Dashboard caption',
  },
  {
    id: 'themes',
    label: 'Temas',
    src: 'screenshots/screenshot-temas.png',
    compareSrc: 'screenshots/screenshot-temas-light.png',
    alt: 'Tema oscuro',
    compareAlt: 'Tema claro',
    caption: 'Themes caption',
  },
]

function mockRect(element: HTMLElement, width = 200) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      bottom: 100,
      height: 100,
      left: 0,
      right: width,
      top: 0,
      width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })
}

describe('ScreenshotTabs', () => {
  it('renderiza las rutas reales de las capturas simples', () => {
    render(<ScreenshotTabs tabs={tabs} />)

    expect(screen.getByAltText('Dashboard screenshot')).toHaveAttribute(
      'src',
      expect.stringContaining('screenshots/screenshot-dashboard.png'),
    )
  })

  it('renderiza dos imagenes en el tab de temas', () => {
    render(<ScreenshotTabs tabs={tabs} />)

    fireEvent.click(screen.getByRole('tab', { name: 'Temas' }))

    expect(screen.getByAltText('Tema oscuro')).toHaveAttribute(
      'src',
      expect.stringContaining('screenshots/screenshot-temas.png'),
    )
    expect(screen.getByAltText('Tema claro')).toHaveAttribute(
      'src',
      expect.stringContaining('screenshots/screenshot-temas-light.png'),
    )
  })

  it('actualiza el comparador al mover el puntero', () => {
    render(<ScreenshotTabs tabs={tabs} defaultTabId="themes" />)

    const slider = screen.getByRole('slider', { name: /temas/i })
    mockRect(slider)

    act(() => {
      slider.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 160 }))
    })

    expect(slider).toHaveAttribute('aria-valuenow', '80')
  })

  it('muestra el placeholder cuando falla una imagen', () => {
    render(<ScreenshotTabs tabs={tabs} missingLabel="Captura faltante" />)

    const image = screen.getByAltText('Dashboard screenshot')
    fireEvent.error(image)

    expect(image).toHaveStyle({ display: 'none' })
    expect(screen.getByText('Captura faltante').parentElement).toHaveStyle({
      display: 'flex',
    })
  })
})
