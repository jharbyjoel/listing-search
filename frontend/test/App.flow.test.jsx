import 'fake-indexeddb/auto'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App.jsx'

// Builds a fake fetch Response with the fields api.js reads.
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

function fakeListing(overrides) {
  return {
    id: 'A1',
    source: 'A',
    address: '12 Oak Street',
    city: 'Reston',
    price: 450000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1450,
    status: 'active',
    listedDate: '2026-08-15',
    score: 0.8,
    ...overrides,
  }
}

function fakeSearchBody(overrides) {
  return {
    results: [],
    page: 1,
    pageSize: 10,
    totalResults: 0,
    totalPages: 0,
    ...overrides,
  }
}

// Empties the cache database so no test sees another test's cached results.
function deleteCacheDatabase() {
  return new Promise((resolve, reject) => {
    const deleteRequest = globalThis.indexedDB.deleteDatabase('listing-search')
    deleteRequest.onsuccess = () => resolve()
    deleteRequest.onerror = () => reject(deleteRequest.error)
  })
}

// Clicks the Search button, which submits the form with the current field values.
function submitSearch() {
  fireEvent.click(screen.getByRole('button', { name: 'Search' }))
}

describe('App search flow', () => {
  beforeEach(async () => {
    window.history.replaceState(null, '', '/')
    await deleteCacheDatabase()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows Loading while the request is pending, then renders the results', async () => {
    let resolveFetch
    const fetchMock = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    submitSearch()

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    // The cache is checked before the API, so wait until the fetch has started.
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    resolveFetch(
      fakeResponse(
        200,
        fakeSearchBody({
          results: [fakeListing({ address: '12 Oak Street' })],
          totalResults: 1,
          totalPages: 1,
        }),
      ),
    )

    expect(await screen.findByText('12 Oak Street')).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('shows the no-results message when the search matches nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, fakeSearchBody())))
    render(<App />)

    submitSearch()

    expect(await screen.findByText('No listings match your filters.')).toBeInTheDocument()
  })

  it('shows the server validation message next to the form when the API returns 400', async () => {
    const validationBody = {
      error: 'VALIDATION_ERROR',
      details: [{ field: 'city', message: 'No listings found in city "Atlantis"' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(400, validationBody)))
    render(<App />)

    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Atlantis' } })
    submitSearch()

    expect(await screen.findByRole('alert')).toHaveTextContent('No listings found in city "Atlantis"')
  })

  it('shows the network error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    render(<App />)

    submitSearch()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server. Please try again.',
    )
  })

  it('loads the next page when Next is clicked and puts page=2 in the URL', async () => {
    // Twelve rows: page 1 (pageSize 10) shows rows 1-10, page 2 shows rows 11-12.
    const prefetchedListings = []
    for (let number = 1; number <= 12; number++) {
      prefetchedListings.push(fakeListing({ id: `A${number}`, address: `${number} Filler Road` }))
    }
    prefetchedListings[0] = fakeListing({ address: '12 Oak Street' })
    prefetchedListings[10] = fakeListing({ id: 'A11', address: '34 Pine Avenue' })
    const prefetchedBody = fakeSearchBody({
      results: prefetchedListings,
      pageSize: 20,
      totalResults: 12,
      totalPages: 1,
    })
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, prefetchedBody))
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    submitSearch()
    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('34 Pine Avenue')).toBeInTheDocument()
    // Page 2 comes from the prefetched rows, so there is no second fetch.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(window.location.search).toContain('page=2')
  })
})
