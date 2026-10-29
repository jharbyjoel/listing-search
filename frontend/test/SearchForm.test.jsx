import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SearchForm from '../src/components/SearchForm.jsx'

const emptyValues = {
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  minSqft: '',
  city: '',
  keyword: '',
  targetBudget: '',
  pageSize: '',
}

describe('SearchForm', () => {
  it('calls onSearch with the typed values when submitted', () => {
    const onSearch = vi.fn()
    render(<SearchForm initialValues={emptyValues} fieldErrors={{}} onSearch={onSearch} />)

    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Reston' } })
    fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '100000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledTimes(1)
    expect(onSearch).toHaveBeenCalledWith({ ...emptyValues, city: 'Reston', minPrice: '100000' })
  })

  it('shows the error and does not call onSearch when minPrice is greater than maxPrice', () => {
    const onSearch = vi.fn()
    render(<SearchForm initialValues={emptyValues} fieldErrors={{}} onSearch={onSearch} />)

    fireEvent.change(screen.getByLabelText('Min price'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Max price'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByRole('alert')).toHaveTextContent('minPrice cannot be greater than maxPrice')
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('displays fieldErrors passed in as a prop next to the matching field', () => {
    render(
      <SearchForm
        initialValues={emptyValues}
        fieldErrors={{ city: 'city matches no listing' }}
        onSearch={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('city matches no listing')
  })
})

describe('SearchForm minSqft field', () => {
  it('renders Min sq ft directly after Min bedrooms', () => {
    const { container } = render(
      <SearchForm initialValues={emptyValues} fieldErrors={{}} onSearch={vi.fn()} />,
    )

    const labelTexts = Array.from(container.querySelectorAll('label')).map((label) => label.textContent)
    expect(labelTexts.indexOf('Min sq ft')).toBe(labelTexts.indexOf('Min bedrooms') + 1)
  })

  it('submits the typed value as minSqft', () => {
    const onSearch = vi.fn()
    render(<SearchForm initialValues={emptyValues} fieldErrors={{}} onSearch={onSearch} />)

    fireEvent.change(screen.getByLabelText('Min sq ft'), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(onSearch).toHaveBeenCalledWith({ ...emptyValues, minSqft: '1500' })
  })

  it('shows the field error and does not call onSearch for a value that is not a whole number', () => {
    const onSearch = vi.fn()
    render(<SearchForm initialValues={emptyValues} fieldErrors={{}} onSearch={onSearch} />)

    fireEvent.change(screen.getByLabelText('Min sq ft'), { target: { value: '1.5' } })
    // Submit the form directly: the browser blocks a non-whole number before the form submits.
    fireEvent.submit(screen.getByRole('button', { name: 'Search' }).closest('form'))

    expect(screen.getByRole('alert')).toHaveTextContent('minSqft must be a whole number')
    expect(onSearch).not.toHaveBeenCalled()
  })
})
