import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ToastProvider } from '@core/ui/components/ToastProvider'
import { LibraryWorkspace, type LibraryTab } from './LibraryWorkspace'
import { useWorkStore } from '../store'

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname}</output>
}

function renderLibrary(activeTab: LibraryTab, initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <LibraryWorkspace activeTab={activeTab} />
        <LocationProbe />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('LibraryWorkspace', () => {
  beforeEach(() => {
    useWorkStore.setState({
      boards: [],
      columns: [],
      cards: [],
      notes: [
        {
          id: 'note-1',
          title: 'Nota biblioteca',
          content: 'Contenido de prueba',
          tags: [],
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-10T00:00:00.000Z',
          pinned: false,
        },
      ],
      links: [{ id: 'link-1', title: 'Docs Nora', url: 'https://example.com/docs', category: 'Docs' }],
      focusSessions: [],
      currentFocusSession: null,
    })
  })

  afterEach(() => {
    cleanup()
    useWorkStore.setState({
      boards: [],
      columns: [],
      cards: [],
      notes: [],
      links: [],
      focusSessions: [],
      currentFocusSession: null,
    })
  })

  it('opens the notes tab for the notes route', () => {
    renderLibrary('notes', '/notes')

    expect(screen.getByRole('tab', { name: /notas/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /enlaces/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('Nota biblioteca')).toBeInTheDocument()
  })

  it('opens the links tab for the links route', () => {
    renderLibrary('links', '/links')

    expect(screen.getByRole('tab', { name: /notas/i })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /enlaces/i })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Docs Nora')).toBeInTheDocument()
  })

  it('navigates between preserved library routes from the tabs', async () => {
    renderLibrary('notes', '/notes')

    fireEvent.click(screen.getByRole('tab', { name: /enlaces/i }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/links'))
  })
})
