import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildFirstResultsKey,
  buildPageKey,
  loadFromCache,
  saveToCache,
} from '../src/utility/listingsCache.js'

const ONE_MINUTE_IN_MILLISECONDS = 60 * 1000

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('saveToCache and loadFromCache', () => {
  it('returns the same data that was saved', async () => {
    const listings = { results: [{ id: 'A1' }], totalResults: 1 }

    await saveToCache('save-then-load', listings)

    expect(await loadFromCache('save-then-load')).toEqual(listings)
  })

  it('returns an entry that is 4 minutes 59 seconds old', async () => {
    const savedAt = 1_000_000
    vi.spyOn(Date, 'now').mockReturnValue(savedAt)
    await saveToCache('age-just-under-limit', ['still fresh'])

    const now = savedAt + 4 * ONE_MINUTE_IN_MILLISECONDS + 59 * 1000

    expect(await loadFromCache('age-just-under-limit', now)).toEqual(['still fresh'])
  })

  it('returns null for an entry that is 5 minutes 1 second old', async () => {
    const savedAt = 1_000_000
    vi.spyOn(Date, 'now').mockReturnValue(savedAt)
    await saveToCache('age-just-over-limit', ['too old'])

    const now = savedAt + 5 * ONE_MINUTE_IN_MILLISECONDS + 1000

    expect(await loadFromCache('age-just-over-limit', now)).toBeNull()
  })

  it('returns null when the key was never saved', async () => {
    expect(await loadFromCache('key-that-was-never-saved')).toBeNull()
  })

  it('returns null and does not throw when IndexedDB is missing', async () => {
    await saveToCache('no-indexeddb-key', ['saved before IndexedDB went away'])
    vi.stubGlobal('indexedDB', undefined)

    expect(await loadFromCache('no-indexeddb-key')).toBeNull()
  })

  it('does not throw when saving and IndexedDB is missing', async () => {
    vi.stubGlobal('indexedDB', undefined)

    await expect(saveToCache('save-without-indexeddb', ['data'])).resolves.toBeUndefined()
  })
})

describe('buildFirstResultsKey', () => {
  it('gives different keys for different filters', () => {
    const austinKey = buildFirstResultsKey({ city: 'Austin' })
    const dallasKey = buildFirstResultsKey({ city: 'Dallas' })

    expect(austinKey).not.toEqual(dallasKey)
  })

  it('gives the same key for the same filters', () => {
    const firstFilters = { city: 'Austin', minBedrooms: 2 }
    const secondFilters = { city: 'Austin', minBedrooms: 2 }

    expect(buildFirstResultsKey(firstFilters)).toEqual(buildFirstResultsKey(secondFilters))
  })

  it('does not change when page or pageSize are present', () => {
    const filters = { city: 'Austin' }
    const filtersWithPaging = { city: 'Austin', page: 3, pageSize: 7 }

    expect(buildFirstResultsKey(filtersWithPaging)).toEqual(buildFirstResultsKey(filters))
  })

  it('treats a missing filter the same as an empty one', () => {
    expect(buildFirstResultsKey({})).toEqual(buildFirstResultsKey({ keyword: '' }))
  })
})

describe('buildPageKey', () => {
  it('differs from buildFirstResultsKey for the same filters', () => {
    const filters = { city: 'Austin' }

    expect(buildPageKey(filters, 10, 1)).not.toEqual(buildFirstResultsKey(filters))
  })

  it('differs between pages', () => {
    const filters = { city: 'Austin' }

    expect(buildPageKey(filters, 10, 2)).not.toEqual(buildPageKey(filters, 10, 3))
  })
})
