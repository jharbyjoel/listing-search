// Converts between the search form values and the URL query string.

export const FILTER_FIELDS = ['minPrice', 'maxPrice', 'minBedrooms', 'city', 'keyword', 'targetBudget', 'pageSize']

// Reads the filter fields and page from a query string such as window.location.search.
// Missing values come back as '' so the form can use them directly.
export function readQueryFromUrl(search) {
  const params = new URLSearchParams(search)
  const query = {}
  const keys = [...FILTER_FIELDS, 'page']
  for (const key of keys) {
    const value = params.get(key)
    if (value === null) {
      query[key] = ''
    } else {
      query[key] = value
    }
  }
  return query
}

// Builds a query string such as '?city=Reston&page=2'.
// Keys whose value is '' or undefined are left out. Returns '' when nothing is set.
export function buildUrlSearch(query) {
  const params = new URLSearchParams()
  for (const key of Object.keys(query)) {
    const value = query[key]
    if (value !== '' && value !== undefined) {
      params.append(key, value)
    }
  }

  const text = params.toString()
  if (text === '') {
    return ''
  }
  return '?' + text
}
