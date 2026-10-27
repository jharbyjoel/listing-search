import { useEffect, useState } from 'react'
import Pagination from './components/Pagination.jsx'
import ResultsTable from './components/ResultsTable.jsx'
import SearchForm from './components/SearchForm.jsx'
import { fetchListings } from './api.js'
import { buildUrlSearch, readQueryFromUrl } from './utility/urlQuery.js'

// Turns the server's 400 details list into an object keyed by field name.
function fieldErrorsFrom(details) {
  const byField = {}
  for (const detail of details) {
    byField[detail.field] = detail.message
  }
  return byField
}

// True when at least one filter or page value in the query is non-empty.
function hasAnyValue(query) {
  for (const key of Object.keys(query)) {
    if (query[key] !== '') {
      return true
    }
  }
  return false
}

function App() {
  const [initialQuery] = useState(() => readQueryFromUrl(window.location.search))
  // A URL with values is already the submitted query, so pagination works after the first search.
  const [submittedQuery, setSubmittedQuery] = useState(() =>
    hasAnyValue(initialQuery) ? initialQuery : null,
  )
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  async function runSearch(query) {
    setIsLoading(true)
    setErrorMessage(null)
    setFieldErrors({})
    try {
      const result = await fetchListings(query)
      if (result.ok) {
        setResponse(result.body)
      } else if (result.status === 400) {
        setFieldErrors(fieldErrorsFrom(result.body.details))
        setResponse(null)
      } else if (result.body.message) {
        setErrorMessage(result.body.message)
      } else {
        setErrorMessage('Something went wrong. Please try again.')
      }
    } catch {
      setErrorMessage('Could not reach the server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearch(formValues) {
    const query = { ...formValues, page: '1' }
    window.history.pushState(null, '', buildUrlSearch(query))
    setSubmittedQuery(query)
    runSearch(query)
  }

  function handlePageChange(newPage) {
    const query = { ...submittedQuery, page: String(newPage) }
    window.history.pushState(null, '', buildUrlSearch(query))
    setSubmittedQuery(query)
    runSearch(query)
  }

  // Runs once on first render so a refreshed or shared URL shows its results.
  // The empty dependency list is deliberate: later searches start from the form and the pagination buttons.
  useEffect(() => {
    if (hasAnyValue(initialQuery)) {
      runSearch(initialQuery)
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function renderResultsArea() {
    if (isLoading) {
      return <p>Loading…</p>
    }
    if (errorMessage) {
      return <p role="alert">{errorMessage}</p>
    }
    if (response === null) {
      return null
    }
    if (response.totalResults === 0) {
      return <p>No listings match your filters.</p>
    }

    const pagination = (
      <Pagination
        page={response.page}
        totalPages={response.totalPages}
        isLoading={isLoading}
        onPageChange={handlePageChange}
      />
    )
    if (response.results.length === 0) {
      return (
        <>
          <p>No results on this page.</p>
          {pagination}
        </>
      )
    }
    return (
      <>
        <ResultsTable results={response.results} />
        {pagination}
      </>
    )
  }

  return (
    <>
      <h1>Listing Search</h1>
      <SearchForm initialValues={initialQuery} fieldErrors={fieldErrors} onSearch={handleSearch} />
      {renderResultsArea()}
    </>
  )
}

export default App
