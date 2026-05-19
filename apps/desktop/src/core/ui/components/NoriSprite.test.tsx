import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NoriSprite } from './NoriSprite'

describe('NoriSprite', () => {
  it('renders the Nori sprite with the computed level label', () => {
    render(<NoriSprite level={3} />)

    const sprite = screen.getByRole('img', { name: 'Nori nivel 3' })
    expect(sprite).toHaveAttribute('src', '/nora-evo/nori-03.png')
  })

  it('shows a local fallback when the sprite asset cannot load', () => {
    render(<NoriSprite level={7} />)

    fireEvent.error(screen.getByRole('img', { name: 'Nori nivel 7' }))

    expect(screen.getByRole('img', { name: 'Nori nivel 7' })).toHaveTextContent('Nori')
    expect(screen.getByText('L7')).toBeInTheDocument()
  })
})
