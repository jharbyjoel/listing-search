// Server-side validation of raw query-string values.
// The frontend keeps its own copy in frontend/src/utility/validateQuery.js.
// Both copies must implement the same rules, so change them together.

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

// Returns the trimmed string, or undefined when the value is missing or blank.
function cleanString(rawValue) {
  if (rawValue === undefined) {
    return undefined;
  }
  const trimmed = rawValue.trim();
  if (trimmed === '') {
    return undefined;
  }
  return trimmed;
}

// Checks one numeric field. Each field reports at most one error, checked in
// this order: is a number, is a whole number (if required), is in range.
function checkNumber(field, rawValue, errors, rule, defaultValue) {
  const text = cleanString(rawValue);
  if (text === undefined) {
    return defaultValue;
  }

  const number = Number(text);
  if (!Number.isFinite(number)) {
    errors.push({ field, message: `${field} must be a number` });
    return undefined;
  }

  if (rule.wholeNumber && !Number.isInteger(number)) {
    errors.push({ field, message: `${field} must be a whole number` });
    return undefined;
  }

  if (!rule.isInRange(number)) {
    errors.push({ field, message: rule.rangeMessage });
    return undefined;
  }

  return number;
}

export function validateQuery(query) {
  const errors = [];

  const minPrice = checkNumber('minPrice', query.minPrice, errors, {
    wholeNumber: false,
    isInRange: (number) => number >= 0,
    rangeMessage: 'minPrice cannot be negative',
  });

  const maxPrice = checkNumber('maxPrice', query.maxPrice, errors, {
    wholeNumber: false,
    isInRange: (number) => number >= 0,
    rangeMessage: 'maxPrice cannot be negative',
  });

  const minBedrooms = checkNumber('minBedrooms', query.minBedrooms, errors, {
    wholeNumber: true,
    isInRange: (number) => number >= 0,
    rangeMessage: 'minBedrooms cannot be negative',
  });

  const targetBudget = checkNumber('targetBudget', query.targetBudget, errors, {
    wholeNumber: false,
    isInRange: (number) => number > 0,
    rangeMessage: 'targetBudget must be greater than 0',
  });

  const page = checkNumber('page', query.page, errors, {
    wholeNumber: true,
    isInRange: (number) => number >= 1,
    rangeMessage: 'page must be 1 or greater',
  }, DEFAULT_PAGE);

  const pageSize = checkNumber('pageSize', query.pageSize, errors, {
    wholeNumber: true,
    isInRange: (number) => number >= 1 && number <= 50,
    rangeMessage: 'pageSize must be between 1 and 50',
  }, DEFAULT_PAGE_SIZE);

  // Only compared when both prices are valid numbers.
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    errors.push({ field: 'minPrice', message: 'minPrice cannot be greater than maxPrice' });
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: {
      minPrice,
      maxPrice,
      minBedrooms,
      targetBudget,
      city: cleanString(query.city),
      keyword: cleanString(query.keyword),
      page,
      pageSize,
    },
  };
}
