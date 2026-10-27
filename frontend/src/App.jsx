import { useState } from 'react'
import SearchForm from './components/SearchForm.jsx'
import { buildUrlSearch, readQueryFromUrl } from './utility/urlQuery.js'

function App() {
  const [initialQuery] = useState(() => readQueryFromUrl(window.location.search))
  const [submittedQuery, setSubmittedQuery] = useState(null)

  function handleSearch(formValues) {
    const query = { ...formValues, page: '1' }
    window.history.pushState(null, '', buildUrlSearch(query))
    setSubmittedQuery(query)
  }

  return (
    <>
      <h1>Listing Search</h1>
      <SearchForm initialValues={initialQuery} fieldErrors={{}} onSearch={handleSearch} />
    </>
  )
}

export default App
