import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FeedbackPage } from '../sections/FeedbackPage'

describe('FeedbackPage', () => {
  it('renders a non-technical feedback form with context hidden fields', () => {
    window.history.pushState(
      null,
      '',
      '/nora-os/?version=1.13.2&route=%2Fwork&theme=calma#feedback',
    )

    render(<FeedbackPage feedbackEndpoint="https://forms.example.com/feedback" />)

    expect(screen.getByRole('heading', { name: /contanos qué tal va nora os/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/tu mensaje/i)).toBeRequired()

    const form = screen.getByRole('form', { name: /formulario de feedback beta/i })
    expect(form).toHaveAttribute('action', 'https://forms.example.com/feedback')
    expect(screen.getByDisplayValue('1.13.2')).toHaveAttribute('name', 'version')
    expect(screen.getByDisplayValue('/work')).toHaveAttribute('name', 'route')
    expect(screen.getByDisplayValue('calma')).toHaveAttribute('name', 'theme')
  })

  it('does not submit when the endpoint is missing', () => {
    render(<FeedbackPage feedbackEndpoint="" />)

    fireEvent.change(screen.getByLabelText(/tu mensaje/i), {
      target: { value: 'La app se entiende bien.' },
    })
    act(() => {
      fireEvent.submit(screen.getByRole('form', { name: /formulario de feedback beta/i }))
    })

    expect(screen.getByText(/todavía no está configurado/i)).toBeInTheDocument()
    expect(screen.queryByText(/gracias, feedback enviado/i)).not.toBeInTheDocument()
  })

  it('keeps the form mounted while submitting, then shows a thank-you state', async () => {
    vi.useFakeTimers()
    render(<FeedbackPage feedbackEndpoint="https://forms.example.com/feedback" />)

    fireEvent.change(screen.getByLabelText(/tu mensaje/i), {
      target: { value: 'Me gusto el dashboard.' },
    })
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: /formulario de feedback beta/i }))
    })

    expect(screen.getByRole('button', { name: /enviando/i })).toBeDisabled()
    await act(async () => {
      vi.advanceTimersByTime(1800)
    })

    expect(screen.getByText(/gracias, feedback enviado/i)).toBeInTheDocument()
    vi.useRealTimers()
  })
})
