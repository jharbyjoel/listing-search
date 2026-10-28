import { fetchListings } from '../api.js'
import { buildFirstResultsKey, buildPageKey, loadFromCache, saveToCache } from './listingsCache.js'

// Loads one page of results. Uses the IndexedDB cache when it can, and the API otherwise.
// It returns the same { ok, status, body } shape as fetchListings.

// The API's page size when the user leaves the field empty.
const API_DEFAULT_PAGE_SIZE = 10
// The API's largest allowed page size.
const API_MAX_PAGE_SIZE = 50
// Every search fetches at least this many results up front.
const MINIMUM_PREFETCH_SIZE = 20

// Returns the page number from the query. An empty value means page 1.
function readPageNumber(query) {
  if (query.page === '' || query.page === undefined) {
    return 1
  }
  return Number(query.page)
}

// Returns the page size from the query. An empty value means the API default.
function readPageSize(query) {
  if (query.pageSize === '' || query.pageSize === undefined) {
    return API_DEFAULT_PAGE_SIZE
  }
  return Number(query.pageSize)
}

// True when the paging values are whole numbers the API accepts.
// Other values skip the cache, so the API answers with its 400 error.
function isUsablePaging(pageNumber, pageSize) {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return false
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > API_MAX_PAGE_SIZE) {
    return false
  }
  return true
}

// The prefetch is at least 20 results, and at least one full page of the user's size.
function prefetchSizeFor(pageSize) {
  if (pageSize > MINIMUM_PREFETCH_SIZE) {
    return pageSize
  }
  return MINIMUM_PREFETCH_SIZE
}

// Returns the rows this page should contain, as indexes into the full sorted list.
// The end index is exclusive, and is capped at totalResults for the last page.
function pageRowRange(pageNumber, pageSize, totalResults) {
  const startIndex = (pageNumber - 1) * pageSize
  const endIndex = Math.min(pageNumber * pageSize, totalResults)
  return { startIndex, endIndex }
}

// True when the page can be built from the cached block: every row it needs is in the
// block, or the page has no rows at all because it is past the end.
function pageFitsInBlock(block, pageNumber, pageSize) {
  const { startIndex, endIndex } = pageRowRange(pageNumber, pageSize, block.totalResults)
  if (endIndex <= startIndex) {
    return true
  }
  return endIndex <= block.results.length
}

// Builds the same body the API would return for this page, using only the cached block.
function buildPageFromBlock(block, pageNumber, pageSize) {
  const { startIndex, endIndex } = pageRowRange(pageNumber, pageSize, block.totalResults)
  // Same formula as the backend's paginate(). With 0 results this gives 0 pages.
  const totalPages = Math.ceil(block.totalResults / pageSize)
  return {
    ok: true,
    status: 200,
    body: {
      results: block.results.slice(startIndex, endIndex),
      page: pageNumber,
      pageSize,
      totalResults: block.totalResults,
      totalPages,
    },
  }
}

// Returns the cached first-results block. If it is missing, fetches it and caches it when ok.
async function getFirstResultsBlock(query, prefetchSize) {
  const firstResultsKey = buildFirstResultsKey(query)
  const cachedBlock = await loadFromCache(firstResultsKey)
  if (cachedBlock !== null) {
    return { ok: true, status: 200, body: cachedBlock }
  }
  const firstResults = await fetchListings({ ...query, page: '1', pageSize: String(prefetchSize) })
  if (firstResults.ok) {
    await saveToCache(firstResultsKey, firstResults.body)
  }
  return firstResults
}

// Returns a cached page, or fetches it with the user's page and page size and caches it when ok.
async function getPageFromCacheOrApi(query, pageNumber, pageSize) {
  const pageKey = buildPageKey(query, pageSize, pageNumber)
  const cachedBody = await loadFromCache(pageKey)
  if (cachedBody !== null) {
    return { ok: true, status: 200, body: cachedBody }
  }
  const pageResult = await fetchListings(query)
  if (pageResult.ok) {
    await saveToCache(pageKey, pageResult.body)
  }
  return pageResult
}

// Loads the page described by query (filters, page, pageSize as strings, '' means unset).
export async function loadListingsPage(query) {
  const pageNumber = readPageNumber(query)
  const pageSize = readPageSize(query)
  if (!isUsablePaging(pageNumber, pageSize)) {
    return fetchListings(query)
  }

  const firstResults = await getFirstResultsBlock(query, prefetchSizeFor(pageSize))
  if (!firstResults.ok) {
    return firstResults
  }
  if (pageFitsInBlock(firstResults.body, pageNumber, pageSize)) {
    return buildPageFromBlock(firstResults.body, pageNumber, pageSize)
  }
  return getPageFromCacheOrApi(query, pageNumber, pageSize)
}
