// IndexedDB cache for prefetched listing results. Uses the plain browser API.
// Every function here fails quietly: a cache miss or error just means the app calls the API.

const DATABASE_NAME = 'listing-search'
const STORE_NAME = 'listingsCache'
const DATABASE_VERSION = 1

// Scores depend on today's date, so cached results go stale after 5 minutes.
const CACHE_LIFETIME_IN_MILLISECONDS = 5 * 60 * 1000

// The order matters: it fixes the shape of every cache key.
const FILTER_NAMES_IN_KEY_ORDER = [
  'minPrice',
  'maxPrice',
  'minBedrooms',
  'city',
  'keyword',
  'targetBudget',
]

function valueOrEmpty(value) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

function filterValuesFor(filters) {
  const values = []
  for (const filterName of FILTER_NAMES_IN_KEY_ORDER) {
    values.push(valueOrEmpty(filters[filterName]))
  }
  return values
}

// Key for the first 20 results of a search. Page and pageSize are not part of it.
export function buildFirstResultsKey(filters = {}) {
  return JSON.stringify(['first-results', filterValuesFor(filters)])
}

// Key for one page returned by the API. The 'page' prefix keeps it apart from first-results keys.
export function buildPageKey(filters = {}, pageSize, page) {
  return JSON.stringify(['page', filterValuesFor(filters), valueOrEmpty(pageSize), valueOrEmpty(page)])
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const openRequest = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    openRequest.onupgradeneeded = () => {
      createStoreIfMissing(openRequest.result)
    }
    openRequest.onsuccess = () => resolve(openRequest.result)
    openRequest.onerror = () => reject(openRequest.error)
  })
}

function createStoreIfMissing(database) {
  if (!database.objectStoreNames.contains(STORE_NAME)) {
    database.createObjectStore(STORE_NAME)
  }
}

// Opens the database, runs one operation on it, and always closes it again.
async function runOnDatabase(operation) {
  const database = await openDatabase()
  try {
    return await operation(database)
  } finally {
    database.close()
  }
}

function readEntry(database, cacheKey) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const readRequest = transaction.objectStore(STORE_NAME).get(cacheKey)
    readRequest.onsuccess = () => resolve(readRequest.result)
    readRequest.onerror = () => reject(readRequest.error)
  })
}

function writeEntry(database, cacheKey, entry) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(entry, cacheKey)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function isEntryExpired(entry, now) {
  const ageInMilliseconds = now - entry.savedAt
  return ageInMilliseconds > CACHE_LIFETIME_IN_MILLISECONDS
}

// Stores data under cacheKey with the current time. Never throws.
export async function saveToCache(cacheKey, data) {
  try {
    const entry = { data, savedAt: Date.now() }
    await runOnDatabase((database) => writeEntry(database, cacheKey, entry))
  } catch {
    // Saving is optional, so a failure here is ignored.
  }
}

// Returns the cached data, or null if it is missing, expired, or IndexedDB fails. Never throws.
export async function loadFromCache(cacheKey, now = Date.now()) {
  try {
    const entry = await runOnDatabase((database) => readEntry(database, cacheKey))
    if (!entry || isEntryExpired(entry, now)) {
      return null
    }
    return entry.data
  } catch {
    return null
  }
}
