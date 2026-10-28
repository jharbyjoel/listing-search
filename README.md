# Listing Search

A full-stack listing search. A React frontend calls a Node.js backend that runs as an AWS Lambda function, run locally with AWS SAM. Listings come from `backend/layers/util/nodejs/data/sample_listings.json`, which is loaded into memory. There is no database.

## Prerequisites

- Node.js (a current LTS version)
- Docker Desktop, running (SAM uses it to run the Lambda locally)
- AWS SAM CLI

## Running locally

Run the backend first, then the frontend.

**Backend** (API on port 3000):

```sh
cd backend
npm install
npm run sam:build
npm run sam:start
```

The API is then available at `http://127.0.0.1:3000/listings`.

**Frontend** (Vite dev server):

```sh
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Requests to `/api/...` are proxied to the backend on port 3000, with the `/api` prefix removed.

## Running tests

Each project has its own tests, run with `npm test`:

- `backend/`: Vitest tests for the handler, search pipeline, scoring, data loading and the validation layer.
- `frontend/`: Vitest and React Testing Library tests for the search form, results table, pagination, API client, URL sync, validation and the full search flow.

## API

### `GET /listings`

| Parameter | Type | Default | Rule |
|---|---|---|---|
| `minPrice` | number | none | 0 or more |
| `maxPrice` | number | none | 0 or more; must not be less than `minPrice` |
| `minBedrooms` | whole number | none | 0 or more |
| `city` | text | none | Must match a city in the data (case-insensitive) |
| `keyword` | text | none | Substring of the description (case-insensitive) |
| `targetBudget` | number | none | Greater than 0. When set, results are scored against it |
| `page` | whole number | `1` | 1 or more |
| `pageSize` | whole number | `10` | 1 to 50 |

Example:

```sh
curl "http://127.0.0.1:3000/listings?city=Springfield&maxPrice=500000&targetBudget=450000&pageSize=5"
```

Responses:

- **200**: `{ results, page, pageSize, totalResults, totalPages }`. Each result is a listing with an extra `score` between 0 and 1.
- **400**: `{ error: "VALIDATION_ERROR", details: [{ field, message }] }`. Lists every problem found.
- **500**: `{ error: "INTERNAL_ERROR", message }`. The real error is logged on the server and not sent to the client.

## Validation

The rules are the same in the backend and the frontend:

- Numeric fields must be numbers. `minBedrooms`, `page` and `pageSize` must be whole numbers.
- Prices and `minBedrooms` cannot be negative. `targetBudget` must be greater than 0.
- `page` must be at least 1. `pageSize` must be from 1 to 50. There is no silent clamping; out-of-range values return 400.
- `minPrice` must not be greater than `maxPrice`.
- An unknown `city` (no listing in the data) returns 400.
- All errors are returned together in one 400 response. Each field reports at most one error.
- A page past the end returns 200 with empty `results`, and the correct `totalPages`.
- Unknown query parameters are ignored.
- Blank values are treated as not provided.

There are two copies of the rules:

- **Server (authority):** `backend/layers/validation/nodejs/validateQuery.js`. It is a Lambda layer mounted at `/opt/nodejs` inside Lambda. The Vitest config maps that path to the local folder so tests can import it.
- **UI copy:** `frontend/src/utility/validateQuery.js`. It gives instant field errors before the request is sent. The server still makes the final decision, and its 400 details are shown on the matching fields.

The two copies must be kept in sync by hand. Each has its own tests. The city check is not in the layer, because it needs the data, so it lives in `lambda/get-listings/handler.js`.

## Scoring approach

Scores are calculated in `backend/layers/util/nodejs/scoring.js`:

```
budgetScore  = max(0, 1 - k * |price - targetBudget| / targetBudget)
               k = 2 if price > targetBudget, otherwise 1
recencyScore = max(0, 1 - daysOld / 180)
score        = targetBudget given ? 0.6 * budgetScore + 0.4 * recencyScore
                                  : recencyScore
```

- The score is stored as 0 to 1 and shown as 0 to 100 in the UI.
- `daysOld` counts calendar days (UTC) since `listedDate`. Listings older than 180 days get a recency score of 0.
- Results are sorted by score (highest first), then `listedDate` (newest first), `price` (lowest first), `source`, and `id`. Ties always resolve the same way, so pages do not shuffle between requests.

Why this approach: buyers usually mind going over budget more than coming in under, so going over is penalized twice as hard. Recency matters, but it is weighted at 40% so it does not outrank how close a listing is to the budget. Without a target budget there is nothing to measure closeness against, so the score is recency alone. The fixed tie-break order keeps pagination stable.

## Trade-offs and known limitations

- **JavaScript backend:** the brief suggested Python, Go or Java. Node.js was chosen so the whole stack uses one language.
- **No database:** 12 read-only listings are bundled and loaded in memory. A real feed or DynamoDB would sit behind `loadListings()`.
- **Duplicates are not merged:** some listings appear in both feeds (for example A1/B7, A2/B8, A3/B9 and A5/B11) and are shown as separate rows. A dedup step could run after loading.
- **Duplicated validation:** the rules live in two copies (layer and UI) and must be kept in sync.
- **Search on submit:** results update when the form is submitted, not as you type. Requests are not cancelled if a newer one starts.
- **Keyword matching:** a simple case-insensitive substring match on the description. No stemming or ranking by keyword.

## Project structure

```
listing-search/
├── backend/
│   ├── lambda/get-listings/handler.js   Lambda handler: validate, search, respond
│   ├── layers/util/nodejs/              util Lambda layer: data loading, search, scoring
│   │   ├── data/sample_listings.json    12 bundled listings
│   │   ├── loadListings.js              loads the bundled listings
│   │   ├── search.js                    filter, sort, paginate
│   │   └── scoring.js                   budget and recency scores
│   ├── layers/validation/nodejs/        validation Lambda layer (validateQuery.js)
│   ├── template.yaml                    SAM template (run with sam:build / sam:start)
│   └── test/
├── frontend/
│   ├── src/App.jsx                      page state, search and pagination flow
│   ├── src/api.js                       fetch client for GET /api/listings
│   ├── src/components/                  SearchForm, ResultsTable, Pagination
│   ├── src/utility/                     validateQuery.js (UI copy), urlQuery.js
│   ├── vite.config.js                   /api proxy to port 3000
│   └── test/
├── CLAUDE.md, PLAN.md                   working agreements and build plan
└── VERSION                              project version (semantic versioning)
```

## Versioning

The project version is in the root `VERSION` file and uses semantic versioning. Each merged PR gets a GitHub Release (`vX.Y.Z`) with its PR title in the release notes.
