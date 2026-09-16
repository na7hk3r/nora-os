import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectPicker } from './ProjectPicker'
import type { Project } from '../types'

const projects: Project[] = [
  {
    id: 'p1',
    name: 'Alpha',
    color: '#60a5fa',
    description: '',
    archived: false,
    createdAt: '2026-09-01T10:00:00.000Z',
    archivedAt: null,
  },
  {
    id: 'p2',
    name: 'Beta',
    color: '#34d399',
    description: '',
    archived: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    archivedAt: null,
  },
  {
    id: 'p3',
    name: 'Gamma',
    color: '#fbbf24',
    description: '',
    archived: false,
    createdAt: '2026-09-01T10:00:00.000Z',
    archivedAt: null,
  },
]

// El caller (CardDetailModal) sólo pasa proyectos no archivados.
const activeProjects = projects.filter((p) => !p.archived)

function optionButton(name: RegExp | string): HTMLButtonElement {
  const option = screen.getByRole('option', { name })
  const button = option.querySelector('button')
  if (!button) throw new Error(`No button inside option ${name}`)
  return button
}

function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: 'Proyecto' }))
}

describe('ProjectPicker', () => {
  it('lista los proyectos (no archivados) y la opción de crear', () => {
    render(
      <ProjectPicker value={null} projects={activeProjects} onChange={vi.fn()} onCreate={vi.fn()} />,
    )
    openPicker()

    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Gamma')).toBeInTheDocument()
    expect(screen.queryByText('Beta')).not.toBeInTheDocument()
    expect(screen.getByText(/nuevo proyecto/i)).toBeInTheDocument()
  })

  it('seleccionar un proyecto emite onChange con el proyecto', () => {
    const onChange = vi.fn()
    render(
      <ProjectPicker value={null} projects={activeProjects} onChange={onChange} onCreate={vi.fn()} />,
    )
    openPicker()

    fireEvent.click(optionButton('Alpha'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(activeProjects[0])
  })

  it('alternar el proyecto seleccionado lo deselecciona (onChange null)', () => {
    const onChange = vi.fn()
    render(
      <ProjectPicker value={activeProjects[0]} projects={activeProjects} onChange={onChange} onCreate={vi.fn()} />,
    )
    openPicker()

    fireEvent.click(optionButton('Alpha'))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('"+ Nuevo proyecto" emite onCreate', () => {
    const onCreate = vi.fn()
    render(
      <ProjectPicker value={null} projects={activeProjects} onChange={vi.fn()} onCreate={onCreate} />,
    )
    openPicker()

    fireEvent.click(optionButton(/nuevo proyecto/i))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })
})