# 005: File restructure (tasks)

| Field   | Value                                  |
| ------- | -------------------------------------- |
| Spec    | [spec.md](spec.md)                     |
| Plan    | [plan.md](plan.md)                     |
| Status  | Implemented                            |
| Updated | 2026-10-01                             |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.
> This spec only moves files, so no new tests are written. After every task, `npm test` must still report **29 test files and 252 tests**, and `npm run lint` and `npm run typecheck` must pass. Move files with `git mv`, and keep other edits in a moved file to the import and path fixes.

## Tasks

### Shared

- [x] **T1:** Move the four shared tests (`applications`, `jobDetails`, `observability`, `stages` `.test.ts`) from `packages/shared/src/` to `packages/shared/tests/`. Fix their imports to `../src/...`, and change `include` in `packages/shared/tsconfig.json` to `["src", "tests"]`. (AC-1, AC-5, AC-8)

### Server

- [x] **T2:** Move the server test helper `src/testing.ts` to `apps/server/tests/support/testing.ts`, and move the server tests that live in `src/` itself (`app`, `clientErrors`, `config`, `db`, `health`, `index`, `localDate`, `logger`, `migrate`, `requestLog`, `schema` `.test.ts`) to `apps/server/tests/`. Fix their imports to `../src/...` (or `../../src/...` for the helper). Fix every path built from `import.meta.dirname`: `migrations/` in `support/testing.ts` and `schema.test.ts`, `package.json` and `migrations/` in `health.test.ts`, `src/index.ts` in `index.test.ts`, and the repo root in `db.test.ts` and `config.test.ts`. Change `include` in `apps/server/tsconfig.json` to `["src", "tests"]`. (AC-1, AC-5, AC-8)
- [x] **T3:** Move the server tests in subfolders (`src/applications/*.test.ts`) to `apps/server/tests/applications/`, mirroring `src/`. Fix their imports and the `migrations/` path in `store.test.ts`. In `eslint.config.js`, remove `ignores: ["**/*.test.ts"]` from the `no-console` override, since tests are no longer in `src/`. Run `npm run lint` to confirm the rule still passes. (AC-1, AC-5, AC-8)

### Client: tests

- [x] **T4:** Move the client tests to `apps/client/tests/` and the helpers `src/testing/fakeServer.ts` and `src/testing/setup.ts` to `apps/client/tests/support/`. Put them all directly in `tests/` for now (T5 sorts them into folders), and keep their names. Fix imports to `../src/...`. Change `setupFiles` in `vitest.config.ts` to `tests/support/setup.ts`, and `include` in `apps/client/tsconfig.json` to `["src", "tests"]`. Confirm the client project still runs all of its tests. (AC-1, AC-5, AC-8)

### Client: source folders

- [x] **T5:** Create `src/components/` and `src/lib/`. Move `Board`, `Card`, `ApplicationPanel`, `ConfirmDialog`, and `ErrorBoundary` `.tsx` files to `components/`, and `api`, `dates`, `salary`, and `errorReporting` `.ts` files to `lib/`. Fix the imports between them and in `App.tsx` and `main.tsx`. Move the tests to mirror: component tests (including `JobDetails.test.tsx` and `ApplicationPanel.edit.test.tsx`) to `tests/components/`, helper tests to `tests/lib/`, and keep `App.test.tsx` in `tests/`. Fix their imports, including the ones to `tests/support/`. (AC-1, AC-4, AC-5, AC-8)

### Client: styles

- [x] **T6:** Split `src/styles.css` as in the plan's table. Copy the rules unchanged and in their original order into `styles/global.css`, `App.css`, and the five component CSS files. Before deleting the old file, list its selectors with `git show development:apps/client/src/styles.css` and tick each one off against the new files, so none is lost or duplicated. Keep the two `.panel-footer` blocks and the two `.form-error` blocks as they are, in `ApplicationPanel.css`. (AC-2, AC-3)
- [x] **T7:** Import each CSS file from its component (`App.tsx` imports `App.css`, and each component imports its own). In `main.tsx`, replace the `styles.css` import with `styles/global.css` and make it the first import, so global styles still come before the components'. Delete `src/styles.css`. Run `grep -rn "styles.css" apps` and expect no matches. Run `npm run build` and check the built CSS contains rules from every file. (AC-2, AC-3, AC-5)

