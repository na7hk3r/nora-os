import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@core/i18n'
import { ScheduledBackupSection } from './ScheduledBackupSection'

function setWebFlag(value: boolean) {
  Object.defineProperty(window, '__NORA_WEB__', {
    configurable: true,
    writable: true,
    value: value ? true : undefined,
  })
}

describe('ScheduledBackupSection (web platform)', () => {
  afterEach(() => {
    setWebFlag(false)
    vi.restoreAllMocks()
  })

  it('avisa que el backup automatico no esta disponible en la web', () => {
    setWebFlag(true)
    render(
      <I18nProvider>
        <ScheduledBackupSection />
      </I18nProvider>,
    )

    expect(screen.getByText(/Automatic backup/i)).toBeInTheDocument()
    expect(screen.getByText(/not available in the web version\./i)).toBeInTheDocument()
    expect(screen.queryByText(/Run now/i)).not.toBeInTheDocument()
  })

  it('no muestra el aviso web cuando no corre en la web', () => {
    setWebFlag(false)
    render(
      <I18nProvider>
        <ScheduledBackupSection />
      </I18nProvider>,
    )

    expect(screen.queryByText(/not available in the web version\./i)).not.toBeInTheDocument()
  })
})
