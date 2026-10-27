import listings from '../data/sample_listings.json' with { type: 'json' };

// Returns a copy so callers cannot change the module's data.
export function loadListings() {
  return [...listings];
}
