import { describe, expect, it } from 'vitest'
import { validateQuery } from '../src/utility/validateQuery.js'

describe('validateQuery defaults', () => {
  it('is valid with no values and defaults page to 1 and pageSize to 10', () => {
    const result = validateQuery({})

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
    expect(result.values).toEqual({
      minPrice: undefined,
      maxPrice: undefined,
      minBedrooms: undefined,
      targetBudget: undefined,
      city: undefined,
      keyword: undefined,
      page: 1,
      pageSize: 10,
    })
  })

  it('treats empty and whitespace-only strings as not provided', () => {
    const result = validateQuery({
      minPrice: '',
      city: '   ',
      keyword: '',
      page: '  ',
      pageSize: '',
    })

    expect(result.isValid).toBe(true)
    expect(result.values.minPrice).toBeUndefined()
    expect(result.values.city).toBeUndefined()
    expect(result.values.keyword).toBeUndefined()
    expect(result.values.page).toBe(1)
    expect(result.values.pageSize).toBe(10)
  })

  it('trims city and keyword and parses numeric strings', () => {
    const result = validateQuery({
      city: '  Toronto ',
      keyword: ' garden ',
      minPrice: ' 100000 ',
      page: '3',
    })

    expect(result.isValid).toBe(true)
    expect(result.values.city).toBe('Toronto')
    expect(result.values.keyword).toBe('garden')
    expect(result.values.minPrice).toBe(100000)
    expect(result.values.page).toBe(3)
  })

  it('ignores keys that are not part of the spec', () => {
    const result = validateQuery({ sort: 'price', foo: 'bar', city: 'Ottawa' })

    expect(result.isValid).toBe(true)
    expect(result.values).not.toHaveProperty('sort')
    expect(result.values).not.toHaveProperty('foo')
    expect(result.values.city).toBe('Ottawa')
  })
})

describe('validateQuery number checks', () => {
  it.each([
    ['minPrice', 'abc'],
    ['maxPrice', '12abc'],
    ['minBedrooms', 'Infinity'],
    ['targetBudget', 'NaN'],
    ['page', 'abc'],
    ['pageSize', '5x'],
  ])('reports %s as not a number when given %s', (field, value) => {
    const result = validateQuery({ [field]: value })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([{ field, message: `${field} must be a number` }])
  })

  it.each([['minBedrooms'], ['page'], ['pageSize']])(
    'reports %s as not a whole number when given 1.5',
    (field) => {
      const result = validateQuery({ [field]: '1.5' })

      expect(result.errors).toEqual([{ field, message: `${field} must be a whole number` }])
    },
  )

  it('allows decimal prices and budgets', () => {
    const result = validateQuery({ minPrice: '1.5', maxPrice: '2.25', targetBudget: '0.5' })

    expect(result.isValid).toBe(true)
    expect(result.values.minPrice).toBe(1.5)
    expect(result.values.maxPrice).toBe(2.25)
    expect(result.values.targetBudget).toBe(0.5)
  })

  it.each([['minPrice'], ['maxPrice'], ['minBedrooms']])(
    'reports %s as negative when below zero',
    (field) => {
      const result = validateQuery({ [field]: '-1' })

      expect(result.errors).toEqual([{ field, message: `${field} cannot be negative` }])
    },
  )

  it('allows zero for minPrice, maxPrice and minBedrooms', () => {
    const result = validateQuery({ minPrice: '0', maxPrice: '0', minBedrooms: '0' })

    expect(result.isValid).toBe(true)
  })

  it.each([['0'], ['-5']])('reports targetBudget %s as must be greater than 0', (value) => {
    const result = validateQuery({ targetBudget: value })

    expect(result.errors).toEqual([
      { field: 'targetBudget', message: 'targetBudget must be greater than 0' },
    ])
  })

  it.each([['0'], ['-1']])('reports page %s as must be 1 or greater', (value) => {
    const result = validateQuery({ page: value })

    expect(result.errors).toEqual([{ field: 'page', message: 'page must be 1 or greater' }])
  })

  it.each([['0'], ['51'], ['-3']])('reports pageSize %s as out of range', (value) => {
    const result = validateQuery({ pageSize: value })

    expect(result.errors).toEqual([
      { field: 'pageSize', message: 'pageSize must be between 1 and 50' },
    ])
  })

  it.each([['1'], ['50']])('accepts pageSize %s at the edges of the range', (value) => {
    const result = validateQuery({ pageSize: value })

    expect(result.isValid).toBe(true)
    expect(result.values.pageSize).toBe(Number(value))
  })

  it('reports only the first failing check for a field', () => {
    const result = validateQuery({ page: '1.5' })

    expect(result.errors).toEqual([{ field: 'page', message: 'page must be a whole number' }])
  })

  it('reports a negative non-integer minBedrooms as a whole number error only', () => {
    const result = validateQuery({ minBedrooms: '-1.5' })

    expect(result.errors).toEqual([
      { field: 'minBedrooms', message: 'minBedrooms must be a whole number' },
    ])
  })

  it('leaves invalid numeric values undefined in values', () => {
    const result = validateQuery({ minPrice: 'abc', page: '0' })

    expect(result.values.minPrice).toBeUndefined()
    expect(result.values.page).toBeUndefined()
  })
})

describe('validateQuery price range check', () => {
  it('reports minPrice greater than maxPrice', () => {
    const result = validateQuery({ minPrice: '500', maxPrice: '400' })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([
      { field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' },
    ])
  })

  it('allows minPrice equal to maxPrice', () => {
    const result = validateQuery({ minPrice: '400', maxPrice: '400' })

    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('does not compare prices when one of them is invalid', () => {
    const result = validateQuery({ minPrice: 'abc', maxPrice: '400' })

    expect(result.errors).toEqual([{ field: 'minPrice', message: 'minPrice must be a number' }])
  })

  it('does not compare prices when one of them is missing', () => {
    const result = validateQuery({ minPrice: '900' })

    expect(result.isValid).toBe(true)
  })
})

describe('validateQuery multiple errors', () => {
  it('collects all errors together', () => {
    const result = validateQuery({
      minPrice: '-1',
      maxPrice: 'abc',
      minBedrooms: '2.5',
      targetBudget: '0',
      page: '0',
      pageSize: '51',
      city: 'Toronto',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors).toEqual([
      { field: 'minPrice', message: 'minPrice cannot be negative' },
      { field: 'maxPrice', message: 'maxPrice must be a number' },
      { field: 'minBedrooms', message: 'minBedrooms must be a whole number' },
      { field: 'targetBudget', message: 'targetBudget must be greater than 0' },
      { field: 'page', message: 'page must be 1 or greater' },
      { field: 'pageSize', message: 'pageSize must be between 1 and 50' },
    ])
    expect(result.values.city).toBe('Toronto')
  })

  it('returns the range error together with the price order error', () => {
    const result = validateQuery({ minPrice: '900', maxPrice: '100', pageSize: '0' })

    expect(result.errors).toEqual([
      { field: 'pageSize', message: 'pageSize must be between 1 and 50' },
      { field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' },
    ])
  })
})
