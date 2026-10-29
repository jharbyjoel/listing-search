// Validates raw search form / query-string values.
// This file is a copy of backend/layers/validation/nodejs/validateQuery.js.
// Keep the two copies identical: both implement the rules in PLAN.md.

const NUMERIC_FIELDS = ['minPrice', 'maxPrice', 'minBedrooms', 'minSqft', 'targetBudget', 'page', 'pageSize']
const WHOLE_NUMBER_FIELDS = ['minBedrooms', 'minSqft', 'page', 'pageSize']
const MAX_PAGE_SIZE = 50

// Returns the trimmed string, or undefined when the value is missing or blank.
function providedText(raw) {
  if (raw === undefined || raw === null) {
    return undefined
  }
  const trimmed = String(raw).trim()
  if (trimmed === '') {
    return undefined
  }
  return trimmed
}

// Returns the error message for a parsed number, or null when it is acceptable.
function numberError(field, number) {
  if (!Number.isFinite(number)) {
    return `${field} must be a number`
  }
  if (WHOLE_NUMBER_FIELDS.includes(field) && !Number.isInteger(number)) {
    return `${field} must be a whole number`
  }
  return rangeError(field, number)
}

// Returns the error message for a number that is outside the allowed range, or null.
function rangeError(field, number) {
  if ((field === 'minPrice' || field === 'maxPrice' || field === 'minBedrooms' || field === 'minSqft') && number < 0) {
    return `${field} cannot be negative`
  }
  if (field === 'targetBudget' && number <= 0) {
    return 'targetBudget must be greater than 0'
  }
  if (field === 'page' && number < 1) {
    return 'page must be 1 or greater'
  }
  if (field === 'pageSize' && (number < 1 || number > MAX_PAGE_SIZE)) {
    return `pageSize must be between 1 and ${MAX_PAGE_SIZE}`
  }
  return null
}

// Returns the default used when a numeric field is not provided.
function defaultValue(field) {
  if (field === 'page') {
    return 1
  }
  if (field === 'pageSize') {
    return 10
  }
  return undefined
}

export function validateQuery(query) {
  const errors = []
  const values = {}

  for (const field of NUMERIC_FIELDS) {
    const text = providedText(query[field])
    if (text === undefined) {
      values[field] = defaultValue(field)
      continue
    }

    const number = Number(text)
    const error = numberError(field, number)
    if (error === null) {
      values[field] = number
    } else {
      values[field] = undefined
      errors.push({ field, message: error })
    }
  }

  // Only compare when both prices passed their own checks.
  if (values.minPrice !== undefined && values.maxPrice !== undefined && values.minPrice > values.maxPrice) {
    errors.push({ field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' })
  }

  values.city = providedText(query.city)
  values.keyword = providedText(query.keyword)

  return {
    isValid: errors.length === 0,
    errors,
    values,
  }
}
