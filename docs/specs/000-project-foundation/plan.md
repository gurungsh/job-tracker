# 000: Project foundation (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Approved                 |
| Updated | 2026-10-01               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Set up an npm workspaces monorepo with three ESM TypeScript workspaces: `apps/server`, `apps/client`, and `packages/shared`. The main decision is to **lean on Node 24's built-in features** instead of adding dependencies. The server runs its `.ts` sources directly with Node's native type stripping, so it needs no build step or `tsx`. It talks to SQLite through the built-in `node:sqlite` module, so it needs no native driver.

The server is split so that each part can be tested without the others:

```
apps/server/src/
  config.ts     reads PORT and DATABASE_PATH, applies defaults          (AC-5, AC-9)
  db.ts         openDatabase(path): creates the parent folder, opens the file  (AC-5, AC-9)
  migrate.ts    migrate(db, dir): applies pending .sql files in order    (AC-5, AC-6, AC-7)
  app.ts        createApp(): the Express app with /api/health        (AC-2)
  index.ts      wires it all up: config → db → migrate → listen      (AC-1, port edge case)
apps/server/migrations/   versioned .sql files (empty for now apart from .gitkeep)
```

During development, Vite serves the web app and proxies `/api/*` to the server. A single root `npm run dev` runs both processes and stops both on Ctrl+C.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| SQLite driver | Built-in `node:sqlite` (`DatabaseSync`) | No dependency and no native compile step. Its synchronous API is enough for a single-user app. | `better-sqlite3`: mature, but needs a native build. |
| Running server TS | Node 24 native type stripping (`node --watch src/index.ts`) | No build step and no extra dependency. Requires `erasableSyntaxOnly`, so no enums or parameter properties. | `tsx`: handles more syntax, but adds a dependency. It's the fallback if stripping causes trouble. |
| Server framework | Express 5 | Set by the constitution. Version 5 forwards rejected async handlers to the error handler. | Express 4 |
| Module system | ESM everywhere (`"type": "module"`, `module: nodenext`) | It matches Node's native TS and Vite. | CommonJS |
| Shared package consumption | `@job-tracker/shared` exports its `.ts` source directly | Node, Vite, and Vitest can all load it, so the package needs no build. | Building `shared` to `dist/` first |
| Running two dev processes | `concurrently` with `--kill-others` | It runs both processes with labeled output and stops both on Ctrl+C or a crash (spec edge case). | npm `&` scripts, which leave orphaned processes and don't work on Windows |
| Dev API routing | The Vite dev server proxies `/api` to the server | The web app uses relative URLs and needs no CORS setup. | CORS on the server |
| Typecheck | `tsc --noEmit` in each workspace, run by the root script with `--workspaces` | It reports the failing file (AC-4). Each workspace keeps its own lib and DOM settings. | `tsc -b` project references, which add more config than this needs |
| Lint | ESLint flat config at the root with `typescript-eslint` (type-aware) and `eslint-plugin-react-hooks` for the web app | One config covers all workspaces. | Biome: faster, but less coverage of TS and React rules |
| Tests | One root Vitest config with `projects` for each workspace. Server and shared tests run in `node`, and client tests run in `jsdom`. | `npm test` covers all workspaces in one run (AC-3). | A separate Vitest run per workspace |
| API tests | Start `createApp()` on port 0 and call it with the built-in `fetch` | No dependency needed. | `supertest` |
| Request validation | Not added yet | The only endpoint takes no input. The first spec with request bodies will choose a library. | `zod` now (unused) |
| Database location | `DATABASE_PATH` env var, defaulting to `<repo>/data/job-tracker.db` and resolved from the server's file location, not the current working directory | It meets AC-5 and AC-9, and the path is the same no matter where the command runs. | Resolving from the current working directory |
| Port | `PORT` env var, defaulting to `3000` | A conventional default that can be overridden. | |

## Data model

No domain tables. The migration runner creates and owns one bookkeeping table, outside the migration files:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,   -- e.g. "0001", taken from the file name
  name       TEXT NOT NULL,      -- full file name, e.g. "0001_create_applications.sql"
  applied_at TEXT NOT NULL       -- ISO 8601 UTC timestamp
);
```

**Migration rules** (in `migrate.ts`):

- Files live in `apps/server/migrations/` and are named `NNNN_snake_case.sql`. Files that don't match the pattern cause an error, so no file is silently skipped. Two files with the same version also cause an error.
- On startup, the runner sorts the files by version. Each file that hasn't been applied yet runs inside its own `BEGIN … COMMIT` and is recorded in `schema_migrations` in the same transaction. On error, the runner rolls back and throws an error naming the file (AC-7). SQLite DDL is transactional, so the rollback is complete.
- Applied versions are skipped (AC-6).
- If a file that hasn't been applied has a lower version than the highest applied version, the runner throws an error naming the file and runs nothing (an edge case).
- `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` are set when the database opens.

No migration files ship with this spec. Tests use their own temporary migration folders as fixtures.

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/health` | None | `200` `HealthResponse`: `{ "status": "ok" }` | None | AC-2 |

