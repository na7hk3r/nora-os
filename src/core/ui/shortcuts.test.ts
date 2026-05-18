import { describe, expect, it } from 'vitest'
import { getAllShortcuts } from './shortcuts'

describe('shortcut catalog', () => {
  it('documents the command palette shortcut for opening a result beside the current view', () => {
    expect(getAllShortcuts()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'palette-side-open',
          keys: 'Ctrl/Cmd + /',
          action: 'Abrir resultado en el panel derecho',
          scope: 'palette',
        }),
      ]),
    )
  })
})
