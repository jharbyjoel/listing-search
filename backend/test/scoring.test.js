import { describe, it, expect } from 'vitest';
import {
  budgetScore,
  daysSinceListed,
  recencyScore,
  scoreListing,
} from '/opt/nodejs/scoring.js';

const NOW = new Date('2026-10-27T15:00:00Z');

describe('budgetScore', () => {
  it('returns 1 for an exact budget match', () => {
    expect(budgetScore(450000, 450000)).toBe(1);
  });

  it('returns 0.9 when 10% under budget', () => {
    expect(budgetScore(405000, 450000)).toBeCloseTo(0.9);
  });

  it('returns 0.8 when 10% over budget (penalized 2x)', () => {
    expect(budgetScore(495000, 450000)).toBeCloseTo(0.8);
  });

  it('returns 0 when 50% over budget', () => {
    expect(budgetScore(675000, 450000)).toBe(0);
  });

  it('never goes below 0 when far under budget', () => {
    expect(budgetScore(0, 450000)).toBe(0);
  });

  it('never goes below 0 when far over budget', () => {
    expect(budgetScore(2000000, 450000)).toBe(0);
  });
});

describe('daysSinceListed', () => {
  it('returns 0 for a listing from today', () => {
    expect(daysSinceListed('2026-10-27', NOW)).toBe(0);
  });

  it('returns 1 for a listing from yesterday', () => {
    expect(daysSinceListed('2026-10-26', NOW)).toBe(1);
  });

  it('ignores the time of day in now', () => {
    const lateNight = new Date('2026-10-27T23:59:59Z');
    const earlyMorning = new Date('2026-10-27T00:00:01Z');
    expect(daysSinceListed('2026-10-26', lateNight)).toBe(1);
    expect(daysSinceListed('2026-10-26', earlyMorning)).toBe(1);
  });

  it('returns 0 for a listing dated in the future', () => {
    expect(daysSinceListed('2026-11-01', NOW)).toBe(0);
  });
});

describe('recencyScore', () => {
  it('returns 1 for a listing from today', () => {
    expect(recencyScore('2026-10-27', NOW)).toBe(1);
  });

  it('returns 0.5 for a listing 90 days old', () => {
    expect(recencyScore('2026-07-29', NOW)).toBeCloseTo(0.5);
  });

  it('returns 0 for a listing 180 days old', () => {
    expect(recencyScore('2026-04-30', NOW)).toBe(0);
  });

  it('returns 0 for a listing 400 days old', () => {
    expect(recencyScore('2025-09-22', NOW)).toBe(0);
  });
});

describe('scoreListing', () => {
  const listing = { price: 540000, listedDate: '2026-10-17' };

  it('blends budget (60%) and recency (40%) when targetBudget is given', () => {
    // Budget: 20% over, so 1 - 0.2 * 2 = 0.6. Recency: 10 days, so 1 - 10 / 180.
    const expected = 0.6 * 0.6 + 0.4 * (1 - 10 / 180);
    expect(scoreListing(listing, 450000, NOW)).toBeCloseTo(expected);
  });

  it('equals recencyScore when targetBudget is undefined', () => {
    expect(scoreListing(listing, undefined, NOW)).toBe(recencyScore(listing.listedDate, NOW));
  });

  it('does not modify the listing', () => {
    const before = structuredClone(listing);
    scoreListing(listing, 450000, NOW);
    expect(listing).toEqual(before);
  });
});
