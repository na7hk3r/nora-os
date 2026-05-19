import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ShortcutsPage } from './ShortcutsPage'

describe('ShortcutsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the command palette shortcut for opening a result in the right pane', () => {
    render(<ShortcutsPage />)

    expect(screen.getByText('Abrir resultado en el panel derecho')).toBeInTheDocument()
    expect(screen.getAllByText('Ctrl/Cmd').length).toBeGreaterThan(0)
    expect(screen.getByText('/')).toBeInTheDocument()
    expect(screen.getByText(/Shift \+ 7/)).toBeInTheDocument()
  })
})
