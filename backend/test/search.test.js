import { describe, it, expect } from 'vitest';
import { filterListings, sortScoredListings } from '../src/search.js';

function makeListing(overrides) {
  return {
    id: 'X1',
    source: 'MLS_A',
    city: 'Springfield',
    price: 400000,
    bedrooms: 2,
    listedDate: '2026-09-01',
    description: 'Quiet house with a garden.',
    ...overrides,
  };
}

const LISTINGS = [
  makeListing({ id: 'A', city: 'Springfield', price: 300000, bedrooms: 1, description: 'Small condo near transit.' }),
  makeListing({ id: 'B', city: 'Riverton', price: 400000, bedrooms: 2, description: 'Pet friendly townhouse.' }),
  makeListing({ id: 'C', city: 'Lakeside', price: 500000, bedrooms: 3, description: 'Large family home.' }),
];

function idsOf(listings) {
  return listings.map((listing) => listing.id);
}

describe('filterListings', () => {
  it('returns all listings when no filters are given', () => {
    expect(idsOf(filterListings(LISTINGS, {}))).toEqual(['A', 'B', 'C']);
  });

  it('returns all listings when every filter is undefined', () => {
    const values = { minPrice: undefined, maxPrice: undefined, minBedrooms: undefined, city: undefined, keyword: undefined };
    expect(idsOf(filterListings(LISTINGS, values))).toEqual(['A', 'B', 'C']);
  });

  it('filters by minPrice and includes a price equal to minPrice', () => {
    expect(idsOf(filterListings(LISTINGS, { minPrice: 400000 }))).toEqual(['B', 'C']);
  });

  it('filters by maxPrice and includes a price equal to maxPrice', () => {
    expect(idsOf(filterListings(LISTINGS, { maxPrice: 400000 }))).toEqual(['A', 'B']);
  });

  it('filters by minBedrooms, including the exact number', () => {
    expect(idsOf(filterListings(LISTINGS, { minBedrooms: 2 }))).toEqual(['B', 'C']);
  });

  it('filters by city, ignoring case', () => {
    expect(idsOf(filterListings(LISTINGS, { city: 'springFIELD' }))).toEqual(['A']);
  });

  it('does not match a partial city name', () => {
    expect(filterListings(LISTINGS, { city: 'Spring' })).toEqual([]);
  });

  it('filters by keyword, ignoring case and matching a substring', () => {
    expect(idsOf(filterListings(LISTINGS, { keyword: 'PET' }))).toEqual(['B']);
  });

  it('combines several filters', () => {
    const values = { minPrice: 350000, maxPrice: 500000, minBedrooms: 2, keyword: 'home' };
    expect(idsOf(filterListings(LISTINGS, values))).toEqual(['C']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterListings(LISTINGS, { city: 'Nowhere' })).toEqual([]);
  });

  it('does not change the input array or its listings', () => {
    const before = structuredClone(LISTINGS);
    const result = filterListings(LISTINGS, { minPrice: 350000 });
    expect(LISTINGS).toEqual(before);
    expect(result).not.toBe(LISTINGS);
  });
});

describe('sortScoredListings', () => {
  it('sorts by score, highest first', () => {
    const input = [
      makeListing({ id: 'low', score: 0.2 }),
      makeListing({ id: 'high', score: 0.9 }),
      makeListing({ id: 'mid', score: 0.5 }),
    ];
    expect(idsOf(sortScoredListings(input))).toEqual(['high', 'mid', 'low']);
  });

  it('breaks score ties by newer listedDate first', () => {
    const input = [
      makeListing({ id: 'older', score: 0.5, listedDate: '2026-08-01' }),
      makeListing({ id: 'newer', score: 0.5, listedDate: '2026-09-01' }),
    ];
    expect(idsOf(sortScoredListings(input))).toEqual(['newer', 'older']);
  });

  it('breaks score and date ties by lower price first', () => {
    const input = [
      makeListing({ id: 'expensive', score: 0.5, listedDate: '2026-09-01', price: 500000 }),
      makeListing({ id: 'cheap', score: 0.5, listedDate: '2026-09-01', price: 300000 }),
    ];
    expect(idsOf(sortScoredListings(input))).toEqual(['cheap', 'expensive']);
  });

  it('breaks ties on score, date and price by source ascending', () => {
    const input = [
      makeListing({ id: 'B1', source: 'MLS_B', score: 0.5 }),
      makeListing({ id: 'A1', source: 'MLS_A', score: 0.5 }),
    ];
    expect(idsOf(sortScoredListings(input))).toEqual(['A1', 'B1']);
  });

  it('breaks ties on everything else by id ascending', () => {
    const input = [
      makeListing({ id: 'A2', source: 'MLS_A', score: 0.5 }),
      makeListing({ id: 'A1', source: 'MLS_A', score: 0.5 }),
    ];
    expect(idsOf(sortScoredListings(input))).toEqual(['A1', 'A2']);
  });

  it('returns a new array and does not change the input order', () => {
    const input = [
      makeListing({ id: 'low', score: 0.2 }),
      makeListing({ id: 'high', score: 0.9 }),
    ];
    const before = structuredClone(input);
    const result = sortScoredListings(input);
    expect(result).not.toBe(input);
    expect(input).toEqual(before);
  });
});
