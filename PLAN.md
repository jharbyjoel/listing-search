# Listing Search Service — Implementation Plan

Decisions from the planning session. Source brief: `Coding_Test_Question_Paper.pdf` + `Instructions.pdf`.

## Stack

| Layer | Choice |
|---|---|
| Backend | Node.js Lambda handler, run locally with `sam local start-api` (Docker) |
| Data | `sample_listings.json` bundled with the function, loaded in memory once per cold start — no database |
| Frontend | Vite + React (JavaScript), plain React state + `fetch`, minimal CSS |
| Tests | Vitest in both projects; React Testing Library for the frontend |
| Deploy (optional, later) | API Gateway + Lambda; UI on S3 + CloudFront |

Known deviation: the brief lists Python/Go/Java for the backend; JavaScript was chosen deliberately. Have a one-line rationale ready.

## Repo layout

Separate projects (no workspaces):

```
listing-search/
├── backend/
│   ├── package.json
│   ├── template.yaml              # SAM: function (esbuild) + ValidationLayer + UtilLayer
│   ├── vitest.config.js           # aliases /opt/nodejs/* → local layer files for local tests
│   ├── layers/validation/nodejs/validateQuery.js   # Lambda layer: server-side validation
│   ├── layers/util/nodejs/        # Lambda layer: data loading and search
│   │   ├── loadListings.js
│   │   ├── search.js              # filter → score → sort → paginate (pure; `now` injected)
│   │   ├── scoring.js
│   │   └── data/sample_listings.json
│   ├── lambda/get-listings/handler.js   # thin wrapper: parse query → validate (from layer) → search → JSON
│   └── test/
├── frontend/
│   ├── package.json
│   ├── vite.config.js             # /api proxy → localhost:3000
│   ├── src/utility/validateQuery.js   # client-side validation (separate copy of the rules)
│   ├── src/utility/listingsCache.js   # IndexedDB cache for prefetched results
│   ├── src/
│   └── test/
└── README.md                      # setup, API, scoring, trade-offs
```

## Search pipeline

`load → filter → score → sort → paginate`, each a small pure function. A future dedup/merge step slots in after `load`.

### Filters
- `minPrice`, `maxPrice` — inclusive bounds on `price`
- `minBedrooms` — `bedrooms >= n`
- `city` — trimmed, case-insensitive exact match
- `keyword` — trimmed, case-insensitive substring of `description`
- All statuses (active / pending / sold) are returned; status is displayed in the UI

### Scoring
```
budgetScore  = max(0, 1 − k × |price − targetBudget| / targetBudget)
               k = 2 if price > targetBudget (over budget penalized harder), else 1
recencyScore = max(0, 1 − daysOld / 180)
score        = targetBudget given ? 0.6 × budgetScore + 0.4 × recencyScore
                                  : recencyScore
```
- Stored as 0–1, displayed as 0–100.
- `now` is a function parameter (defaults to the real current date) so tests are deterministic.
- Window is 180 days so the sample data (Jul 28 – Sep 4, 2026) keeps meaningful recency spread.

### Sort / tie-break
score desc → `listedDate` desc → `price` asc → `source` asc → `id` asc. Fully deterministic, so pages never shuffle.

### Duplicates
Cross-feed duplicates (A1/B7, A2/B8, A3/B9, A5/B11) are **shown as separate listings** and documented in the README as a known limitation / likely extension.

## API

```
GET /listings?minPrice=&maxPrice=&minBedrooms=&city=&keyword=&targetBudget=&page=1&pageSize=10

200 → { results: [{ ...listing, score }], page, pageSize, totalResults, totalPages }
400 → { error: "VALIDATION_ERROR", details: [{ field, message }] }
500 → { error: "INTERNAL_ERROR", message }
```
CORS headers returned from the Lambda (for the deployed case).

### Validation (collects all errors)

