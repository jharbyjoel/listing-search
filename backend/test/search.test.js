import { describe, it, expect } from 'vitest';
import { filterListings, sortScoredListings, paginate, searchListings } from '/opt/nodejs/search.js';
import { loadListings } from '/opt/nodejs/loadListings.js';

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

describe('paginate', () => {
  const FIVE_LISTINGS = [
    makeListing({ id: '1' }),
    makeListing({ id: '2' }),
    makeListing({ id: '3' }),
    makeListing({ id: '4' }),
    makeListing({ id: '5' }),
  ];

  it('returns the first page with totals', () => {
    const result = paginate(FIVE_LISTINGS, 1, 2);
    expect(idsOf(result.results)).toEqual(['1', '2']);
    expect(result).toMatchObject({ page: 1, pageSize: 2, totalResults: 5, totalPages: 3 });
  });

  it('returns only the remaining items on the last partial page', () => {
    const result = paginate(FIVE_LISTINGS, 3, 2);
    expect(idsOf(result.results)).toEqual(['5']);
    expect(result).toMatchObject({ totalResults: 5, totalPages: 3 });
  });

  it('returns empty results with correct totals for a page past the end', () => {
    const result = paginate(FIVE_LISTINGS, 10, 2);
    expect(result.results).toEqual([]);
    expect(result).toMatchObject({ page: 10, totalResults: 5, totalPages: 3 });
  });

  it('returns all items on one page when pageSize is larger than the total', () => {
    const result = paginate(FIVE_LISTINGS, 1, 50);
    expect(idsOf(result.results)).toEqual(['1', '2', '3', '4', '5']);
    expect(result).toMatchObject({ totalResults: 5, totalPages: 1 });
  });

  it('returns zero totals when there are no items', () => {
    const result = paginate([], 1, 10);
    expect(result).toMatchObject({ results: [], totalResults: 0, totalPages: 0 });
  });
});

describe('searchListings', () => {
  const NOW = new Date('2026-10-27T00:00:00Z');

  // Defaults match the API defaults (page 1, pageSize 10). Override as needed.
  function searchValues(overrides) {
    return { page: 1, pageSize: 10, ...overrides };
  }

  it('returns all 12 sample listings with no filters, scored 0 to 1 and sorted by score descending', () => {
    const result = searchListings(loadListings(), searchValues({ pageSize: 50 }), NOW);
    expect(result.totalResults).toBe(12);
    for (const listing of result.results) {
      expect(listing.score).toBeGreaterThanOrEqual(0);
      expect(listing.score).toBeLessThanOrEqual(1);
    }
    for (let index = 1; index < result.results.length; index++) {
      expect(result.results[index - 1].score).toBeGreaterThanOrEqual(result.results[index].score);
    }
  });

  it('returns only Reston listings for the city filter', () => {
    const result = searchListings(loadListings(), searchValues({ city: 'reston' }), NOW);
    expect(result.totalResults).toBeGreaterThan(0);
    for (const listing of result.results) {
      expect(listing.city).toBe('Reston');
    }
  });

  it('returns empty results and zero totals when no listing matches', () => {
    const result = searchListings(loadListings(), searchValues({ minPrice: 9000000 }), NOW);
    expect(result).toMatchObject({ results: [], totalResults: 0, totalPages: 0 });
  });

  // A1 is priced exactly at the 450000 target and listed 59 days before NOW.
  // A4 is priced 610000 (far over budget) and listed 54 days before NOW.
  // A1 ranks higher because budget closeness is worth 60% of the score.
  it('ranks the listing at the target budget (A1) above a recent listing far over it (A4)', () => {
    const result = searchListings(loadListings(), searchValues({ targetBudget: 450000, pageSize: 50 }), NOW);
    const ids = idsOf(result.results);
    expect(ids.indexOf('A1')).toBeLessThan(ids.indexOf('A4'));
  });

  it('does not add a score to the original listings', () => {
    const listings = loadListings();
    searchListings(listings, searchValues({ targetBudget: 450000 }), NOW);
    for (const listing of listings) {
      expect(listing).not.toHaveProperty('score');
    }
  });
});

describe('searchListings minSqft', () => {
  const NOW = new Date('2026-10-27T00:00:00Z');

  function searchValues(overrides) {
    return { page: 1, pageSize: 50, ...overrides };
  }

  it('keeps only listings with sqft at or above minSqft', () => {
    const result = searchListings(loadListings(), searchValues({ minSqft: 1500 }), NOW);
    expect(idsOf(result.results).sort()).toEqual(['A4', 'A6', 'A7', 'B10']);
  });

  it('includes a listing whose sqft equals minSqft', () => {
    const result = searchListings(loadListings(), searchValues({ minSqft: 1300 }), NOW);
    const ids = idsOf(result.results);
    expect(ids).toContain('A5');
    expect(ids).toContain('B11');
  });

  it('combines minSqft with another filter', () => {
    const result = searchListings(loadListings(), searchValues({ minBedrooms: 4, minSqft: 2000 }), NOW);
    expect(idsOf(result.results)).toEqual(['A4']);
  });

  it('returns no results when minSqft is larger than every listing', () => {
    const result = searchListings(loadListings(), searchValues({ minSqft: 999999 }), NOW);
    expect(result).toMatchObject({ results: [], totalResults: 0, totalPages: 0 });
  });

  it('does not change the score of listings', () => {
    const withoutFilter = searchListings(loadListings(), searchValues({ targetBudget: 450000 }), NOW);
    const withFilter = searchListings(loadListings(), searchValues({ targetBudget: 450000, minSqft: 1500 }), NOW);
    const scoreById = new Map(withoutFilter.results.map((listing) => [listing.id, listing.score]));
    for (const listing of withFilter.results) {
      expect(listing.score).toBe(scoreById.get(listing.id));
    }
  });
});
