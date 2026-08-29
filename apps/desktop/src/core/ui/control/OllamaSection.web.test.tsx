import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@core/i18n'
import { OllamaSection } from './OllamaSection'

function setWebFlag(value: boolean) {
  Object.defineProperty(window, '__NORA_WEB__', {
    configurable: true,
    writable: true,
    value: value ? true : undefined,
  })
}

describe('OllamaSection (web platform)', () => {
  afterEach(() => {
    setWebFlag(false)
    vi.restoreAllMocks()
  })

  it('marca la IA local como no disponible cuando corre en la web', async () => {
    setWebFlag(true)
    render(
      <I18nProvider>
        <OllamaSection />
      </I18nProvider>,
    )

    expect(
      await screen.findByText(/not available in the web version\./i),
    ).toBeInTheDocument()

    const toggle = screen.getByRole('checkbox')
    expect(toggle).toBeDisabled()
  })

  it('no muestra el aviso web cuando no corre en la web', async () => {
    setWebFlag(false)
    render(
      <I18nProvider>
        <OllamaSection />
      </I18nProvider>,
    )

    expect(
      await screen.findByText(/Enable Ollama/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/not available in the web version\./i)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toBeDisabled()
  })
})
