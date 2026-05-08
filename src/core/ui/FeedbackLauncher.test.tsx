import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from './components/ToastProvider'
import { FeedbackLauncher } from './FeedbackLauncher'
import { useCoreStore } from '@core/state/coreStore'
import { eventBus } from '@core/events/EventBus'

function renderLauncher(feedbackFormUrl = 'https://forms.example.com/beta') {
  useCoreStore.setState({
    activePlugins: ['work', 'habits'],
    settings: {
      theme: 'calma',
      sidebarCollapsed: false,
    },
  })

  return render(
    <MemoryRouter initialEntries={['/work?view=kanban']}>
      <ToastProvider>
        <FeedbackLauncher feedbackFormUrl={feedbackFormUrl} />
      </ToastProvider>
    </MemoryRouter>,
  )
}

describe('FeedbackLauncher', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens and closes the feedback modal', () => {
    renderLauncher()

    fireEvent.click(screen.getByRole('button', { name: /enviar feedback beta/i }))
    expect(screen.getByRole('dialog', { name: /tu opinion ayuda/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /cerrar feedback/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the configured form without context by default', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderLauncher('https://forms.example.com/beta?source=nora')
    fireEvent.click(screen.getByRole('button', { name: /enviar feedback beta/i }))
    fireEvent.click(screen.getByRole('button', { name: /abrir formulario/i }))

    expect(openSpy).toHaveBeenCalledTimes(1)
    const openedUrl = new URL(openSpy.mock.calls[0]?.[0] as string)
    expect(openedUrl.searchParams.get('source')).toBe('nora')
    expect(openedUrl.searchParams.has('version')).toBe(false)
  })

  it('includes basic context only when the user opts in', () => {
    vi.spyOn(eventBus, 'getHistory').mockReturnValue([
      { event: 'WORK_TASK_CREATED', payload: {}, timestamp: 1710000000000 },
    ])
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderLauncher()
    fireEvent.click(screen.getByRole('button', { name: /enviar feedback beta/i }))
    fireEvent.click(screen.getByRole('checkbox', { name: /adjuntar contexto tecnico basico/i }))
    fireEvent.click(screen.getByRole('button', { name: /abrir formulario/i }))

    const openedUrl = new URL(openSpy.mock.calls[0]?.[0] as string)
    expect(openedUrl.searchParams.get('route')).toBe('/work?view=kanban')
    expect(openedUrl.searchParams.get('theme')).toBe('calma')
    expect(openedUrl.searchParams.get('activePlugins')).toBe(JSON.stringify(['work', 'habits']))
    expect(openedUrl.searchParams.get('recentEvents')).toContain('WORK_TASK_CREATED')
  })

  it('shows a toast and does not open an external URL when no form URL is configured', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    renderLauncher('')
    fireEvent.click(screen.getByRole('button', { name: /enviar feedback beta/i }))
    fireEvent.click(screen.getByRole('button', { name: /abrir formulario/i }))

    expect(openSpy).not.toHaveBeenCalled()
    expect(await screen.findByText('No hay formulario de feedback configurado para esta build.')).toBeInTheDocument()
  })
})
