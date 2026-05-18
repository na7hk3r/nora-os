import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  detectInitialLanguage,
  I18N_STORAGE_KEY,
  I18nProvider,
  translateStaticUiText,
  useI18n,
} from './index'
import { LanguageSelector } from './LanguageSelector'

function I18nProbe() {
  const { language, t, formatDate, formatNumber } = useI18n()

  return (
    <div>
      <output data-testid="language">{language}</output>
      <output data-testid="label">{t.language.label}</output>
      <output data-testid="spanish-name">{t.language.es}</output>
      <output data-testid="password-label">{t.auth.password}</output>
      <output data-testid="date">{formatDate('2026-05-18', { month: 'long' })}</output>
      <output data-testid="number">{formatNumber(1234.5)}</output>
      <LanguageSelector />
    </div>
  )
}

function InlineSpanishProbe() {
  return <button title="Cerrar sesión">Actualización lista</button>
}

describe('i18n', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
    document.documentElement.lang = ''
  })

  it('detects stored language, navigator candidates, and Spanish fallback', () => {
    expect(detectInitialLanguage({ stored: 'en', candidates: ['es-UY'] })).toBe('en')
    expect(detectInitialLanguage({ stored: 'fr', candidates: ['en-US', 'es-UY'] })).toBe('en')
    expect(detectInitialLanguage({ candidates: ['pt-BR', 'fr-FR'] })).toBe('es')
  })

  it('updates visible copy, html lang, and localStorage when language changes', async () => {
    window.localStorage.setItem(I18N_STORAGE_KEY, 'en')

    render(
      <I18nProvider>
        <I18nProbe />
      </I18nProvider>,
    )

    expect(screen.getByTestId('language')).toHaveTextContent('en')
    expect(screen.getByTestId('label')).toHaveTextContent('Language')

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('en')
      expect(window.localStorage.getItem(I18N_STORAGE_KEY)).toBe('en')
    })

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'es' },
    })

    expect(screen.getByTestId('language')).toHaveTextContent('es')
    expect(screen.getByTestId('label')).toHaveTextContent('Idioma')
    expect(screen.getByTestId('spanish-name')).toHaveTextContent('Español')
    expect(screen.getByTestId('password-label')).toHaveTextContent('Contraseña')
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('es')
      expect(window.localStorage.getItem(I18N_STORAGE_KEY)).toBe('es')
    })
  })

  it('formats dates and numbers with the active language', () => {
    window.localStorage.setItem(I18N_STORAGE_KEY, 'en')

    render(
      <I18nProvider>
        <I18nProbe />
      </I18nProvider>,
    )

    const englishDate = screen.getByTestId('date').textContent
    const englishNumber = screen.getByTestId('number').textContent
    expect(englishDate).toMatch(/may/i)

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'es' },
    })

    expect(screen.getByTestId('date').textContent).toMatch(/mayo/i)
    expect(screen.getByTestId('number').textContent).not.toBe(englishNumber)
  })

  it('normalizes known inline desktop copy while English is active', async () => {
    window.localStorage.setItem(I18N_STORAGE_KEY, 'en')

    render(
      <I18nProvider>
        <InlineSpanishProbe />
      </I18nProvider>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveTextContent('Update ready')
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Sign out')
    })
  })

  it('translates static UI text through the English catalog', () => {
    expect(translateStaticUiText('en', 'Actualización lista')).toBe('Update ready')
    expect(translateStaticUiText('es', 'Actualización lista')).toBe('Actualización lista')
  })
})
