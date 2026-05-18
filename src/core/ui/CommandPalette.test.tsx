import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { CommandPalette } from './CommandPalette'
import { useWorkspaceLayout, WorkspaceLayoutProvider } from './WorkspaceLayoutContext'

function WorkspaceProbe() {
  const workspace = useWorkspaceLayout()
  const location = useLocation()
  return (
    <output data-testid="workspace-state">
      {JSON.stringify({
        dualEnabled: workspace.dualEnabled,
        activePane: workspace.activePane,
        secondaryPath: workspace.secondaryPath,
        pathname: location.pathname,
      })}
    </output>
  )
}

function renderPalette(onShortcutHandled = vi.fn()) {
  return {
    onShortcutHandled,
    ...render(
      <MemoryRouter>
        <WorkspaceLayoutProvider>
          <CommandPalette onShortcutHandled={onShortcutHandled} />
          <WorkspaceProbe />
        </WorkspaceLayoutProvider>
      </MemoryRouter>,
    ),
  }
}

describe('CommandPalette', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(window.storage, 'query').mockResolvedValue([])
    vi.spyOn(window.storage, 'execute').mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('handles Ctrl/Cmd+K by notifying and opening the palette', async () => {
    const { onShortcutHandled } = renderPalette()
    await waitFor(() => expect(window.storage.execute).toHaveBeenCalled())

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

    expect(onShortcutHandled).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('opens the dual workspace from an action command', async () => {
    renderPalette()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'vista dual' } })
    fireEvent.click(await screen.findByText('Abrir vista dual'))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"dualEnabled":true')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"secondary"')
    })
  })

  it('opens a selected result in the right pane with Ctrl/Cmd+Slash', async () => {
    renderPalette()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Notas' } })
    await screen.findByText('Notas')

    const bubbled = vi.fn()
    window.addEventListener('keydown', bubbled)
    const cancelled = fireEvent.keyDown(input, { key: '/', code: 'Slash', ctrlKey: true })
    window.removeEventListener('keydown', bubbled)

    expect(cancelled).toBe(false)
    expect(bubbled).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"dualEnabled":true')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"secondary"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"secondaryPath":"/notes"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"pathname":"/"')
    })
  })

  it('opens a selected result beside the current view with the Spanish slash chord', async () => {
    renderPalette()

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'Notas' } })
    await screen.findByText('Notas')

    fireEvent.keyDown(input, { key: '7', code: 'Digit7', ctrlKey: true, shiftKey: true })

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"dualEnabled":true')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"secondary"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"secondaryPath":"/notes"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"pathname":"/"')
    })
  })
})
