import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { useWorkspaceLayout, WorkspaceLayoutProvider } from './WorkspaceLayoutContext'
import { WorkspaceNavLink } from './Sidebar'

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
          pathname: location.pathname,
        })}
      </output>
      <button type="button" onClick={() => workspace.openDual('/notes')}>
        Activate right
      </button>
      <WorkspaceNavLink to="/links" className={({ isActive }) => (isActive ? 'active' : 'idle')}>
        Links
      </WorkspaceNavLink>
    </div>
  )
}

describe('WorkspaceNavLink', () => {
  beforeEach(() => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([])
    vi.spyOn(window.storage, 'execute').mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('routes sidebar clicks into the active right pane without changing the URL path', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <WorkspaceLayoutProvider>
          <Probe />
        </WorkspaceLayoutProvider>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Activate right' }))
    const cancelled = fireEvent.click(screen.getByText('Links'), { ctrlKey: true })

    expect(cancelled).toBe(false)

    await waitFor(() => {
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"dualEnabled":true')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"activePane":"secondary"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"secondaryPath":"/links"')
      expect(screen.getByTestId('workspace-state')).toHaveTextContent('"pathname":"/"')
    })
  })
})
