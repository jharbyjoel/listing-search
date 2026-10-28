# Agent Instructions

Read this file, `PLAN.md` and `CONTEXT.md` before doing any work in this repo. `PLAN.md` is the source of truth for what to build; this file is the source of truth for how to work. `CONTEXT.md` is the running record of what has been built and decided so far.

## Roles

- **Manager (orchestrating agent):** splits `PLAN.md` into small tasks, delegates each task to a sub agent, reviews every PR against this file, and reports to the user.
- **Sub agents:** implement exactly one task each, on one area only (backend logic, Lambda handler, Lambda layers (validation, util), frontend, or tests), and open one PR for it.

## Rules

### 1. No added scope without the user's approval
- Build only what `PLAN.md` and your task description say.
- If something seems missing, wrong, or worth adding, **stop and report it** instead of building it. The manager will take it to the user.
- This applies to the manager too. No "while I'm here" changes, extra features, extra dependencies, or refactors outside the task.

### 2. Ask, don't decide
- If you are unsure about anything, ask for clarification before acting. Do not make decisions on your own, however trivial they seem.
- This applies to every agent, including the manager.
- Sub agents stop and report the question to the manager. The manager takes every question to the user and never answers it on the user's behalf.

### 3. Readable code over clever code
- Code should read as if it were written for a beginner: easy to read and follow, with names that say what each variable and function is for and what it does.
- Write code a reviewer can understand on the first read, even if that means repeating yourself. DRY is not a goal here.
- Use descriptive names (`listingsMatchingCity`, not `lmc`; `listing`, not `l`).
- Prefer plain `if` statements and `for` loops over nested ternaries, chained one-liners, or reduce tricks.
- No shorthand tricks such as `!!value`, `+str` for number parsing, `a && b()` as control flow, or comma expressions.
- One function does one thing. Keep functions short enough to read without scrolling.
- Add a short comment only where the *why* is not obvious from the code (for example, the scoring formula).

### 4. Small, focused PRs
- One task = one branch = one PR.
- A PR touches one area (backend, Lambda layers (validation, util), frontend, or tests for one of those). Tests for the code in a PR go in the same PR.
- Aim for a PR a human can review in about 10 minutes (roughly under 300 changed lines, excluding lockfiles and sample data).
- Branch names: `<area>/<short-task-name>`, for example `backend/scoring`, `frontend/results-table`.
- Docs for a change (PLAN.md, README.md, CONTEXT.md, CLAUDE.md) go in the same PR as the change; they do not count as a second area.

### 5. PR descriptions
- Use `.github/pull_request_template.md` for every PR. Do not add or remove sections.
- Keep it short: the core idea only. No long lists of every file changed.

### 6. Versioning
- The project version lives in the root `VERSION` file (semantic versioning, `MAJOR.MINOR.PATCH`). It covers the whole repo, backend and frontend together.
- Every PR title starts with its type: `feat:`, `fix:`, `docs:`, `chore:`, or `test:`. Add `!` after the type for a breaking change (e.g. `feat!: ...`).
- The **manager** bumps the version manually after each PR merge. Sub agents never edit `VERSION`.
  - Breaking change (`!`) → MAJOR (`0.4.2` → `1.0.0`)
  - `feat:` → MINOR (`0.4.2` → `0.5.0`)
  - `fix:`, `docs:`, `chore:`, `test:` → PATCH (`0.4.2` → `0.4.3`)
- The bump is one commit directly on `main` titled `chore: release vX.Y.Z`, followed by a GitHub Release named `vX.Y.Z` (which creates the tag), e.g. `gh release create vX.Y.Z --title "vX.Y.Z" --notes "- feat: <PR title> (#N)"`. Release notes list the merged PR title(s) only.

### 7. Before opening a PR
- Run the tests for the project you changed (`npm test` in `backend/` or `frontend/`) and make sure they pass.
- Do not commit `node_modules`, build output, `.aws-sam/`, or secrets.

### 8. Keep CONTEXT.md up to date
- Read CONTEXT.md before starting work.
- After finishing, add an entry to CONTEXT.md describing what you did, what you decided (with the user's approval), and anything the next agent should know.
- Sub agents put their CONTEXT.md update in the same PR as their task.
- The manager adds its own notes (merges, releases, user decisions) to CONTEXT.md in the `chore: release vX.Y.Z` commit on main.

### 9. Self-check before finishing
- Before reporting a task as complete, each sub agent goes through the review checklist and confirms that every item is met. In its final report, it lists each checklist item with yes or no.
- The manager then checks the same list independently. It approves and merges a PR only once every item is met. Otherwise it sends the work back.

## Review checklist (used by the manager on every PR)

- [ ] Does only what the task and `PLAN.md` describe; no added scope
- [ ] Code is plain and readable; no clever or shorthand code
- [ ] Touches one area only and is small enough to review quickly
- [ ] Tests included for new logic and passing
- [ ] PR description follows the template and is short
- [ ] Agent read CONTEXT.md and the PR updates it
- [ ] Nothing was decided without asking; open questions were raised, not guessed
- [ ] Names describe what each variable and function is for; a beginner could follow the code
- [ ] Sub agent's self-check is included in its report and every item is met

## Project facts

- Backend: Node.js Lambda (`backend/`), run locally with `sam local start-api`. Data comes from `backend/layers/util/nodejs/data/sample_listings.json`. No database.
- Validation (server): a Lambda layer at `backend/layers/validation/nodejs/validateQuery.js`, imported in the handler as `/opt/nodejs/validateQuery.js` (aliased to the local folder in `backend/vitest.config.js`).
- Util (server): a Lambda layer at `backend/layers/util/nodejs/` (`loadListings.js`, `search.js`, `scoring.js`, `data/`), imported in the handler as `/opt/nodejs/loadListings.js` and `/opt/nodejs/search.js` (each aliased to its local file in `backend/vitest.config.js`).
- Validation (UI): a separate copy at `frontend/src/utility/validateQuery.js`. There is no shared folder; the two copies must implement the same rules from `PLAN.md`.
- Frontend: Vite + React, plain JavaScript (`frontend/`).
- Tests: Vitest in both projects; React Testing Library in the frontend.
- Backend and frontend are separate npm projects (no workspaces).
