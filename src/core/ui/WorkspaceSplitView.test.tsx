import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { useWorkspaceLayout, WorkspaceLayoutProvider } from './WorkspaceLayoutContext'
import { WorkspaceSplitView } from './WorkspaceSplitView'

function Controls() {
  const workspace = useWorkspaceLayout()
  return (
    <button type="button" onClick={() => workspace.openDual('/missing-route')}>
      Open dual
    </button>
  )
}

function renderSplitView() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <WorkspaceLayoutProvider>
        <Controls />
        <Routes>
          <Route element={<WorkspaceSplitView />}>
            <Route index element={<div>Primary outlet</div>} />
          </Route>
        </Routes>
      </WorkspaceLayoutProvider>
    </MemoryRouter>,
  )
}

describe('WorkspaceSplitView', () => {
  beforeEach(() => {
    vi.spyOn(window.storage, 'query').mockResolvedValue([])
    vi.spyOn(window.storage, 'execute').mockResolvedValue({ changes: 1, lastInsertRowid: 1 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the current route as a single outlet by default', async () => {
    renderSplitView()
    await waitFor(() => expect(window.storage.execute).toHaveBeenCalled())

    expect(screen.getByTestId('workspace-single-view')).toBeInTheDocument()
    expect(screen.getByText('Primary outlet')).toBeInTheDocument()
  })

  it('renders dual panes and closes back to a single view', async () => {
    renderSplitView()

    fireEvent.click(screen.getByRole('button', { name: 'Open dual' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-dual-view')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cerrar vista dual' })).toBeInTheDocument()
      expect(screen.getByText('Vista no disponible')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar vista dual' }))

    await waitFor(() => {
      expect(screen.getByTestId('workspace-single-view')).toBeInTheDocument()
    })
  })
})
