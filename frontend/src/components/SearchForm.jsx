import { useState } from 'react'
import { FILTER_FIELDS } from '../utility/urlQuery.js'
import { validateQuery } from '../utility/validateQuery.js'

const FIELD_LABELS = {
  minPrice: 'Min price',
  maxPrice: 'Max price',
  minBedrooms: 'Min bedrooms',
  minSqft: 'Min sq ft',
  city: 'City',
  keyword: 'Keyword',
  targetBudget: 'Target budget',
  pageSize: 'Page size',
}

const NUMERIC_FIELDS = ['minPrice', 'maxPrice', 'minBedrooms', 'minSqft', 'targetBudget', 'pageSize']

// Copies the initial values into a complete object with every filter field set.
function formValuesFrom(initialValues) {
  const formValues = {}
  for (const field of FILTER_FIELDS) {
    const value = initialValues[field]
    if (value === undefined) {
      formValues[field] = ''
    } else {
      formValues[field] = value
    }
  }
  return formValues
}

// Turns the validation error list into an object keyed by field name.
function errorsByField(errors) {
  const byField = {}
  for (const error of errors) {
    byField[error.field] = error.message
  }
  return byField
}

function SearchForm({ initialValues, fieldErrors, onSearch }) {
  const [formValues, setFormValues] = useState(() => formValuesFrom(initialValues))
  const [localErrors, setLocalErrors] = useState({})

  function handleChange(event) {
    const { name, value } = event.target
    setFormValues({ ...formValues, [name]: value })
  }

  function handleSubmit(event) {
    event.preventDefault()
    const result = validateQuery(formValues)
    setLocalErrors(errorsByField(result.errors))
    if (!result.isValid) {
      return
    }
    onSearch(formValues)
  }

  // Shows the local validation message first, then any server error for the field.
  function errorFor(field) {
    if (localErrors[field] !== undefined) {
      return localErrors[field]
    }
    if (fieldErrors[field] !== undefined) {
      return fieldErrors[field]
    }
    return undefined
  }

  return (
    <form onSubmit={handleSubmit}>
      {FILTER_FIELDS.map((field) => {
        const message = errorFor(field)
        const inputType = NUMERIC_FIELDS.includes(field) ? 'number' : 'text'
        const minimum = NUMERIC_FIELDS.includes(field) ? '0' : undefined
        return (
          <div key={field}>
            <label htmlFor={field}>{FIELD_LABELS[field]}</label>
            <input
              id={field}
              name={field}
              type={inputType}
              min={minimum}
              value={formValues[field]}
              onChange={handleChange}
            />
            {message !== undefined && <p role="alert">{message}</p>}
          </div>
        )
      })}
      <button type="submit">Search</button>
    </form>
  )
}

export default SearchForm
