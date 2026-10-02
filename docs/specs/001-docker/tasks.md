# 001: Run the app in Docker (tasks)

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

### Docs

- [x] **T1:** Add a short "Verification" section to `spec.md`. It says that AC-1, AC-3 to AC-6, and AC-8 need Docker, so they're verified by recorded manual checks, and that AC-2, AC-7, and AC-10 also have manual checks. Add a changelog line, and add the Packaging row to the constitution's tech stack table. (Constitution §3, plan)

### Production mode (without Docker)

- [x] **T2:** Extend `loadConfig` to return `clientDir`: `<repo>/apps/client/dist` when `NODE_ENV` is `production`, and `undefined` otherwise. Write unit tests for both cases. (AC-10)
- [x] **T3:** Change `createApp` to take `{ clientDir?: string }`. When `clientDir` is set, it throws "Client build not found at `<dir>`. Run `npm run build` first." if `index.html` is missing. Otherwise it serves `express.static(clientDir)` and falls back to `index.html` for non-`/api` `GET`s, after the `/api` routes and the `/api` 404. Write API tests against a temporary folder with a fake build: `/` and `/applications/5` return `index.html`, the asset is served, `/api/health` is still 200, an unknown `/api` path is still a JSON 404, and a missing `index.html` throws. A test without `clientDir` checks that `/` is still a 404. (AC-2, AC-10, AC-11, client-routes edge case)
- [x] **T4:** Update `index.ts` to pass `config.clientDir` to `createApp` inside the startup `try`, so a missing build exits with code 1. Add `SIGTERM` and `SIGINT` handlers that close the server, close all connections, close the database, and exit with code 0. Write an integration test that spawns `node src/index.ts` with a temporary `DATABASE_PATH` and `PORT=0`, waits for "Server listening", sends `SIGTERM`, and expects exit code 0 within 5 seconds. (AC-7, AC-11)
- [x] **T5:** Add the scripts: client `build` (`vite build`), server `start` (`NODE_ENV=production node src/index.ts`), and root `build` and `start`. (AC-10)

### Docker

- [x] **T6:** Add a `.dockerignore` that excludes `data/`, `**/*.db*`, `node_modules/`, `**/dist/`, `.git/`, `coverage/`, and `docs/`. (AC-8)
- [x] **T7:** Add a multi-stage `Dockerfile` based on `node:24-slim`. The `build` stage runs `npm ci` and `npm run build`. The `runtime` stage runs `npm ci --omit=dev`; copies the server `src` and `migrations`, the shared `src`, the workspace `package.json` files, and the client `dist`; and sets `ENV NODE_ENV=production`, `USER node`, and `CMD ["node", "apps/server/src/index.ts"]`. Check that `docker build` succeeds, including that `npm ci` accepts the npm 12 lockfile. (AC-1, AC-8)
- [x] **T8:** Add `compose.yaml` with one `app` service: build `.`, image `job-tracker`, ports `127.0.0.1:8080:3000`, volume `./data/docker:/app/data`, `DATABASE_PATH=/app/data/job-tracker.db`, and `restart: "no"`. (AC-1, AC-3, AC-4)

### Wiring and docs

- [x] **T9:** Update `README.md` with a "Run with Docker" section (`docker compose up --build`, port 8080, `data/docker/`, and stopping the app), a "Production build without Docker" section (`npm run build` and `npm start`), and notes on Linux bind-mount permissions, not opening Docker's database from the host while the container is running, and the log line that shows port 3000. Add `build` and `start` to the commands table. Add Docker to the `CLAUDE.md` commands. (US-1, US-5)

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

### Manual checks

