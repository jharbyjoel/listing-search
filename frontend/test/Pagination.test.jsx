import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Pagination from '../src/components/Pagination.jsx'

describe('Pagination', () => {
  it('shows the current page and the total pages', () => {
    render(<Pagination page={2} totalPages={3} isLoading={false} onPageChange={vi.fn()} />)

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
  })

  it('disables Previous on the first page', () => {
    render(<Pagination page={1} totalPages={3} isLoading={false} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('disables Next on the last page', () => {
    render(<Pagination page={3} totalPages={3} isLoading={false} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled()
  })

  it('disables both buttons while loading', () => {
    render(<Pagination page={2} totalPages={3} isLoading={true} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('calls onPageChange with the previous and next page numbers', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={3} isLoading={false} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenLastCalledWith(1)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenLastCalledWith(3)
    expect(onPageChange).toHaveBeenCalledTimes(2)
  })

  it('jumps Previous to the last page when the current page is past the end', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={99} totalPages={2} isLoading={false} onPageChange={onPageChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))

    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
