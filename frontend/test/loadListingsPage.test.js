import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadListingsPage } from '../src/utility/loadListingsPage.js'

// The query shape App passes in: every field is a string, '' means not set.
function queryWith(overrides) {
  return {
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    city: '',
    keyword: '',
    targetBudget: '',
    pageSize: '10',
    page: '1',
    ...overrides,
  }
}

// Builds a fake fetch Response with the fields api.js reads.
function fakeResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

// Reads the page and pageSize that a fetch call asked the API for.
function paramsOfCall(fetchMock, callIndex) {
  const url = fetchMock.mock.calls[callIndex][0]
  return new URL(url, 'http://localhost').searchParams
}

// Ids of the rows in a body, for easy comparison. Row N has id 'listing-N'.
function resultIds(body) {
  return body.results.map((listing) => listing.id)
}

// Ids for the rows numbered from firstNumber up to lastNumber, inclusive.
function idsFromTo(firstNumber, lastNumber) {
  const ids = []
  for (let number = firstNumber; number <= lastNumber; number++) {
    ids.push(`listing-${number}`)
  }
  return ids
}

// A fake API that answers like the backend would for `totalResults` listings.
function fakeApiWithListings(totalResults) {
  return vi.fn(async (url) => {
    const searchParams = new URL(url, 'http://localhost').searchParams
    const pageNumber = Number(searchParams.get('page'))
    const pageSize = Number(searchParams.get('pageSize'))
    const startIndex = (pageNumber - 1) * pageSize
    const endIndex = Math.min(pageNumber * pageSize, totalResults)
    const results = []
    for (let index = startIndex; index < endIndex; index++) {
      results.push({ id: `listing-${index + 1}` })
    }
    const body = {
      results,
      page: pageNumber,
      pageSize,
      totalResults,
      totalPages: Math.ceil(totalResults / pageSize),
    }
    return fakeResponse(200, body)
  })
}

// Empties the cache database so no test sees another test's results.
function deleteCacheDatabase() {
  return new Promise((resolve, reject) => {
    const deleteRequest = globalThis.indexedDB.deleteDatabase('listing-search')
    deleteRequest.onsuccess = () => resolve()
    deleteRequest.onerror = () => reject(deleteRequest.error)
  })
}

beforeEach(async () => {
  await deleteCacheDatabase()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadListingsPage', () => {
  it('fetches the first 20 once and returns page 1 with pageSize 10', async () => {
    const fetchMock = fakeApiWithListings(25)
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadListingsPage(queryWith({ page: '1', pageSize: '10' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(paramsOfCall(fetchMock, 0).get('page')).toBe('1')
    expect(paramsOfCall(fetchMock, 0).get('pageSize')).toBe('20')
    expect(result.ok).toBe(true)
    expect(result.status).toBe(200)
    expect(result.body.page).toBe(1)
    expect(result.body.pageSize).toBe(10)
    expect(result.body.totalResults).toBe(25)
    expect(result.body.totalPages).toBe(3)
    expect(resultIds(result.body)).toEqual(idsFromTo(1, 10))
  })

  it('returns page 2 from the cache with no extra fetch', async () => {
    const fetchMock = fakeApiWithListings(25)
    vi.stubGlobal('fetch', fetchMock)
    await loadListingsPage(queryWith({ page: '1', pageSize: '10' }))

    const result = await loadListingsPage(queryWith({ page: '2', pageSize: '10' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(resultIds(result.body)).toEqual(idsFromTo(11, 20))
  })

  it('fetches a page past 20 once and then serves the same page from the cache', async () => {
    const fetchMock = fakeApiWithListings(25)
    vi.stubGlobal('fetch', fetchMock)
    await loadListingsPage(queryWith({ page: '1', pageSize: '10' }))

    const firstResult = await loadListingsPage(queryWith({ page: '3', pageSize: '10' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(paramsOfCall(fetchMock, 1).get('page')).toBe('3')
    expect(paramsOfCall(fetchMock, 1).get('pageSize')).toBe('10')
    expect(resultIds(firstResult.body)).toEqual(idsFromTo(21, 25))

    const secondResult = await loadListingsPage(queryWith({ page: '3', pageSize: '10' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(resultIds(secondResult.body)).toEqual(idsFromTo(21, 25))
  })

  it('fetches a page that straddles the 20-row boundary', async () => {
    const fetchMock = fakeApiWithListings(25)
    vi.stubGlobal('fetch', fetchMock)
    await loadListingsPage(queryWith({ page: '1', pageSize: '7' }))

    const result = await loadListingsPage(queryWith({ page: '3', pageSize: '7' }))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(paramsOfCall(fetchMock, 1).get('page')).toBe('3')
    expect(paramsOfCall(fetchMock, 1).get('pageSize')).toBe('7')
    expect(resultIds(result.body)).toEqual(idsFromTo(15, 21))
  })

  it('prefetches 50 results in one call when pageSize is 50', async () => {
    const fetchMock = fakeApiWithListings(60)
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadListingsPage(queryWith({ page: '1', pageSize: '50' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(paramsOfCall(fetchMock, 0).get('pageSize')).toBe('50')
    expect(resultIds(result.body)).toEqual(idsFromTo(1, 50))
  })

  it('returns a 400 response unchanged and does not cache it', async () => {
    const validationBody = {
      error: 'VALIDATION_ERROR',
      details: [{ field: 'city', message: 'No listings found in city "Atlantis"' }],
    }
    const fetchMock = vi.fn().mockResolvedValue(fakeResponse(400, validationBody))
    vi.stubGlobal('fetch', fetchMock)

    const firstResult = await loadListingsPage(queryWith({ city: 'Atlantis' }))
    expect(firstResult).toEqual({ ok: false, status: 400, body: validationBody })

    await loadListingsPage(queryWith({ city: 'Atlantis' }))
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('calls the API for every page when IndexedDB is unavailable, and still returns correct rows', async () => {
    vi.stubGlobal('indexedDB', undefined)
    const fetchMock = fakeApiWithListings(25)
    vi.stubGlobal('fetch', fetchMock)

    const firstResult = await loadListingsPage(queryWith({ page: '1', pageSize: '10' }))
    const secondResult = await loadListingsPage(queryWith({ page: '2', pageSize: '10' }))

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(resultIds(firstResult.body)).toEqual(idsFromTo(1, 10))
    expect(resultIds(secondResult.body)).toEqual(idsFromTo(11, 20))
  })

  it('returns an empty page with the correct totalPages for a page past the end, with no extra fetch', async () => {
    const fetchMock = fakeApiWithListings(25)
    vi.stubGlobal('fetch', fetchMock)

    const result = await loadListingsPage(queryWith({ page: '99', pageSize: '10' }))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
    expect(result.body.results).toEqual([])
    expect(result.body.page).toBe(99)
    expect(result.body.totalResults).toBe(25)
    expect(result.body.totalPages).toBe(3)
  })
})
