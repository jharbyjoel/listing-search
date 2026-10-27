import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SearchForm from '../src/components/SearchForm.jsx'

const emptyValues = {
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  city: '',
  keyword: '',
  targetBudget: '',
  pageSize: '',
}

describe('SearchForm', () => {
  afterEach(() => {
    cleanup()
  })

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
