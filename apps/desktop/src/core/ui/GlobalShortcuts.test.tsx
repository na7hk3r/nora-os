import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useCoreStore } from '@core/state/coreStore'
import { GlobalShortcuts } from './GlobalShortcuts'

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderShortcuts(onShortcutHandled = vi.fn()) {
  return {
    onShortcutHandled,
    ...render(
      <MemoryRouter initialEntries={['/']}>
        <GlobalShortcuts onShortcutHandled={onShortcutHandled} />
        <input aria-label="Editor" />
        <Routes>
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    ),
  }
}

describe('GlobalShortcuts', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useCoreStore.setState({
      settings: {
        theme: 'default',
        sidebarCollapsed: false,
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('handles Ctrl/Cmd+N by notifying, navigating, and dispatching new note', async () => {
    vi.useFakeTimers()
    const { onShortcutHandled } = renderShortcuts()
    const newNoteHandler = vi.fn()
    window.addEventListener('work:new-note', newNoteHandler)

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })

    expect(onShortcutHandled).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('location')).toHaveTextContent('/work/notes')

    vi.advanceTimersByTime(60)
    expect(newNoteHandler).toHaveBeenCalledTimes(1)

    window.removeEventListener('work:new-note', newNoteHandler)
  })

  it('does not handle Ctrl/Cmd+N while typing in an input', () => {
    const { onShortcutHandled } = renderShortcuts()

    fireEvent.keyDown(screen.getByLabelText('Editor'), { key: 'n', ctrlKey: true })

    expect(onShortcutHandled).not.toHaveBeenCalled()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })

  it('handles Ctrl/Cmd+B by notifying and toggling the sidebar setting', () => {
    const { onShortcutHandled } = renderShortcuts()

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true })

    expect(onShortcutHandled).toHaveBeenCalledTimes(1)
    expect(useCoreStore.getState().settings.sidebarCollapsed).toBe(true)
  })
})
