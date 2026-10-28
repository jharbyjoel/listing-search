export const BUDGET_WEIGHT = 0.6;
export const RECENCY_WEIGHT = 0.4;
export const RECENCY_WINDOW_DAYS = 180;
export const OVER_BUDGET_PENALTY = 2;

const MILLISECONDS_PER_DAY = 86400000;

// Budget closeness counts for 60% and recency for 40%. Going over budget is
// penalized twice as hard as going under by the same amount.
export function budgetScore(price, targetBudget) {
  let difference = Math.abs(price - targetBudget) / targetBudget;
  if (price > targetBudget) {
    difference = difference * OVER_BUDGET_PENALTY;
  }
  return Math.max(0, 1 - difference);
}

// Compares calendar days in UTC so the time of day in `now` does not matter.
export function daysSinceListed(listedDate, now) {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const listedAt = Date.parse(listedDate);
  const days = Math.floor((today - listedAt) / MILLISECONDS_PER_DAY);
  if (days < 0) {
    return 0;
  }
  return days;
}

export function recencyScore(listedDate, now) {
  const days = daysSinceListed(listedDate, now);
  return Math.max(0, 1 - days / RECENCY_WINDOW_DAYS);
}

// Returns a number between 0 and 1. Does not modify the listing.
export function scoreListing(listing, targetBudget, now) {
  const recency = recencyScore(listing.listedDate, now);
  if (targetBudget === undefined) {
    return recency;
  }
  const budget = budgetScore(listing.price, targetBudget);
  return BUDGET_WEIGHT * budget + RECENCY_WEIGHT * recency;
}