Unknown `/api/*` routes return `404` with `{ "error": "Not found" }`. A final error handler returns `500` with `{ "error": "Internal server error" }` and logs the error. Both bodies use the shared `ErrorResponse` type.

## UI

There is a single placeholder page (`App.tsx`) that shows the heading "Job Tracker". It makes no API calls, so it has no loading, empty, or error states (AC-1). Vite's dev port is `5173`.

## Shared types

In `packages/shared/src/index.ts`:

```ts
export type HealthResponse = { status: "ok" };
export type ErrorResponse = { error: string };
```

## Test strategy

| AC   | Test level | What it checks |
| ---- | ---------- | -------------- |
| AC-1 | UI and manual | A UI test checks that `App` renders the "Job Tracker" heading. A recorded manual check confirms that `npm run dev` starts both processes and that the page loads at `localhost:5173`. |
| AC-2 | API | `GET /api/health` returns 200 and `{ status: "ok" }`, typed as `HealthResponse`. An unknown `/api` path returns 404. |
| AC-3 | Manual | Recorded check: `npm test`, `npm run lint`, and `npm run typecheck` all pass from the root on a clean install. |
| AC-4 | Manual | Recorded check: a deliberate type error in each workspace makes `npm run typecheck` fail and name the file. |
| AC-5 | Unit | `openDatabase` on a path whose folder doesn't exist creates the folder and the file. `migrate` applies the fixture migrations and records them. |
| AC-6 | Unit | Running `migrate` twice applies nothing the second time, and rows inserted in between are unchanged. |
| AC-7 | Unit | A fixture with a failing second statement throws an error naming the file, leaves no partial table, and records nothing for that version. Earlier migrations stay applied. |
| AC-8 | Unit | `git check-ignore` reports the default database path and its `-wal`/`-shm` files as ignored. |
| AC-9 | Unit | `loadConfig` with `DATABASE_PATH` set returns that path. Without it, `loadConfig` returns the repo default. |
| Edge: out-of-order migration | Unit | An unapplied lower version after a higher applied version throws an error naming the file. |
| Edge: bad file name | Unit | A `.sql` file that doesn't match `NNNN_*.sql` throws. |
| Edge: duplicate version | Unit | Two files sharing a version throw an error naming both, and nothing runs. |
| Edge: port in use | Manual | Recorded check: starting a second server prints a clear "port 3000 is already in use" message and exits with code 1. |
| Edge: Ctrl+C | Manual | Recorded check: Ctrl+C on `npm run dev` leaves no `node` or `vite` process running. |

Manual checks are recorded in `tasks.md` next to the task that verifies them.

## Risks and mitigations

- **`node:sqlite` stability:** Node 24 may print an experimental or release-candidate warning. The API we use (`DatabaseSync`, `exec`, `prepare`) is small, so swapping to `better-sqlite3` later would touch only `db.ts` and `migrate.ts`.
- **Type stripping limits:** enums, namespaces, and parameter properties aren't supported, and relative imports need `.ts` extensions. `erasableSyntaxOnly` and `allowImportingTsExtensions` in the server's tsconfig make `tsc` catch both. If stripping fails to load `@job-tracker/shared` through the workspace symlink, the fallback is `tsx` (the decision above).
- **Test database isolation:** tests always use temporary paths and never the default file, which the AC-9 override makes possible.

## New dependencies

| Package | Workspace | Why |
| ------- | --------- | --- |
| `express` | server | The HTTP server (set by the constitution). |
| `@types/express`, `@types/node` | server (dev) | Types for Express and the Node built-ins, including `node:sqlite`. |
| `react`, `react-dom` | client | The UI (set by the constitution). |
| `@types/react`, `@types/react-dom` | client (dev) | Types for React. |
| `vite`, `@vitejs/plugin-react` | client (dev) | The dev server and build (set by the constitution). |
| `jsdom`, `@testing-library/react` | client (dev) | Rendering components in tests (AC-1). |
| `typescript` | root (dev) | Typechecking (AC-3, AC-4). |
| `vitest` | root (dev) | The test runner (set by the constitution). |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `globals` | root (dev) | Linting (AC-3). |
| `concurrently` | root (dev) | Runs the server and web app together and stops both on exit (AC-1, Ctrl+C edge case). |

Nothing beyond `express`, `react`, and `react-dom` is a runtime dependency.