### Docker and docs

- [x] **T8:** In `.dockerignore`, replace `**/*.test.ts` and `**/*.test.tsx` with `**/tests/`. Run `docker compose up --build --force-recreate` and check the app starts and the health check passes. (AC-6)
- [x] **T9:** Add the layout convention to the constitution's engineering conventions (§3): tests and test helpers live in each package's `tests/` folder, mirroring `src/`, and a component's styles sit beside the component, with app-wide styles in `styles/global.css`. Grep `README.md`, `CLAUDE.md`, and `docs/constitution.md` for paths that no longer exist, and fix any found. Leave specs 000–004 as they are. (AC-7)

### Checks

- [x] **T10:** Run the command checks from the plan and record the output in Notes: AC-1 (`find` for test files under `src/`), AC-4 (the client tree matches the plan), AC-5 (29 files, 252 tests, lint, typecheck, build), and AC-8 (`git diff -M --stat development...feature/restructure-files`, noting that the split `styles.css` is the expected exception). (AC-1, AC-4, AC-5, AC-8)
- [x] **T11:** Do the manual checks and record the results in Notes. AC-6: walk through the board, a card (including an overdue one), the application form, the delete confirmation, and the crash screen in `npm run dev`, then in `npm run build` and `npm start`, then in Docker, comparing with `development` running alongside. AC-9: after `npm run build`, run `grep -rE "fakeServer|installFakeServer|testing-library|vitest" apps/client/dist` and expect no matches, then note it in the spec's changelog. (AC-6, AC-9)
- [x] **T12:** Mark the spec, plan, and tasks Implemented, update the `docs/specs/README.md` index, and bring the roadmap row for 005 to *(Implemented)*. Update `Updated` dates. (all ACs)

## Verification

- [x] `npm test` passes, with 29 test files and 252 tests
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] `npm run build` passes
- [x] Manual checks from the spec (AC-6, AC-9) are done and their results noted below

## Notes

Baseline before any move (on `development`, 2026-10-01): 29 test files, 252 tests.

- T2 and T3 were committed together, because the `applications` tests import the test helper that T2 moves, so T2 alone would leave the build red.
- The plan said seven server tests needed their `import.meta.dirname` paths fixed. Only two did: `support/testing.ts` (now one folder deeper) and `index.test.ts` (now points at `../src/index.ts`). The others (`schema`, `health`, `config`, `db`, `applications/store`) are the same depth below `apps/server/` as before, so their paths stayed correct.
- T8: `docker compose up --build --force-recreate` started the app, `/api/health` returned ok with the latest migration, and `/` returned 200. The image's `apps/server/src` has no test helper and there is no `apps/server/tests` folder in it.
- T9: A grep of `README.md`, `CLAUDE.md`, and `docs/constitution.md` found no paths to moved files, so nothing else needed fixing.
- T10 results (2026-10-01): AC-1 `find` for test files and helpers under any `src/` printed nothing. AC-4 the client tree matches the plan. AC-5 `npm test` reports 29 files and 252 tests (same as the baseline), and lint, typecheck, and build pass. AC-8 `git diff -M --stat development...feature/restructure-files` shows every moved file as a rename, and `styles.css` as the one expected exception (one file deleted, seven added).
- T6 check: the sorted, non-blank lines of the old `styles.css` match exactly the combined lines of the seven new files, so no rule was lost or duplicated.
- AC-9 (part of T11), 2026-10-01: after `npm run build`, no file in `apps/client/dist` mentions `fakeServer`, `installFakeServer`, `testing-library`, or `vitest`.
- AC-6 (part of T11), 2026-10-01: the owner walked through the app in `npm run dev`, in `npm run build` then `npm start`, and in Docker (`http://localhost:8080`), and all three looked and behaved the same as before the move.
