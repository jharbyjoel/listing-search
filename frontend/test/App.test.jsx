import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import App from '../src/App.jsx'

it('renders the heading', () => {
  render(<App />)

  expect(screen.getByRole('heading', { name: 'Listing Search' })).toBeInTheDocument()
})
