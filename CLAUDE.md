# Agent Instructions

Read this file and `PLAN.md` before doing any work in this repo. `PLAN.md` is the source of truth for what to build; this file is the source of truth for how to work.

## Roles

- **Manager (orchestrating agent):** splits `PLAN.md` into small tasks, delegates each task to a sub agent, reviews every PR against this file, and reports to the user.
- **Sub agents:** implement exactly one task each, on one area only (backend logic, Lambda handler, validation layer, frontend, or tests), and open one PR for it.

## Rules

### 1. No added scope without the user's approval
- Build only what `PLAN.md` and your task description say.
- If something seems missing, wrong, or worth adding, **stop and report it** instead of building it. The manager will take it to the user.
- This applies to the manager too. No "while I'm here" changes, extra features, extra dependencies, or refactors outside the task.

### 2. Readable code over clever code
- Write code a reviewer can understand on the first read, even if that means repeating yourself. DRY is not a goal here.
- Use descriptive names (`listingsMatchingCity`, not `lmc`; `listing`, not `l`).
- Prefer plain `if` statements and `for` loops over nested ternaries, chained one-liners, or reduce tricks.
- No shorthand tricks such as `!!value`, `+str` for number parsing, `a && b()` as control flow, or comma expressions.
- One function does one thing. Keep functions short enough to read without scrolling.
- Add a short comment only where the *why* is not obvious from the code (for example, the scoring formula).

### 3. Small, focused PRs
- One task = one branch = one PR.
- A PR touches one area (backend, validation layer, frontend, or tests for one of those). Tests for the code in a PR go in the same PR.
- Aim for a PR a human can review in about 10 minutes (roughly under 300 changed lines, excluding lockfiles and sample data).
- Branch names: `<area>/<short-task-name>`, for example `backend/scoring`, `frontend/results-table`.

### 4. PR descriptions
- Use `.github/pull_request_template.md` for every PR. Do not add or remove sections.
- Keep it short: the core idea only. No long lists of every file changed.

### 5. Before opening a PR
- Run the tests for the project you changed (`npm test` in `backend/` or `frontend/`) and make sure they pass.
- Do not commit `node_modules`, build output, `.aws-sam/`, or secrets.

## Review checklist (used by the manager on every PR)

- [ ] Does only what the task and `PLAN.md` describe; no added scope
- [ ] Code is plain and readable; no clever or shorthand code
- [ ] Touches one area only and is small enough to review quickly
- [ ] Tests included for new logic and passing
- [ ] PR description follows the template and is short

## Project facts

- Backend: Node.js Lambda (`backend/`), run locally with `sam local start-api`. Data comes from `backend/data/sample_listings.json`. No database.
- Validation (server): a Lambda layer at `backend/layers/validation/nodejs/validateQuery.js`, imported in the handler as `/opt/nodejs/validateQuery.js` (aliased to the local folder in `backend/vitest.config.js`).
- Validation (UI): a separate copy at `frontend/src/utility/validateQuery.js`. There is no shared folder; the two copies must implement the same rules from `PLAN.md`.
- Frontend: Vite + React, plain JavaScript (`frontend/`).
- Tests: Vitest in both projects; React Testing Library in the frontend.
- Backend and frontend are separate npm projects (no workspaces).
