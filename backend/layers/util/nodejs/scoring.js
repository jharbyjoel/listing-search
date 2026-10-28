// How a listing is scored (0 to 1, shown as 0 to 100 in the UI):
//
//   budgetScore  = max(0, 1 - k * |price - targetBudget| / targetBudget)
//                  k = 2 when the price is over budget, otherwise 1
//   recencyScore = max(0, 1 - daysOld / 180)
//   score        = 0.6 * budgetScore + 0.4 * recencyScore  (targetBudget given)
//                = recencyScore                             (no targetBudget)
//
// Why this approach:
// - The budget difference is a percentage of the budget, so being 5% off
//   counts the same whether the budget is $400k or $600k.
// - Going over budget is penalized twice as hard as going under, because
//   buyers can usually spend less but often cannot spend more.
// - Budget fit gets 60% and recency 40%, so a newer listing cannot outrank
//   one that fits the budget much better.
// - The 180-day window keeps a useful spread of recency scores for the
//   sample data (listed Jul 28 to Sep 4, 2026). Older listings score 0
//   for recency.
// - Without a targetBudget there is nothing to compare the price to, so
//   the score is recency alone (newest first).
// - minPrice and maxPrice are filters, not part of the score: they decide
//   which listings appear, and the score decides their order.

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
