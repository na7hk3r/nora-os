import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkManager } from './LinkManager'
import { useWorkStore } from '../store'

describe('LinkManager', () => {
  beforeEach(() => {
    vi.spyOn(window.storage, 'execute').mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
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

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
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

  it('normalizes URLs and uses a fallback title when adding a link', async () => {
    render(<LinkManager />)

    fireEvent.change(screen.getByLabelText('URL del enlace'), { target: { value: 'example.com/docs' } })
    fireEvent.change(screen.getByLabelText('Categoria del enlace'), { target: { value: 'Docs' } })
    fireEvent.click(screen.getByRole('button', { name: /agregar enlace/i }))

    await waitFor(() => expect(screen.getAllByText('example.com/docs').length).toBeGreaterThan(0))
    expect(window.storage.execute).toHaveBeenCalledWith(
      'INSERT INTO work_links (id, title, url, category) VALUES (?, ?, ?, ?)',
      [expect.any(String), 'example.com/docs', 'https://example.com/docs', 'Docs'],
    )
  })

  it('filters links by category chips and search text', () => {
    useWorkStore.setState({
      links: [
        { id: 'link-1', title: 'Guia tecnica', url: 'https://docs.example.com', category: 'Docs' },
        { id: 'link-2', title: 'Demo video', url: 'https://video.example.com', category: 'Videos' },
      ],
    })

    render(<LinkManager />)

    fireEvent.click(screen.getByRole('button', { name: /docs/i }))
    expect(screen.getByText('Guia tecnica')).toBeInTheDocument()
    expect(screen.queryByText('Demo video')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Buscar enlaces'), { target: { value: 'video' } })
    expect(screen.queryByText('Guia tecnica')).not.toBeInTheDocument()
    expect(screen.queryByText('Demo video')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /todas/i }))
    expect(screen.getByText('Demo video')).toBeInTheDocument()
  })
})
