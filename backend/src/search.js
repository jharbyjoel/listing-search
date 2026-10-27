// Filters never change the listings they receive. Each filter is skipped
// when its value is undefined.

function matchesMinPrice(listing, minPrice) {
  return listing.price >= minPrice;
}

function matchesMaxPrice(listing, maxPrice) {
  return listing.price <= maxPrice;
}

function matchesMinBedrooms(listing, minBedrooms) {
  return listing.bedrooms >= minBedrooms;
}

function matchesCity(listing, city) {
  return listing.city.toLowerCase() === city.toLowerCase();
}

function matchesKeyword(listing, keyword) {
  return listing.description.toLowerCase().includes(keyword.toLowerCase());
}

function listingPassesFilters(listing, values) {
  if (values.minPrice !== undefined && !matchesMinPrice(listing, values.minPrice)) {
    return false;
  }
  if (values.maxPrice !== undefined && !matchesMaxPrice(listing, values.maxPrice)) {
    return false;
  }
  if (values.minBedrooms !== undefined && !matchesMinBedrooms(listing, values.minBedrooms)) {
    return false;
  }
  if (values.city !== undefined && !matchesCity(listing, values.city)) {
    return false;
  }
  if (values.keyword !== undefined && !matchesKeyword(listing, values.keyword)) {
    return false;
  }
  return true;
}

// Returns a new array with the listings that pass every provided filter.
export function filterListings(listings, values) {
  const matching = [];
  for (const listing of listings) {
    if (listingPassesFilters(listing, values)) {
      matching.push(listing);
    }
  }
  return matching;
}

// Negative when `first` should come before `second`, positive when after, 0 when tied.
function compareScoreDescending(first, second) {
  return second.score - first.score;
}

function compareListedDateDescending(first, second) {
  if (first.listedDate > second.listedDate) {
    return -1;
  }
  if (first.listedDate < second.listedDate) {
    return 1;
  }
  return 0;
}

function comparePriceAscending(first, second) {
  return first.price - second.price;
}

function compareTextAscending(first, second) {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

// Order: score desc, listedDate desc, price asc, source asc, id asc.
function compareScoredListings(first, second) {
  const byScore = compareScoreDescending(first, second);
  if (byScore !== 0) {
    return byScore;
  }
  const byListedDate = compareListedDateDescending(first, second);
  if (byListedDate !== 0) {
    return byListedDate;
  }
  const byPrice = comparePriceAscending(first, second);
  if (byPrice !== 0) {
    return byPrice;
  }
  const bySource = compareTextAscending(first.source, second.source);
  if (bySource !== 0) {
    return bySource;
  }
  return compareTextAscending(first.id, second.id);
}

// Returns a new sorted array. The input array is not changed.
export function sortScoredListings(scoredListings) {
  return [...scoredListings].sort(compareScoredListings);
}
