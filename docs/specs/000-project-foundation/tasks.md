# 000: Project foundation (tasks)

| Field   | Value                                  |
| ------- | -------------------------------------- |
| Spec    | [spec.md](spec.md)                     |
| Plan    | [plan.md](plan.md)                     |
| Status  | Approved                               |
| Updated | 2026-10-01                             |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

### Tooling

- [x] **T1:** Create the workspace skeleton. This covers the root `package.json` (with `workspaces`, `engines.node >=24`, and `"type": "module"`), `tsconfig.base.json` (strict, `nodenext`, `verbatimModuleSyntax`), and a `package.json` and `tsconfig.json` for `apps/server`, `apps/client`, and `packages/shared`. Install `typescript`, and add a root `typecheck` script that runs `tsc --noEmit` in each workspace. (AC-3, AC-4)
- [x] **T2:** Add the root ESLint flat config with `@eslint/js`, type-aware `typescript-eslint`, and `eslint-plugin-react-hooks` for `apps/client`, plus `globals`. Add a root `lint` script. (AC-3)
- [x] **T3:** Add the root Vitest config with `projects`: `server` and `shared` run in `node`, and `client` runs in `jsdom`. Add a root `test` script. Install `vitest`, `jsdom`, and `@testing-library/react`. (AC-3)

### Shared

- [x] **T4:** Export `HealthResponse` and `ErrorResponse` from `packages/shared/src/index.ts`, and point the package's `exports` at its `.ts` source. (AC-2)

### Server

- [x] **T5:** Add `config.ts` with `loadConfig(env)`. It returns `port` (from `PORT`, default `3000`) and `databasePath` (from `DATABASE_PATH`, default `<repo>/data/job-tracker.db`, resolved from the file's location). Write unit tests for the defaults and the overrides. (AC-5, AC-9)
- [x] **T6:** Add `db.ts` with `openDatabase(path)`. It creates the parent folder, opens the file with `node:sqlite`, and sets `foreign_keys` and WAL. Add `data/` to `.gitignore`. Write unit tests for a missing folder and an overridden path, plus a `git check-ignore` test for the default database and its `-wal` and `-shm` files. (AC-5, AC-8, AC-9)
- [x] **T7:** Add `migrate.ts` with `migrate(db, dir)`. It creates `schema_migrations`, applies pending `NNNN_*.sql` files in order (each file in its own transaction), and records each one. Write unit tests with temporary fixture folders for the first run, re-running (nothing is applied again and the data is unchanged), and adding a new file later. (AC-5, AC-6)
- [x] **T8:** Make `migrate` handle failures. A failing file rolls back and throws an error naming the file. An unapplied version below the highest applied version throws before anything runs. A `.sql` file that doesn't match the naming pattern throws. Write unit tests for each case. (AC-7, edge cases)
- [x] **T9:** Add `app.ts` with `createApp()`. It serves `GET /api/health`, returns a 404 `ErrorResponse` for unknown `/api/*` paths, and has a 500 error handler. Write API tests on port 0 using `fetch`. Install `express` and `@types/express`. (AC-2)
- [x] **T10:** Add `index.ts`, which loads the config, opens the database, runs the migrations, and calls listen. On `EADDRINUSE`, it prints "port N is already in use" and exits with code 1. On a migration error, it prints the error and exits with code 1. Add `apps/server/migrations/.gitkeep` and the server `dev` script (`node --watch src/index.ts`). (AC-1, AC-5, AC-7, edge case for the port in use)

### Client

- [x] **T11:** Add the Vite app: `index.html`, `vite.config.ts` (React plugin, port `5173`, and a `/api` proxy to `localhost:3000`), `main.tsx`, and an `App.tsx` with the "Job Tracker" heading. Add a client `dev` script. Write a UI test that `App` renders the heading. Install `react`, `react-dom`, their types, `vite`, and `@vitejs/plugin-react`. (AC-1)

### Wiring and docs

- [x] **T12:** Add a root `dev` script that runs the server and the web app with `concurrently --kill-others`, and install `concurrently`. (AC-1, edge case for Ctrl+C)
- [x] **T13:** Update `README.md` with the setup and commands, including `DATABASE_PATH` and `PORT`. Remove the "defined once spec 000 is implemented" note from `CLAUDE.md`. (US-1)

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

### Manual checks

| Check | AC | Result |
| ----- | -- | ------ |
| `npm run dev` on a fresh clone starts both processes, and `localhost:5173` shows "Job Tracker" | AC-1 | Pass, 2026-10-01. Both processes started, and the page at `localhost:5173` returned the "Job Tracker" title. The fresh-clone part is covered by the AC-3 reinstall check. |
| `curl localhost:5173/api/health` (through the proxy) returns `{"status":"ok"}` | AC-1, AC-2 | Pass, 2026-10-01. The response was `{"status":"ok"}`. |
| After `rm -rf node_modules && npm install`, `npm test`, `npm run lint`, and `npm run typecheck` all pass | AC-3 | Pass, 2026-10-01. After `rm -rf node_modules && npm ci`, all three commands exited with code 0 (5 test files, 19 tests). |
| A deliberate type error in each workspace fails `npm run typecheck` and names the file | AC-4 | Pass, 2026-10-01. A bad `src/bad.ts` in server, client, and shared each produced `src/bad.ts(1,14): error TS2322`, and npm's error output named the workspace. Exit code 2. |
| Starting a second server prints the port-in-use message and exits with code 1 | Edge | Pass, 2026-10-01. A second `node src/index.ts` on port 3999 printed "Port 3999 is already in use. Stop the other process or set PORT." and exited with code 1. |
| Ctrl+C on `npm run dev` leaves no `node` or `vite` processes | Edge | Pass, 2026-10-01. After SIGINT to the process group, `concurrently` stopped both processes, and `pgrep` found no `vite`, server, or `concurrently` processes. |
| With `DATABASE_PATH` set, the server creates the database there and leaves `data/` untouched | AC-9 | Pass, 2026-10-01. The database and its WAL files were created at the temporary path, and `data/` didn't exist afterward. |
| A broken migration stops startup, names the file, and exits with code 1 | AC-7 | Pass, 2026-10-01. The server printed "Migration 0001_broken.sql failed and was rolled back", including the cause ("no such table: nowhere"), and exited with code 1. |
| After the server's first start, `git status` doesn't show the database files | AC-8 | Pass, 2026-10-01. The server created `data/job-tracker.db` and its `-wal` and `-shm` files, and none appeared in `git status`. |

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- **T1:** TypeScript is pinned to `~6.0`. TypeScript 7 is now npm's `latest`, but `typescript-eslint` (needed for T2) supports only `>=4.8.4 <6.1.0`. Revisit when `typescript-eslint` supports 7.
- **T8:** Added a check that two migration files can't share a version, such as `0001_a.sql` and `0001_b.sql`. The plan didn't cover this case, and without it the second file fails with a confusing primary-key error and is then silently skipped on later runs. `plan.md` has been updated to match.
- **Rename:** After implementation, the owner asked to rename `apps/web` (`@job-tracker/web`) to `apps/client` (`@job-tracker/client`) so it pairs with `apps/server`. The constitution's tech stack table, `plan.md`, and these tasks are updated to match. "Web app" in prose still describes what the client is.
