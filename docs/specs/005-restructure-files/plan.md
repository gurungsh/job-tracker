# 005: File restructure (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented              |
| Updated | 2026-10-01               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Move files with `git mv` in three steps, one package at a time (shared, server, client), so every commit leaves tests, lint, and typecheck green. Each package gets a `tests/` folder beside `src/` that mirrors it, and test helpers go in `tests/support/`. The client then gets its folders and its split stylesheet. Last, the constitution gets the layout rule, and one manual check confirms the production build has no test code.

Before the first move, record the baseline: **29 test files, 252 tests** (`npx vitest run`). The same numbers must come out at the end (AC-5).

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Test location | `tests/` beside `src/` in each package, mirroring `src/`'s subfolders | `src/` then holds only shipped code (AC-1). Mirroring makes a test easy to find from its source file. | `src/tests/`, which would still sit inside `src` |
| Test helpers | `tests/support/` (`fakeServer.ts`, `setup.ts` in the client; `testing.ts` in the server) | They are not shipped (AC-1). | Leaving `src/testing/` |
| Client folders | `src/components/`, `src/lib/`, `src/styles/`. `main.tsx` and `App.tsx` stay in `src/`. | Matches the kinds in AC-4. `main.tsx` is the Vite entry named in `index.html`. | A folder per feature, which is more structure than 6 components need (the constitution says to prefer simple code) |
| Component CSS | `Name.css` beside `Name.tsx`, imported by that component | AC-2. Vite already handles CSS imports, so no new tooling. | CSS modules or a CSS-in-JS library, which would rename classes and add a dependency (a non-goal) |
| Global CSS | `src/styles/global.css`, imported first in `main.tsx` | AC-3. Importing it first keeps the original cascade order (see Risks). | Putting it in `index.html` |
| Test imports | Tests import source by relative path, such as `../../src/lib/dates.ts` | Same style as today, with `.ts` extensions. No new aliases or config. | A path alias, which needs config in Vite, Vitest, and TypeScript |
| `index.ts` location | Stays at `apps/server/src/index.ts` | The Dockerfile `CMD` and the `dev` and `start` scripts name it. Nothing else changes for Docker. | Moving it, which would touch the Dockerfile for no gain |
| Rename detection | One `git mv` plus import fixes per commit, with few other edits | AC-8. Git detects renames by similarity, so keep each moved file's edits small. | Edit and move in separate commits, which breaks the build in between |

## Data model

No change.

## API

No change.

## UI

No visible change (AC-6). The client's source after the move:

```
apps/client/
  index.html                  (unchanged; loads src/main.tsx)
  src/
    main.tsx
    App.tsx   App.css         (.app-header)
    components/
      Board.tsx   Board.css
      Card.tsx   Card.css
      ApplicationPanel.tsx   ApplicationPanel.css
      ConfirmDialog.tsx   ConfirmDialog.css
      ErrorBoundary.tsx   ErrorBoundary.css
    lib/
      api.ts   dates.ts   salary.ts   errorReporting.ts
    styles/
      global.css
  tests/
    App.test.tsx
    components/
      Board.test.tsx   ConfirmDialog.test.tsx   ErrorBoundary.test.tsx
      ApplicationPanel.test.tsx   ApplicationPanel.edit.test.tsx   JobDetails.test.tsx
    lib/
      api.test.ts   dates.test.ts   salary.test.ts   errorReporting.test.ts
    support/
      fakeServer.ts   setup.ts
```

`JobDetails.test.tsx` has no `JobDetails.tsx` because the job details are part of `ApplicationPanel`. It goes with the component tests and keeps its name.

### How `styles.css` is split

Every class is used by exactly one component (checked against each `className`), so each rule moves with its owner. Rules are copied unchanged and kept in their original order.

| File | What goes in it |
| ---- | --------------- |
| `styles/global.css` | `:root` variables, `*`, `body`, form control font and color, `button`, `button.primary`, `button.danger`, `:focus-visible`, and `main` |
| `App.css` | `.app-header` and `.app-header h1` |
| `components/Board.css` | `.board`, `.board-status`, `.board-empty`, `.board-toolbar`, `.column`, `.column-*` |
| `components/Card.css` | `.card`, `.card-*`, including `.card-due--overdue` |
| `components/ConfirmDialog.css` | `.dialog-backdrop`, `.dialog`, `.dialog h2`, `.dialog-actions` |
| `components/ApplicationPanel.css` | `.panel`, `.panel-*`, `.field`, `.field-*`, `.form-error`, `.stage-info`, `.job-details`, `.job-description`, `.salary-summary` |
| `components/ErrorBoundary.css` | `.crash`, `.crash h1`, `.crash p` |

