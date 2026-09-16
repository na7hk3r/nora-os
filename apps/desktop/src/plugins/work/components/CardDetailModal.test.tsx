import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card, Project } from '../types'
import { useWorkStore } from '../store'
import { CardDetailModal } from './CardDetailModal'
import * as projectsService from '../projects'

const baseCard: Card = {
  id: 'card_1',
  columnId: 'todo',
  title: 'Tarea original',
  description: '',
  content: '',
  labels: [],
  dueDate: null,
  position: 0,
  priority: null,
  estimateMinutes: null,
  checklist: [],
}

const project: Project = {
  id: 'proj_1',
  name: 'Alpha',
  color: '#60a5fa',
  description: '',
  archived: false,
  createdAt: '2026-09-01T10:00:00.000Z',
  archivedAt: null,
}

function optionButton(name: RegExp | string): HTMLButtonElement {
  const option = screen.getByRole('option', { name })
  const button = option.querySelector('button')
  if (!button) throw new Error(`No button inside option ${name}`)
  return button
}

describe('CardDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useWorkStore.setState({
      cards: [baseCard],
      currentFocusSession: null,
      focusSessions: [],
      projects: [],
      projectLinks: [],
      selectedProjectId: null,
      notes: [],
    })
  })

  it('saves the card when Enter is pressed in an edit input', async () => {
    const onClose = vi.fn()
    const executeSpy = vi.spyOn(window.storage, 'execute').mockResolvedValue({
      changes: 1,
      lastInsertRowid: 0,
    })

    render(<CardDetailModal card={baseCard} onClose={onClose} />)

    const titleInput = screen.getByDisplayValue('Tarea original')
    fireEvent.change(titleInput, { target: { value: 'Tarea editada' } })
    fireEvent.keyDown(titleInput, { key: 'Enter' })

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(useWorkStore.getState().cards[0]?.title).toBe('Tarea editada')
    expect(executeSpy).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE work_cards'),
      expect.arrayContaining(['Tarea editada']),
    )
  })

  it('keeps Enter reserved for adding checklist items in the checklist input', async () => {
    const onClose = vi.fn()
    const executeSpy = vi.spyOn(window.storage, 'execute')

    render(<CardDetailModal card={baseCard} onClose={onClose} />)

    const checklistInput = screen.getByPlaceholderText(/agregar/i)
    fireEvent.change(checklistInput, { target: { value: 'Primer paso' } })
    fireEvent.keyDown(checklistInput, { key: 'Enter' })

    expect(onClose).not.toHaveBeenCalled()
    expect(executeSpy).not.toHaveBeenCalled()
    expect(await screen.findByText('Primer paso')).toBeInTheDocument()
  })

  it('desvincula la tarjeta de su proyecto al eliminarla', async () => {
    const onClose = vi.fn()
    const unlinkSpy = vi.spyOn(projectsService, 'unlinkEntityLinks').mockResolvedValue()

    render(<CardDetailModal card={baseCard} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /eliminar tarea/i }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /confirmar eliminación/i })).toBeInTheDocument(),
    )
    fireEvent.click(screen.getByRole('button', { name: /confirmar eliminación/i }))

    await waitFor(() => expect(unlinkSpy).toHaveBeenCalledWith('work_card', 'card_1'))
  })

  it('vincula la tarjeta al proyecto elegido en el picker', async () => {
    const onClose = vi.fn()
    const linkSpy = vi.spyOn(projectsService, 'linkEntity').mockResolvedValue()
    useWorkStore.setState({ projects: [project] })

    render(<CardDetailModal card={baseCard} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: 'Proyecto' }))
    fireEvent.click(optionButton('Alpha'))

    await waitFor(() => expect(linkSpy).toHaveBeenCalledWith('proj_1', 'work_card', 'card_1'))
  })
})
