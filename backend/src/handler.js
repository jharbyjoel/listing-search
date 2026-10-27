import { validateQuery } from '/opt/nodejs/validateQuery.js';
import { loadListings } from './loadListings.js';
import { searchListings } from './search.js';

// Builds an API Gateway proxy response with the JSON body and CORS headers.
function jsonResponse(statusCode, bodyObject) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    },
    body: JSON.stringify(bodyObject),
  };
}

// True when at least one listing is in the given city (case-insensitive).
function cityExists(listings, city) {
  const wantedCity = city.toLowerCase();
  for (const listing of listings) {
    if (listing.city.toLowerCase() === wantedCity) {
      return true;
    }
  }
  return false;
}

// The city check needs the dataset, so it runs here and not in the layer.
function cityErrors(listings, values) {
  if (values.city === undefined || cityExists(listings, values.city)) {
    return [];
  }
  return [{ field: 'city', message: `No listings found in city "${values.city}"` }];
}

export async function handler(event) {
  try {
    const query = event.queryStringParameters || {};
    const validation = validateQuery(query);
    const listings = loadListings();
    const errors = [...validation.errors, ...cityErrors(listings, validation.values)];

    if (errors.length > 0) {
      return jsonResponse(400, { error: 'VALIDATION_ERROR', details: errors });
    }

    return jsonResponse(200, searchListings(listings, validation.values, new Date()));
  } catch (error) {
    // Log the real error for the server logs, but never send its text to the client.
    console.error(error);
    return jsonResponse(500, {
      error: 'INTERNAL_ERROR',
      message: 'Something went wrong on the server.',
    });
  }
}