The task for this step lists the old file's selectors and ticks each one off, so none are lost or duplicated (AC-3). Then `styles.css` is deleted.

## Shared types

No change.

## Tooling changes

These are the settings that name `src`. Without these edits, the moved tests would silently stop being run, linted, or typechecked (spec "Edge cases").

| File | Change |
| ---- | ------ |
| `vitest.config.ts` | Client `setupFiles`: `src/testing/setup.ts` becomes `tests/support/setup.ts`. The default test file pattern already finds `tests/**`. |
| `apps/*/tsconfig.json`, `packages/shared/tsconfig.json` | `"include": ["src"]` becomes `["src", "tests"]`. |
| `eslint.config.js` | The `no-console` rule applies to `apps/server/src/**`. Its `ignores: ["**/*.test.ts"]` is no longer needed, because tests are outside `src`. Remove it. The other globs (`apps/server/**`, `apps/client/**`, `packages/shared/**`) already cover `tests/`. |
| `.dockerignore` | `**/*.test.ts` and `**/*.test.tsx` become `**/tests/`. |
| `Dockerfile` | No change. The runtime image copies only `apps/server/src`, so it also stops containing the server's test helper. |

### Server tests that build paths from their own location

These use `import.meta.dirname`. A test's `tests/` folder is the same depth below `apps/server/` as `src/` was, so most paths stay correct. Only `support/testing.ts` (one folder deeper) and `index.test.ts` (it spawns `src/index.ts`) needed a new path. The rest are listed to show they were checked.

| Test | Points at |
| ---- | --------- |
| `tests/support/testing.ts` | `migrations/` |
| `tests/schema.test.ts` | `migrations/` |
| `tests/applications/store.test.ts` | `migrations/` |
| `tests/health.test.ts` | `package.json` and `migrations/` |
| `tests/index.test.ts` | `src/index.ts` (spawns it) |
| `tests/db.test.ts`, `tests/config.test.ts` | the repo root |

The server's own code (`src/`) is not touched, so nothing that runs in production changes.

## Test strategy

This is a move, so the existing tests are the test. No test is added or rewritten.

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | Command | `find apps packages -path '*/src/*' \( -name '*.test.*' -o -name 'testing*' -o -name 'fakeServer*' -o -name 'setup.ts' \)` prints nothing. |
| AC-2, AC-3, AC-4 | Command and review | The tree matches the layout above. `grep -rn "styles.css"` finds nothing. Every selector in the old `styles.css` is accounted for, checked with the old file from `git show development:apps/client/src/styles.css`. |
| AC-5 | Command | `npm test` reports 29 files and 252 tests, as in the baseline. `npm run lint`, `npm run typecheck`, and `npm run build` pass. |
| AC-6 | Manual | Walk through the board, a card (including an overdue one), the application form, the delete confirmation, and the crash screen, in `npm run dev`, then `npm run build` and `npm start`, then `docker compose up --build --force-recreate`. Compare against a screenshot or a second window running `development`. The crash screen is reached with the same steps used in spec 004's manual checks. Results are recorded in the spec. |
| AC-7 | Review | Constitution §3 has the new convention. |
| AC-8 | Command | `git diff -M --stat development...feature/restructure-files` shows the moves as renames. The split `styles.css` is the one expected exception, since one file becomes seven. |
| AC-9 | Manual | After `npm run build`, `grep -rE "fakeServer\|installFakeServer\|testing-library\|vitest" apps/client/dist` finds nothing. Recorded in the spec changelog. |

## Risks and mitigations

- **A style rule loses to another after the split.** The browser applies the later rule when two rules match with equal strength. Mitigation: `global.css` is the first import in `main.tsx`, so it still comes before every component's styles, as it did before. No two files target the same selector, because each class belongs to one component. The only duplicated selectors in the old file (`.panel-footer` and `.form-error`) are both in `ApplicationPanel.css`, kept in their original order and not merged. The manual check (AC-6) is what confirms it.
- **A moved test passes only because it no longer runs.** Mitigation: compare the test count to the baseline (252) after every package, not only at the end.
- **A path built from `import.meta.dirname` points at the wrong folder.** Mitigation: the server tests listed above are fixed in the same commit as their move, and the full suite runs after it.
- **Docker image breaks.** Mitigation: `src/` for the server is unchanged, and the Docker check is part of AC-6.
- **Old docs point at files that moved.** Mitigation: specs 000–004 are left alone (non-goal). `grep` the README, `CLAUDE.md`, and the constitution for old paths. None cite test or style paths today.

## New dependencies

None.
