# CONTEXT.md

## Purpose

This file is the shared memory for agents working in this repo. Read it before starting, and add to it when you are done.

## Current state

As of 2026-10-27, v0.11.6.

- All PLAN.md PRs #0–#13 are merged.
- The backend layout is now:
  - `backend/lambda/get-listings/handler.js` (the Lambda handler).
  - `backend/layers/validation/nodejs/` (validateQuery.js).
  - `backend/layers/util/nodejs/` (loadListings.js, search.js, scoring.js, data/sample_listings.json).
- Both layers mount at `/opt/nodejs` in Lambda. `backend/vitest.config.js` aliases each `/opt/nodejs/<file>` to its local file.
- Frontend: Vite + React in `frontend/`.

## Decisions made with the user

- The handler moved to `lambda/get-listings/`, and the other backend code and data moved into a util layer (PR #20). The validation layer was kept separate.
- Docs are updated in a separate `docs:` PR after a refactor (PR #21).
- PRs are squash-merged, and the branch is deleted after merge.
- Agents ask before deciding anything (PR #22).
- New rules 8 (CONTEXT.md) and 9 (self-check) go at the end of the rules list (PR #22).

## Known gaps / things to watch

- SAM CLI 1.170.0 is installed at `C:\Program Files\Amazon\AWSSAMCLI\bin\`. VS Code terminals only see it on PATH after VS Code has fully restarted.
- With both layers loading at `/opt/nodejs`, `sam build` and `sam local start-api` now work. All 10 smoke requests in the verification run matched expectations.
- Run SAM through the npm scripts (`npm run sam:build`, `npm run sam:start`), not bare `sam build`. With npm 9+ SAM cannot find the project-local esbuild unless node_modules/.bin is on PATH, which `npm run` provides.
- Python is not installed on the dev machine. Use the Edit tool or Node for file edits, not Python scripts.
- The squash commit for PR #20 has a "Claude Opus 5.5" co-author trailer, although Haiku did the work. It was left as is because fixing it would mean rewriting main history.

## Log

Newest entry at the bottom. Format: `- YYYY-MM-DD, <PR #/release>, <agent>: <what was done / what to know>`

- 2026-10-27, PR #22, sub agent (Haiku 5.5): Added this file and the ask-first, readability, CONTEXT.md and self-check rules to CLAUDE.md. No code, VERSION or README changes.
- 2026-10-27, v0.11.6, manager (Opus 5.5): Reviewed PR #22 (sent back once for a missing Notes section and two inaccurate CONTEXT.md lines), merged it and released v0.11.6. From now on every PR must update CONTEXT.md, and every sub agent report must include the checklist self-check.
- 2026-10-27, PR #23, sub agent (Haiku 5.5): `npm run sam:build` succeeded; 10 of 10 smoke requests matched expectations, no failures. Both layers load at `/opt/nodejs`.