Server-side validation lives in a **Lambda layer** (`backend/layers/validation/nodejs/validateQuery.js`). The handler imports it from `/opt/nodejs/validateQuery.js` (the layer's path inside Lambda); `template.yaml` marks `/opt/nodejs/*` as external for esbuild, and `backend/vitest.config.js` aliases those paths to the local layer files so tests run without SAM.

The frontend has its **own copy** of the same rules in `frontend/src/utility/validateQuery.js`. The two files are intentionally separate (no shared import). Both must implement the rules below identically, and each has its own tests.

Rules:
- Numeric params must parse as finite numbers, no negatives; `minBedrooms`, `page`, `pageSize` integers
- `targetBudget` > 0 if given
- `minPrice > maxPrice` → 400
- `page` ≥ 1; `pageSize` 1–50 (≤ 0 or > 50 → 400, no silent clamp)
- `city` that matches **no listing in the dataset at all** → 400 (checked in the handler, since it needs data)
- Page past the end → 200, empty `results`, correct `totalPages`
- Unknown query params ignored

## Frontend

- Single page: filter form (minPrice, maxPrice, minBedrooms, city, keyword, targetBudget, pageSize) + results table (address, city, price, beds, baths, status, listed date, score) + Prev/Next with "Page X of Y"
- Filters + page **synced to the URL** query string (refresh/share keeps state)
- Search fires on **Search button submit**; page changes come from the browser cache where possible (see below)
  - On Search, one call to the existing API with `page=1&pageSize=20`. Its results and `totalResults` are stored in IndexedDB (`src/utility/listingsCache.js`, plain browser API, no wrapper library). Cache key = filter values only (minPrice, maxPrice, minBedrooms, city, keyword, targetBudget), not page or pageSize
  - A page whose rows all fall within the first 20 results is built from the prefetched 20, with no API call. `totalPages` is computed from `totalResults` and the user's pageSize
  - Any other page (it needs a row past result 20, the last page included, or it straddles the 20 boundary, e.g. pageSize 7, page 3) calls the API with the user's pageSize, as today. The response is cached in IndexedDB keyed by filters + pageSize + page
  - Cache entries expire after 5 minutes (scores depend on today's date) and are refetched after that. New filters mean a new cache key
  - If IndexedDB is unavailable or throws, the UI falls back to normal API calls
  - A refreshed or shared URL (e.g. `?page=2`) uses the cache when present, otherwise fetches
  - No backend/API change. `fake-indexeddb` is a frontend devDependency for tests only
- Client runs `validateQuery()` from `src/utility/validateQuery.js` before fetching for instant field errors; server remains the authority and its 400 `details` are mapped to fields too
- States: loading, no results, field errors, general error banner (network/500)
- Dev: Vite proxy `/api` → `http://localhost:3000` (SAM local)

## Tests

**Backend (Vitest)**
- Each filter individually and combined
- No matches → empty 200
- Tied scores → deterministic order
- Every validation rule; multiple errors returned together
- Unknown city → 400
- Pagination: first page, last partial page, past the end, pageSize > total
- Scoring: exact budget, under vs over budget (over penalized 2×), no targetBudget → recency only, recency window edge
- Handler: 200 / 400 / 500 response shapes

**Frontend (Vitest + React Testing Library, ~4 tests, `fetch` mocked)**
- Loading state, no-results state, error display, pagination controls
- `listingsCache.js` (fake-indexeddb): save/load, 5-minute expiry, separate keys per filter set
- App: Search prefetches 20; pages inside the 20 make no extra fetch; a page past 20 fetches and is then cached; a boundary-straddling page fetches; IndexedDB failure falls back to API calls

## README contents
Setup/run steps (SAM local + Vite), API reference, scoring formula and rationale, trade-offs (JS backend, no DB, duplicates not merged, validation duplicated in a Lambda layer and a frontend utility), and possible extensions (dedup, status filter, configurable weights, DynamoDB/real feed behind the loader).

## PR breakdown (build order)

Each row is one task, one branch, one PR. PRs merge in order; later PRs build on earlier ones.

| # | Branch | Area | Task |
|---|---|---|---|
| 0 | `chore/repo-setup` | repo | `PLAN.md`, `CLAUDE.md`, PR template, `.gitignore` |
| 1 | `backend/project-setup` | backend | `backend/package.json` (ES modules, Vitest), copy `sample_listings.json` into `backend/layers/util/nodejs/data/`, `layers/util/nodejs/loadListings.js` + test |
| 2 | `backend/validation-layer` | lambda layer | `layers/validation/nodejs/validateQuery.js` (all rules except unknown city), `vitest.config.js` alias for `/opt/nodejs` + tests |
| 3 | `backend/scoring` | backend | `layers/util/nodejs/scoring.js`: budgetScore, recencyScore, combined score with injected `now` + tests |
| 4 | `backend/filter-sort` | backend | `layers/util/nodejs/search.js` filtering + tie-break sorting + tests |
| 5 | `backend/pagination` | backend | Pagination in `layers/util/nodejs/search.js` and the full `searchListings()` pipeline + tests |
| 6 | `backend/lambda-handler` | lambda | `lambda/get-listings/handler.js` (parse, validate, unknown-city 400, search, 200/400/500, CORS) + handler tests |
| 7 | `backend/sam-template` | lambda | `template.yaml` (function with esbuild, `/opt/nodejs/*` external; `ValidationLayer`; `/listings` GET) + run instructions; verify with `sam local start-api` |
| 8 | `frontend/project-setup` | frontend | Vite + React scaffold, Vitest + RTL config, `/api` proxy, `src/api.js` fetch client |
| 9 | `frontend/validation-utility` | frontend | `src/utility/validateQuery.js` (same rules as the layer) + tests |
| 10 | `frontend/search-form` | frontend | Filter form, client validation via `src/utility/validateQuery.js`, field errors, URL sync |
| 11 | `frontend/results-and-pagination` | frontend | Results table, Prev/Next "Page X of Y", loading / no-results / error states |
| 12 | `frontend/tests` | tests | ~4 RTL tests: loading, no results, error display, pagination |
| 13 | `docs/readme` | docs | `README.md`: setup, API, scoring rationale, trade-offs, extensions |
| 14 | `backend/lambda-util-layer` | lambda | Move handler to `lambda/get-listings/`, other backend code + data into the util layer |
| 15 | `docs/prefetch-cache-plan` | docs | Add prefetch + IndexedDB cache behavior to PLAN.md |
| 16 | `frontend/listings-cache` | frontend | `src/utility/listingsCache.js` (plain IndexedDB, 5-min expiry) + tests with fake-indexeddb devDependency |
| 17 | `frontend/prefetch-paging` | frontend | App: prefetch first 20 on Search, local paging, API + cache for other pages, fallback when IndexedDB fails + tests |
| — | (optional, later) | infra | AWS deploy — only if the user asks |
