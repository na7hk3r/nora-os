import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

const taskMarkdown = [
  '# Tareas',
  '',
  '- [ ] pendiente',
  '- [x] hecha',
  '+ [X] mayuscula',
].join('\n')

const taskNote: Note = {
  id: 'note-tasks',
  title: 'Task note',
  content: taskMarkdown,
  tags: [],
  createdAt: '2026-05-10T00:00:00.000Z',
  updatedAt: '2026-05-10T00:00:00.000Z',
  pinned: false,
}

const storageExecute = vi.fn(async () => ({ changes: 1, lastInsertRowid: 0 }))

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

function makeMarkdownFile(content: string, name: string): File {
  const file = new File([content], name, { type: 'text/markdown' })
  Object.defineProperty(file, 'text', { value: async () => content })
  return file
}

function firePointerClientX(target: Window | Node, type: string, clientX: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'clientX', { value: clientX })
  fireEvent(target, event)
}

describe('NoteEditor markdown preview', () => {
  beforeEach(() => {
    storageExecute.mockClear()
    window.storage.execute = storageExecute
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
    window.localStorage.removeItem('work:noteEditorSidebarWidth:v1')
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

  it('uses the same document column for editing and preview', async () => {
    await renderSelectedNote()

    expect(screen.getByTestId('note-editor-title-shell')).toHaveClass('workspace-document-column')
    expect(screen.getByTestId('note-editor-textarea')).toHaveClass('workspace-document-column')

    fireEvent.click(screen.getByRole('button', { name: /vista/i }))

    expect(await screen.findByTestId('note-editor-preview')).toHaveClass('workspace-document-column')
  })

  it('keeps the note list as a resizable left column', async () => {
    render(
      <ToastProvider>
        <NoteEditor />
      </ToastProvider>,
    )

    const sidebar = screen.getByTestId('note-editor-sidebar')
    const resizer = screen.getByTestId('note-editor-sidebar-resizer')

    expect(sidebar).toHaveStyle({ width: '288px' })
    expect(resizer).toHaveAttribute('role', 'separator')

    firePointerClientX(resizer, 'pointerdown', 100)
    firePointerClientX(window, 'pointermove', 180)
    firePointerClientX(window, 'pointerup', 180)

    await waitFor(() => expect(sidebar).toHaveStyle({ width: '368px' }))
    await waitFor(() => expect(window.localStorage.getItem('work:noteEditorSidebarWidth:v1')).toBe('368'))
  })

  it('toggles an unchecked markdown task from preview mode and persists the content', async () => {
    useWorkStore.setState({ notes: [taskNote] })

    render(
      <ToastProvider>
        <NoteEditor />
      </ToastProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Task note'))
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: /vista/i }))

    const checkbox = await screen.findByRole('checkbox', { name: /marcar tarea como hecha/i })
    expect(screen.getByText('pendiente').closest('li')).not.toHaveClass('line-through')
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(useWorkStore.getState().notes[0].content).toContain('- [x] pendiente')
    })
    expect(screen.getByText('pendiente').closest('li')).toHaveClass('line-through')
    expect(screen.getByTestId('note-editor-preview')).toBeInTheDocument()
    expect(storageExecute).toHaveBeenCalledWith(
      'UPDATE work_notes SET content = ?, updated_at = ? WHERE id = ?',
      [expect.stringContaining('- [x] pendiente'), expect.any(String), 'note-tasks'],
    )

    fireEvent.click(screen.getByRole('button', { name: /editar/i }))
    expect((screen.getByTestId('note-editor-textarea') as HTMLTextAreaElement).value).toContain('- [x] pendiente')
  })

  it('toggles a checked markdown task from preview mode', async () => {
    useWorkStore.setState({ notes: [taskNote] })

    render(
      <ToastProvider>
        <NoteEditor />
      </ToastProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Task note'))
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: /vista/i }))

    const checkedTasks = await screen.findAllByRole('checkbox', { name: /marcar tarea como pendiente/i })
    expect(screen.getByText('hecha').closest('li')).toHaveClass('line-through')
    fireEvent.click(checkedTasks[0])

    await waitFor(() => {
      expect(useWorkStore.getState().notes[0].content).toContain('- [ ] hecha')
    })
    expect(screen.getByText('hecha').closest('li')).not.toHaveClass('line-through')
    expect(storageExecute).toHaveBeenCalledWith(
      'UPDATE work_notes SET content = ?, updated_at = ? WHERE id = ?',
      [expect.stringContaining('- [ ] hecha'), expect.any(String), 'note-tasks'],
    )
  })

  it('toggles the exact task line selected in preview mode', async () => {
    useWorkStore.setState({ notes: [taskNote] })

    render(
      <ToastProvider>
        <NoteEditor />
      </ToastProvider>,
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Task note'))
      await Promise.resolve()
    })
    fireEvent.click(screen.getByRole('button', { name: /vista/i }))

    const checkedTasks = await screen.findAllByRole('checkbox', { name: /marcar tarea como pendiente/i })
    fireEvent.click(checkedTasks[1])

    await waitFor(() => {
      const content = useWorkStore.getState().notes[0].content
      expect(content).toContain('- [x] hecha')
      expect(content).toContain('+ [ ] mayuscula')
    })
    expect(storageExecute).toHaveBeenCalledWith(
      'UPDATE work_notes SET content = ?, updated_at = ? WHERE id = ?',
      [expect.stringContaining('+ [ ] mayuscula'), expect.any(String), 'note-tasks'],
    )
  })

  it('imports markdown files as new notes and selects the first imported note', async () => {
    useWorkStore.setState({ notes: [] })

    render(
      <ToastProvider>
        <NoteEditor />
      </ToastProvider>,
    )

    const firstContent = ['# Imported Heading', '', 'Body text'].join('\n')
    const secondContent = ['Body without heading', '', '- [ ] imported task'].join('\n')
    const files = [
      makeMarkdownFile(firstContent, 'vault-note.md'),
      makeMarkdownFile(secondContent, 'scratch.markdown'),
    ]

    await act(async () => {
      fireEvent.change(screen.getByTestId('note-editor-import-input'), { target: { files } })
      await Promise.resolve()
    })

    await waitFor(() => expect(screen.getByText('Imported Heading')).toBeInTheDocument())
    expect(screen.getByText('scratch')).toBeInTheDocument()

    const imported = useWorkStore.getState().notes
    expect(imported).toHaveLength(2)
    expect(imported[0].title).toBe('Imported Heading')
    expect(imported[0].content).toBe(firstContent)
    expect(imported[1].title).toBe('scratch')
    expect(imported[1].content).toBe(secondContent)
    expect(storageExecute).toHaveBeenCalledTimes(2)
    expect((screen.getByTestId('note-editor-textarea') as HTMLTextAreaElement).value).toBe(firstContent)
  })
})
