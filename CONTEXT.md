# CONTEXT.md

## Purpose

This file is the shared memory for agents working in this repo. Read it before starting, and add to it when you are done.

## Current state

As of 2026-10-27, v0.11.5 (this PR's release will make it v0.11.6; the manager updates this line on release).

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

- The AWS SAM CLI is not installed on the dev machine, so `sam build` and `sam local start-api` have not been run since the restructure. Whether both layers load together at `/opt/nodejs` is unverified.
- Python is not installed on the dev machine. Use the Edit tool or Node for file edits, not Python scripts.
- The squash commit for PR #20 has a "Claude Opus 5.5" co-author trailer, although Haiku did the work. It was left as is because fixing it would mean rewriting main history.

## Log

Newest entry at the bottom. Format: `- YYYY-MM-DD, <PR #/release>, <agent>: <what was done / what to know>`

- 2026-10-27, PR #22, sub agent (Haiku 5.5): Added this file and the ask-first, readability, CONTEXT.md and self-check rules to CLAUDE.md. No code, VERSION or README changes.
