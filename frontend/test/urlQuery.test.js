import { describe, expect, it } from 'vitest'
import { buildUrlSearch, readQueryFromUrl } from '../src/utility/urlQuery.js'

describe('readQueryFromUrl', () => {
  it('returns empty strings for missing values', () => {
    const query = readQueryFromUrl('')

    expect(query).toEqual({
      minPrice: '',
      maxPrice: '',
      minBedrooms: '',
      minSqft: '',
      city: '',
      keyword: '',
      targetBudget: '',
      pageSize: '',
      page: '',
    })
  })

  it('returns the values present in the query string', () => {
    const query = readQueryFromUrl('?city=Reston&minPrice=100000&page=3')

    expect(query.city).toBe('Reston')
    expect(query.minPrice).toBe('100000')
    expect(query.page).toBe('3')
    expect(query.maxPrice).toBe('')
  })
})

describe('buildUrlSearch', () => {
  it('leaves out keys whose value is empty or undefined', () => {
    const search = buildUrlSearch({ city: 'Reston', keyword: '', minPrice: undefined, page: '2' })

    expect(search).toBe('?city=Reston&page=2')
  })

  it('returns an empty string when nothing is set', () => {
    expect(buildUrlSearch({ city: '', keyword: undefined })).toBe('')
  })
})

describe('readQueryFromUrl and buildUrlSearch round trip', () => {
  it('builds the same query string after reading it', () => {
    const search = '?minBedrooms=2&city=Reston&page=2'

    const query = readQueryFromUrl(search)

    expect(buildUrlSearch(query)).toBe(search)
  })
})

describe('minSqft in the URL', () => {
  it('reads minSqft from the query string', () => {
    expect(readQueryFromUrl('?minSqft=1500').minSqft).toBe('1500')
  })

  it('writes minSqft back to the query string', () => {
    expect(buildUrlSearch({ minSqft: '1500', city: 'Reston' })).toBe('?minSqft=1500&city=Reston')
  })

  it('round-trips minSqft with the other filters', () => {
    const search = '?minBedrooms=2&minSqft=1500&city=Reston&page=2'

    expect(buildUrlSearch(readQueryFromUrl(search))).toBe(search)
  })
})
