import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from '../sections/Hero'

describe('Hero', () => {
  it('renderiza el título principal y subtítulo del copiloto', () => {
    render(<Hero />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent(/copiloto que conoce/i)
    expect(h1).toHaveTextContent(/toda tu vida/i)
    expect(
      screen.getByText(/Nora OS conecta tu trabajo, salud, hábitos, finanzas y Pulso Nora/i),
    ).toBeInTheDocument()
  })

  it('muestra el badge de copiloto local y open source', () => {
    render(<Hero />)
    expect(
      screen.getByText(/Copiloto local · Sin nube · Open source/i),
    ).toBeInTheDocument()
  })

  it('muestra el CTA de descarga y el enlace a GitHub', () => {
    render(<Hero />)
    // Botón de descarga (puede decir "Cargando…" hasta resolver fetch)
    expect(
      screen.getByRole('link', { name: /descargar|cargando/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ver en github/i })).toHaveAttribute(
      'href',
      'https://github.com/na7hk3r/nora-os',
    )
  })
})
