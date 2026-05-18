import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import {
  WORKSPACE_LAYOUT_SETTINGS_KEY,
  useWorkspaceLayout,
  WorkspaceLayoutProvider,
} from './WorkspaceLayoutContext'

function Probe() {
  const workspace = useWorkspaceLayout()
  const location = useLocation()

  return (
    <div>
      <output data-testid="workspace-state">
        {JSON.stringify({
          dualEnabled: workspace.dualEnabled,
          activePane: workspace.activePane,
          secondaryPath: workspace.secondaryPath,
          splitRatio: workspace.splitRatio,
          pathname: location.pathname,
        })}
      </output>
      <button type="button" onClick={() => workspace.navigateWorkspace('/links', { pane: 'secondary' })}>
        Open links right
      </button>
      <button type="button" onClick={() => workspace.navigateWorkspace('/planner', { pane: 'primary' })}>
        Open planner left
      </button>
      <button type="button" onClick={() => workspace.setSplitRatio(61)}>
        Set split
      </button>
    </div>
  )
}

function renderProvider(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <WorkspaceLayoutProvider>
        <Probe />
      </WorkspaceLayoutProvider>
    </MemoryRouter>,
  )
}

describe('WorkspaceLayoutProvider', () => {
  beforeEach(() => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([])
    vi.spyOn(window.storage, 'execute').mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('loads and sanitizes persisted workspace layout', async () => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([
      {
        value: JSON.stringify({
          dualEnabled: true,
          activePane: 'secondary',
          secondaryPath: 'notes',
          splitRatio: 99,
        }),
      },
    ])

    renderProvider('/planner')

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"dualEnabled":true')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"secondary"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"secondaryPath":"/notes"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"splitRatio":68')
    })
  })

  it('navigates the active pane independently', async () => {
    renderProvider('/')

    fireEvent.click(screen.getByRole('button', { name: 'Open links right' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"dualEnabled":true')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"secondary"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"secondaryPath":"/links"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"pathname":"/"')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open planner left' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"primary"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"pathname":"/planner"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"secondaryPath":"/links"')
    })
  })

  it('persists split ratio changes in settings', async () => {
    const executeSpy = vi.spyOn(window.storage, 'execute')
    renderProvider('/')

    fireEvent.click(screen.getByRole('button', { name: 'Set split' }))

    await waitFor(() => {
      expect(executeSpy).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [
          WORKSPACE_LAYOUT_SETTINGS_KEY,
          expect.stringContaining('"splitRatio":61'),
        ],
      )
    })
  })
})
