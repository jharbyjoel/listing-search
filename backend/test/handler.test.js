import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handler } from '../src/handler.js';
import { searchListings } from '../src/search.js';

// Real searchListings by default. The 500 test makes it throw once.
vi.mock('../src/search.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, searchListings: vi.fn(actual.searchListings) };
});

const EXPECTED_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

function makeEvent(queryStringParameters) {
  return { queryStringParameters };
}

async function callHandler(queryStringParameters) {
  const response = await handler(makeEvent(queryStringParameters));
  return { response, body: JSON.parse(response.body) };
}

describe('handler', () => {
  it('returns the first page of all listings when there are no query parameters', async () => {
    const { response, body } = await callHandler(null);

    expect(response.statusCode).toBe(200);
    expect(body.totalResults).toBe(12);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.results).toHaveLength(10);
  });

  it('applies filters from the query string', async () => {
    const { response, body } = await callHandler({ city: 'Reston' });

    expect(response.statusCode).toBe(200);
    expect(body.results.length).toBeGreaterThan(0);
    for (const listing of body.results) {
      expect(listing.city).toBe('Reston');
    }
  });

  it('matches the city ignoring case', async () => {
    const { response, body } = await callHandler({ city: 'reston' });

    expect(response.statusCode).toBe(200);
    expect(body.results.length).toBeGreaterThan(0);
    for (const listing of body.results) {
      expect(listing.city).toBe('Reston');
    }
  });

  it('returns 400 with a city error for a city that has no listings', async () => {
    const { response, body } = await callHandler({ city: 'Atlantis' });

    expect(response.statusCode).toBe(400);
    expect(body).toEqual({
      error: 'VALIDATION_ERROR',
      details: [{ field: 'city', message: 'No listings found in city "Atlantis"' }],
    });
  });

  it('returns both the city error and another invalid field error together', async () => {
    const { response, body } = await callHandler({ city: 'Atlantis', pageSize: '0' });

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.details).toEqual([
      { field: 'pageSize', message: 'pageSize must be between 1 and 50' },
      { field: 'city', message: 'No listings found in city "Atlantis"' },
    ]);
  });

  it('returns 400 when minPrice is greater than maxPrice', async () => {
    const { response, body } = await callHandler({ minPrice: '600000', maxPrice: '400000' });

    expect(response.statusCode).toBe(400);
    expect(body.details).toEqual([
      { field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' },
    ]);
  });

  it('returns 400 when pageSize is 0', async () => {
    const { response, body } = await callHandler({ pageSize: '0' });

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with empty results when the page is past the end', async () => {
    const { response, body } = await callHandler({ page: '99' });

    expect(response.statusCode).toBe(200);
    expect(body.results).toEqual([]);
    expect(body.totalPages).toBe(2);
  });

  it('returns 200 with zero results when valid filters match nothing', async () => {
    const { response, body } = await callHandler({ city: 'Reston', minPrice: '9000000' });

    expect(response.statusCode).toBe(200);
    expect(body.totalResults).toBe(0);
  });

  it('sets the CORS and content type headers on every response', async () => {
    const okResponse = await handler(makeEvent(null));
    const badRequestResponse = await handler(makeEvent({ pageSize: '0' }));

    expect(okResponse.headers).toEqual(EXPECTED_HEADERS);
    expect(badRequestResponse.headers).toEqual(EXPECTED_HEADERS);
  });
});

describe('handler when the search throws', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.mocked(searchListings).mockClear();
  });

  it('returns 500 with a generic message and logs the real error', async () => {
    const internalError = new Error('database exploded');
    vi.mocked(searchListings).mockImplementationOnce(() => {
      throw internalError;
    });

    const { response, body } = await callHandler({});

    expect(response.statusCode).toBe(500);
    expect(body).toEqual({
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong on the server.',
    });
    expect(response.headers).toEqual(EXPECTED_HEADERS);
    expect(consoleErrorSpy).toHaveBeenCalledWith(internalError);
  });
});
