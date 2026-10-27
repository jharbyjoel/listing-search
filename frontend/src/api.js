// Calls GET /api/listings with the given filter and paging params.
// Params whose value is '', null, or undefined are left out of the query string.
export async function fetchListings(params) {
  const searchParams = new URLSearchParams()
  for (const key of Object.keys(params)) {
    const value = params[key]
    if (value !== '' && value !== null && value !== undefined) {
      searchParams.append(key, value)
    }
  }

  const response = await fetch('/api/listings?' + searchParams.toString())
  const body = await response.json()
  return { ok: response.ok, status: response.status, body }
}
