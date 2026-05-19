import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '../types'
import { useWorkStore } from '../store'
import { CardDetailModal } from './CardDetailModal'

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

describe('CardDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useWorkStore.setState({
      cards: [baseCard],
      currentFocusSession: null,
      focusSessions: [],
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
})
