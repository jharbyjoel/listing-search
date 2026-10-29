import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ResultsTable from '../src/components/ResultsTable.jsx'

const results = [
  {
    id: 1,
    source: 'A',
    address: '12 Oak Lane',
    city: 'Reston',
    price: 425000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1450,
    status: 'active',
    listedDate: '2026-08-01',
    score: 0.876,
  },
  {
    id: 1,
    source: 'B',
    address: '98 Pine Road',
    city: 'Vienna',
    price: 1250000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2100,
    status: 'sold',
    listedDate: '2026-07-28',
    score: 0.5,
  },
]

describe('ResultsTable', () => {
  it('renders a header row and one row per result', () => {
    render(<ResultsTable results={results} />)

    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(3)
    expect(within(rows[1]).getByRole('cell', { name: '12 Oak Lane' })).toBeInTheDocument()
    expect(within(rows[2]).getByRole('cell', { name: '98 Pine Road' })).toBeInTheDocument()
  })

  it('formats the price with a dollar sign and thousands separators', () => {
    render(<ResultsTable results={results} />)

    expect(screen.getByRole('cell', { name: '$425,000' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '$1,250,000' })).toBeInTheDocument()
  })

  it('shows the score as a whole number from 0 to 100', () => {
    render(<ResultsTable results={results} />)

    expect(screen.getByRole('cell', { name: '88' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '50' })).toBeInTheDocument()
  })
})

describe('ResultsTable Sq ft column', () => {
  it('shows a Sq ft header', () => {
    render(<ResultsTable results={results} />)

    expect(screen.getByRole('columnheader', { name: 'Sq ft' })).toBeInTheDocument()
  })

  it('formats sqft with thousands separators and no unit', () => {
    render(<ResultsTable results={results} />)

    expect(screen.getByRole('cell', { name: '1,450' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '2,100' })).toBeInTheDocument()
  })
})
