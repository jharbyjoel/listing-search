import { describe, it, expect } from 'vitest';
import { validateQuery } from '/opt/nodejs/validateQuery.js';

describe('validateQuery defaults and missing values', () => {
  it('is valid for an empty query and fills in page and pageSize defaults', () => {
    const result = validateQuery({});
    expect(result).toEqual({
      isValid: true,
      errors: [],
      values: {
        minPrice: undefined,
        maxPrice: undefined,
        minBedrooms: undefined,
        targetBudget: undefined,
        city: undefined,
        keyword: undefined,
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('treats empty and whitespace-only strings as not provided', () => {
    const result = validateQuery({
      minPrice: '',
      maxPrice: '   ',
      minBedrooms: '',
      targetBudget: ' ',
      city: '',
      keyword: '  ',
      page: '',
      pageSize: ' ',
    });
    expect(result.isValid).toBe(true);
    expect(result.values).toEqual({
      minPrice: undefined,
      maxPrice: undefined,
      minBedrooms: undefined,
      targetBudget: undefined,
      city: undefined,
      keyword: undefined,
      page: 1,
      pageSize: 10,
    });
  });

  it('treats null values as not provided', () => {
    const result = validateQuery({ minPrice: null, page: null });
    expect(result.isValid).toBe(true);
    expect(result.values.minPrice).toBeUndefined();
    expect(result.values.page).toBe(1);
  });

  it('ignores keys that are not listed in the spec', () => {
    const result = validateQuery({ sort: 'price', foo: 'bar', city: 'Springfield' });
    expect(result.isValid).toBe(true);
    expect(result.values.city).toBe('Springfield');
    expect(result.values).not.toHaveProperty('sort');
    expect(result.values).not.toHaveProperty('foo');
  });
});

describe('validateQuery parsing', () => {
  it('converts numeric strings to numbers', () => {
    const result = validateQuery({
      minPrice: '100000',
      maxPrice: '500000.5',
      minBedrooms: '2',
      targetBudget: '0.5',
      page: '3',
      pageSize: '25',
    });
    expect(result.isValid).toBe(true);
    expect(result.values).toMatchObject({
      minPrice: 100000,
      maxPrice: 500000.5,
      minBedrooms: 2,
      targetBudget: 0.5,
      page: 3,
      pageSize: 25,
    });
  });

  it('trims city and keyword', () => {
    const result = validateQuery({ city: '  Springfield  ', keyword: ' garden ' });
    expect(result.values.city).toBe('Springfield');
    expect(result.values.keyword).toBe('garden');
  });

  it('allows a minPrice of 0', () => {
    const result = validateQuery({ minPrice: '0' });
    expect(result.isValid).toBe(true);
    expect(result.values.minPrice).toBe(0);
  });
});

describe('validateQuery number errors', () => {
  it.each([
    ['minPrice', 'abc'],
    ['minPrice', '12abc'],
    ['maxPrice', 'Infinity'],
    ['minBedrooms', 'two'],
    ['targetBudget', 'NaN'],
    ['page', '1x'],
    ['pageSize', 'many'],
  ])('reports %s = "%s" as not a number', (field, value) => {
    const result = validateQuery({ [field]: value });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ field, message: `${field} must be a number` }]);
  });

  it.each([
    ['minBedrooms', '1.5'],
    ['page', '2.5'],
    ['pageSize', '10.1'],
  ])('reports %s = "%s" as not a whole number', (field, value) => {
    const result = validateQuery({ [field]: value });
    expect(result.errors).toEqual([{ field, message: `${field} must be a whole number` }]);
  });

  it('reports only the whole-number error for a negative non-integer', () => {
    const result = validateQuery({ minBedrooms: '-1.5' });
    expect(result.errors).toEqual([{ field: 'minBedrooms', message: 'minBedrooms must be a whole number' }]);
  });

  it.each([
    ['minPrice', '-1', 'minPrice cannot be negative'],
    ['maxPrice', '-0.01', 'maxPrice cannot be negative'],
    ['minBedrooms', '-1', 'minBedrooms cannot be negative'],
    ['targetBudget', '0', 'targetBudget must be greater than 0'],
    ['targetBudget', '-5', 'targetBudget must be greater than 0'],
    ['page', '0', 'page must be 1 or greater'],
    ['pageSize', '0', 'pageSize must be between 1 and 50'],
    ['pageSize', '51', 'pageSize must be between 1 and 50'],
  ])('reports range error for %s = %s', (field, value, message) => {
    const result = validateQuery({ [field]: value });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ field, message }]);
  });

  it.each([['1'], ['50']])('accepts pageSize %s', (value) => {
    const result = validateQuery({ pageSize: value });
    expect(result.isValid).toBe(true);
    expect(result.values.pageSize).toBe(Number(value));
  });
});

describe('validateQuery price range', () => {
  it('reports minPrice greater than maxPrice', () => {
    const result = validateQuery({ minPrice: '500000', maxPrice: '400000' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' },
    ]);
  });

  it('allows minPrice equal to maxPrice', () => {
    const result = validateQuery({ minPrice: '450000', maxPrice: '450000' });
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('skips the price comparison when one price is invalid', () => {
    const result = validateQuery({ minPrice: 'abc', maxPrice: '100' });
    expect(result.errors).toEqual([{ field: 'minPrice', message: 'minPrice must be a number' }]);
  });
});

describe('validateQuery collects all errors', () => {
  it('returns every error together', () => {
    const result = validateQuery({
      minPrice: '-1',
      maxPrice: 'abc',
      minBedrooms: '1.5',
      targetBudget: '0',
      page: '0',
      pageSize: '100',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'minPrice', message: 'minPrice cannot be negative' },
      { field: 'maxPrice', message: 'maxPrice must be a number' },
      { field: 'minBedrooms', message: 'minBedrooms must be a whole number' },
      { field: 'targetBudget', message: 'targetBudget must be greater than 0' },
      { field: 'page', message: 'page must be 1 or greater' },
      { field: 'pageSize', message: 'pageSize must be between 1 and 50' },
    ]);
  });
});

describe('validateQuery minSqft', () => {
  it('accepts a whole number and converts it to a number', () => {
    const result = validateQuery({ minSqft: '1500' });
    expect(result.isValid).toBe(true);
    expect(result.values.minSqft).toBe(1500);
  });

  it('gives no value when minSqft is empty or missing', () => {
    expect(validateQuery({ minSqft: '' }).values.minSqft).toBeUndefined();
    expect(validateQuery({}).values.minSqft).toBeUndefined();
  });

  it('reports a negative minSqft', () => {
    const result = validateQuery({ minSqft: '-1' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ field: 'minSqft', message: 'minSqft cannot be negative' }]);
  });

  it('reports a minSqft that is not a whole number', () => {
    const result = validateQuery({ minSqft: '1.5' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ field: 'minSqft', message: 'minSqft must be a whole number' }]);
  });

  it('reports a minSqft that is not a number', () => {
    const result = validateQuery({ minSqft: 'abc' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([{ field: 'minSqft', message: 'minSqft must be a number' }]);
  });

  it('returns the minSqft error together with another field error', () => {
    const result = validateQuery({ minSqft: 'abc', pageSize: '0' });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual([
      { field: 'minSqft', message: 'minSqft must be a number' },
      { field: 'pageSize', message: 'pageSize must be between 1 and 50' },
    ]);
  });
});
