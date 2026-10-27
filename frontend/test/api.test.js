import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchListings } from '../src/api.js'

// Builds a minimal stand-in for the fetch Response that fetchListings reads.
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

describe('fetchListings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips empty, null, and undefined values from the query string', async () => {
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(200, { results: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchListings({
      city: 'Toronto',
      keyword: '',
      minPrice: null,
      maxPrice: undefined,
      page: 2,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/listings?city=Toronto&page=2')
  })

  it('returns status, ok, and body for a 200 response', async () => {
    const body = { results: [], page: 1, pageSize: 10, totalResults: 0, totalPages: 0 }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(200, body)))

    const result = await fetchListings({ city: 'Toronto' })

    expect(result).toEqual({ ok: true, status: 200, body })
  })

  it('returns status, ok, and body for a 400 response', async () => {
    const body = { error: 'VALIDATION_ERROR', details: [{ field: 'page', message: 'must be >= 1' }] }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse(400, body)))

    const result = await fetchListings({ page: 0 })

    expect(result).toEqual({ ok: false, status: 400, body })
  })
})
