import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NoteEditor } from './NoteEditor'
import { ToastProvider } from '@core/ui/components/ToastProvider'
import { useWorkStore } from '../store'
import type { Note } from '../types'

const markdown = [
  '# Titulo markdown',
  '',
  'Texto **importante** con [link](https://example.com).',
  '',
  '- item uno',
  '- item dos',
  '',
  '<script>alert("x")</script>',
].join('\n')

const note: Note = {
  id: 'note-1',
  title: 'Markdown note',
  content: markdown,
  tags: [],
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
  pinned: false,
}

async function renderSelectedNote() {
  const view = render(
    <ToastProvider>
      <NoteEditor />
    </ToastProvider>,
  )
  await act(async () => {
    fireEvent.click(screen.getByText('Markdown note'))
    await Promise.resolve()
  })
  await waitFor(() => expect(screen.getByPlaceholderText('Escribí la nota…')).toBeInTheDocument())
  return view
}

describe('NoteEditor markdown preview', () => {
  beforeEach(() => {
    useWorkStore.setState({
      boards: [],
      columns: [],
      cards: [],
      notes: [note],
      links: [],
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

  it('renders the raw markdown in edit mode', async () => {
    await renderSelectedNote()

    expect(screen.getByPlaceholderText('Escribí la nota…')).toHaveValue(markdown)
  })

  it('renders formatted GFM markdown in preview mode', async () => {
    await renderSelectedNote()

    fireEvent.click(screen.getByRole('button', { name: /vista/i }))

    expect(await screen.findByRole('heading', { name: 'Titulo markdown', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('importante')).toBeInTheDocument()
    expect(screen.getByText('item uno')).toBeInTheDocument()
  })

  it('does not activate raw HTML as DOM elements in preview mode', async () => {
    const { container } = await renderSelectedNote()

    fireEvent.click(screen.getByRole('button', { name: /vista/i }))

    await waitFor(() => expect(screen.queryByPlaceholderText('Escribí la nota…')).not.toBeInTheDocument())
    expect(container.querySelector('script')).toBeNull()
  })

  it('returns to edit mode with the original markdown intact', async () => {
    await renderSelectedNote()

    fireEvent.click(screen.getByRole('button', { name: /vista/i }))
    expect(await screen.findByRole('heading', { name: 'Titulo markdown', level: 1 })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(screen.getByPlaceholderText('Escribí la nota…')).toHaveValue(markdown)
  })
})
