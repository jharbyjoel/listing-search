# CONTEXT.md

## Purpose

This file is the shared memory for agents working in this repo. Read it before starting, and add to it when you are done.

## Current state

As of 2026-10-28, v0.13.0.

- All PLAN.md PRs #0–#13 are merged.
- The backend layout is now:
  - `backend/lambda/get-listings/handler.js` (the Lambda handler).
  - `backend/layers/validation/nodejs/` (validateQuery.js).
  - `backend/layers/util/nodejs/` (loadListings.js, search.js, scoring.js, data/sample_listings.json).
- Both layers mount at `/opt/nodejs` in Lambda. `backend/vitest.config.js` aliases each `/opt/nodejs/<file>` to its local file.
- Frontend: Vite + React in `frontend/`.
- `frontend/src/utility/listingsCache.js` exists (PR 16), with `buildFirstResultsKey`, `buildPageKey`, `saveToCache`, `loadFromCache`.
- The app now uses `loadListingsPage` (`frontend/src/utility/loadListingsPage.js`, PR 17). Search prefetches max(20, pageSize) results. Pages whose rows are all in the prefetched block are built locally. Other pages use the API plus the cache. If IndexedDB fails, every page calls the API.

## Decisions made with the user

- The handler moved to `lambda/get-listings/`, and the other backend code and data moved into a util layer (PR #20). The validation layer was kept separate.
- Docs for a change go in the same PR as the change (user decision in PR #26; replaces the earlier separate-docs-PR rule from PR #21).
- PRs are squash-merged, and the branch is deleted after merge.
- Agents ask before deciding anything (PR #22).
- New rules 8 (CONTEXT.md) and 9 (self-check) go at the end of the rules list (PR #22).
- Never amend commits or force-push. Fix a mistake with a normal follow-up commit, and ask before any history rewrite (user decision after PR #23).
- Prefetch + cache (planned in PR #24): on Search, fetch `page=1&pageSize=20` and store it in IndexedDB. Pages whose rows are all within the first 20 are built locally; any other page calls the API with the user's pageSize and is cached. Cache expires after 5 minutes. Key for the first 20 is filters only. Plain IndexedDB, `fake-indexeddb` for tests only, no API change. If IndexedDB fails, fall back to API calls.
- Prefetch size is max(20, pageSize); an empty pageSize means 10 (user decision, PR #26).
- Cache keys are tagged JSON arrays of the filter values in a fixed order, plus pageSize and page for page keys (user approved in PR #25).
- The out-of-range paging guard in loadListingsPage is kept, and PR #26's size (~390 lines, mostly tests) was accepted (user decisions).

## Known gaps / things to watch

- Only the search form runs client validation (on Search). Values loaded from the URL (refresh or shared link) go straight to `runSearch`, so out-of-range or non-integer page/pageSize from a URL skip the cache and the server returns its 400.
- SAM CLI 1.170.0 is installed at `C:\Program Files\Amazon\AWSSAMCLI\bin\`. VS Code terminals only see it on PATH after VS Code has fully restarted.
- With both layers loading at `/opt/nodejs`, `sam build` and `sam local start-api` now work. All 10 smoke requests in the verification run matched expectations.
- Run SAM through the npm scripts (`npm run sam:build`, `npm run sam:start`), not bare `sam build`. With npm 9+ SAM cannot find the project-local esbuild unless node_modules/.bin is on PATH, which `npm run` provides.
- Stopping a background `npm run sam:start` task does not stop SAM. Its `samcli` processes keep listening on port 3000. After stopping it, check port 3000 and end any leftover `samcli local start-api` processes.
- Python is not installed on the dev machine. Use the Edit tool or Node for file edits, not Python scripts.
- The squash commit for PR #20 has a "Claude Opus 5.5" co-author trailer, although Haiku did the work. It was left as is because fixing it would mean rewriting main history.

## Log

Newest entry at the bottom. Format: `- YYYY-MM-DD, <PR #/release>, <agent>: <what was done / what to know>`

- 2026-10-27, PR #22, sub agent (Haiku 5.5): Added this file and the ask-first, readability, CONTEXT.md and self-check rules to CLAUDE.md. No code, VERSION or README changes.
- 2026-10-27, v0.11.6, manager (Opus 5.5): Reviewed PR #22 (sent back once for a missing Notes section and two inaccurate CONTEXT.md lines), merged it and released v0.11.6. From now on every PR must update CONTEXT.md, and every sub agent report must include the checklist self-check.
- 2026-10-27, PR #23, sub agent (Haiku 5.5): `npm run sam:build` succeeded; 10 of 10 smoke requests matched expectations, no failures. Both layers load at `/opt/nodejs`.
- 2026-10-27, v0.11.7, manager (Opus 5.5): Reviewed and merged PR #23. SAM local is verified end to end. The sub agent tried an amend plus force-push before asking; auto-mode blocked it and main was unaffected. The user decided to merge and record the no-force-push rule above.
- 2026-10-27, PR #24, sub agent (Haiku 5.5): Added the approved prefetch + IndexedDB cache behavior to PLAN.md (Frontend, repo layout, Tests, PR breakdown rows 15–17). Docs only. Pages are built locally only when all rows are within the first 20; the last page is not special-cased. No code, VERSION or README changes.
- 2026-10-27, v0.11.8, manager (Opus 5.5): Reviewed and merged PR #24 (sent back once: the PR body credited the last-page rule to the manager; it was the user's decision). Next: PR 16 frontend/listings-cache, then PR 17 frontend/prefetch-paging.
- 2026-10-27, PR #25, sub agent (Haiku 5.5): Added `frontend/src/utility/listingsCache.js` (plain IndexedDB, database `listing-search`, store `listingsCache`, 5-minute expiry, never throws) with tests in `frontend/test/listingsCache.test.js`. Added `fake-indexeddb` as a frontend devDependency. First-results keys use filters only; page keys add pageSize and page. Not wired into the app yet (PR 17).
- 2026-10-27, v0.12.0, manager (Opus 5.5): Reviewed and merged PR #25 (74/74 frontend tests and lint passing on my run). The user approved the tagged-JSON cache key format. Next: PR 17 frontend/prefetch-paging.
- 2026-10-27, PR #26, sub agent (Haiku 5.5): Wired `loadListingsPage` (`frontend/src/utility/loadListingsPage.js`) into `runSearch` in App.jsx. Prefetches max(20, pageSize), builds pages from the cached block, otherwise API + cache. Updated the Next-page App test (12 fake rows, no second fetch) and the Loading test (waits for the fetch). Frontend tests 82/82 and lint passing. Open question for the manager: out-of-range paging bypasses the cache (see Known gaps).
- 2026-10-28, PR #26, sub agent (Haiku 5.5): Docs follow-up: PLAN.md (max(20, pageSize) prefetch, empty pageSize = 10, paging guard, loadListingsPage.js), README tree (listingsCache.js, loadListingsPage.js), CLAUDE.md rule 4 (docs go in the same PR).
- 2026-10-28, v0.13.0, manager (Opus 5.5): Reviewed and merged PR #26 (82/82 frontend tests and lint passing on my run). The first sub agent stalled during the docs follow-up and left uncommitted edits on main; I moved them onto the PR branch with a stash, and a fresh sub agent finished and pushed them. The user resolved the paging-guard question (kept). Prefetch + IndexedDB paging (PLAN rows 15-17) is complete.
- 2026-10-28, PR #<n>, sub agent (Haiku 5.5): Added the user-approved scoring rationale comment at the top of scoring.js (formula + why). Comment only, no logic change.