| Check | AC | Result |
| ----- | -- | ------ |
| After `docker compose up --build --force-recreate` on a clean checkout (no `node_modules`), `localhost:8080` shows "Job Tracker" | AC-1 | Pass, 2026-10-01. The page title was "Job Tracker". `.dockerignore` keeps the host's `node_modules` out of the build, so the image doesn't depend on a host install. The port is bound only to `127.0.0.1:8080`. |
| `curl localhost:8080/api/health` returns `{"status":"ok"}`, and `curl localhost:8080/api/nope` returns a JSON 404 | AC-2 | Pass, 2026-10-01. The health check returned `{"status":"ok"}`, and `/api/nope` returned `{"error":"Not found"}` with status 404. |
| `data/docker/job-tracker.db` is created with `schema_migrations`, and the repo's `data/job-tracker.db` is untouched | AC-3 | Pass, 2026-10-01. `data/docker/job-tracker.db` was created with the `schema_migrations` table. The modified time of `data/job-tracker.db` was unchanged (16:10:44 before and after). |
| After `down`, `build --no-cache`, and `up`, the `schema_migrations` rows are unchanged | AC-4 | Pass, 2026-10-01. The temporary migration's record (`0001`, applied at `2026-10-01T20:13:25.960Z`) and its data row were identical before and after. |
| A temporary new migration is applied once after a rebuild | AC-5 | Pass, 2026-10-01, with `--force-recreate`. Each new migration (0002, 0003) was applied once, and earlier ones were skipped. Without `--force-recreate`, a stopped container was restarted on the old image and the migration was skipped. That led to the change in the start command (see Notes). |
| A temporary broken migration makes the container exit and name the file | AC-6 | Pass, 2026-10-01. The logs showed "Migration 0004_broken.sql failed and was rolled back", including the cause ("no such table: nowhere"). The container exited with code 1, and nothing was served on port 8080. The temporary migrations and `data/docker/` were removed afterward. |
| `docker compose down` and Ctrl+C on `up` each stop the container in under 5 seconds | AC-7 | Pass, 2026-10-01. `docker compose down` took 0.43 seconds. Ctrl+C on `up` stopped the container in 0.2 seconds with container exit code 0. |
| With `data/job-tracker.db` present, the built image contains no `*.db*` files | AC-8 | Pass, 2026-10-01. `find /` inside the image found 0 `*.db` or `*.db-*` files. |
| `npm run dev`, `npm test`, `npm run lint`, and `npm run typecheck` behave as they did in spec 000 | AC-9 | Pass, 2026-10-01. `npm run dev` served the page and the proxied health check at `localhost:5173`, and Ctrl+C left no processes. The server now also logs "Received SIGINT, shutting down." All three check commands exited with code 0 (6 test files, 27 tests). |
| `npm run build && npm start` serves the page and API at `localhost:3000` | AC-10 | Pass, 2026-10-01, run with `PORT=3005` because a pre-existing `job-tracker` container holds `127.0.0.1:3000` on this machine. `/api/health` returned `{"status":"ok"}`, `/` and `/applications/5` returned the "Job Tracker" page, the built JS asset returned 200 `text/javascript`, `/api/nope` returned a JSON 404, and SIGTERM shut the server down cleanly. |
| `npm start` without a build exits with code 1 and says to run `npm run build` | AC-11 | Pass, 2026-10-01. With `apps/client/dist` removed, the server printed "Client build not found at …/apps/client/dist. Run `npm run build` first." and exited with code 1. |
| With `data/docker/` deleted, `up` creates it and the database | Edge | Pass, 2026-10-01. The folder and database were recreated, and the health check returned ok. |
| With port 8080 taken, `up` fails with Docker's port error | Edge | Pass, 2026-10-01. Docker reported "listen tcp4 127.0.0.1:8080: bind: address already in use", and the container stayed in the Created state. |

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- **T5:** On this machine, a container left over from an earlier version of the app (`job-tracker`, from a previous Compose run in this folder) was holding `127.0.0.1:3000`, so the AC-10 check ran on `PORT=3005`. With the owner's OK, that container was stopped and removed before T7. Its image tag was taken over by the new build, and its `job-tracker_jobdata` volume was left untouched.
- **T7:** `npm ci` in `node:24-slim` (npm 11.19) accepted the npm 12 lockfile, so the npm upgrade fallback in the plan wasn't needed. Test files are also excluded in `.dockerignore`. The image is 368 MB, runs as `node`, and contains only production dependencies.
- **T8:** `docker compose up --build` doesn't recreate a stopped container, such as one left by Ctrl+C, even after the image is rebuilt. It restarts the old container on the old image, so new code and migrations are skipped. The documented start command is now `docker compose up --build --force-recreate`. `spec.md` (AC-1 and the changelog) and `plan.md` (a new decision row) are updated to match.
