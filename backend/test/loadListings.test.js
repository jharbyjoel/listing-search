import { describe, it, expect } from 'vitest';
import { loadListings } from '../src/loadListings.js';

describe('loadListings', () => {
  it('returns the 12 sample listings', () => {
    const listings = loadListings();
    expect(listings).toHaveLength(12);
  });

  it('returns listings with the expected fields', () => {
    const listing = loadListings()[0];
    expect(listing).toMatchObject({
      id: 'A1',
      source: 'MLS_A',
      address: '123 Main St, Apt 4B',
      city: 'Springfield',
      state: 'VA',
      zip: '22150',
      price: 450000,
      bedrooms: 2,
      bathrooms: 1.5,
      sqft: 980,
      latitude: 38.7893,
      longitude: -77.1873,
      listedDate: '2026-08-29',
      status: 'active',
    });
    expect(listing.description).toEqual(expect.any(String));
  });

  it('does not let mutating the returned array affect the next call', () => {
    const first = loadListings();
    first.pop();
    first.push({ id: 'fake' });

    const second = loadListings();
    expect(second).toHaveLength(12);
    expect(second.some((listing) => listing.id === 'fake')).toBe(false);
  });
});
