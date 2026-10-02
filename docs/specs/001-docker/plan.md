# 001: Run the app in Docker (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Approved                 |
| Updated | 2026-10-01               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

**Production mode** is when the server serves the client as well as the API. Only the client needs a build step. Node runs the server's `.ts` files directly in production, just as it does in development, so the server isn't compiled.

```
npm run build  →  vite build  →  apps/client/dist/
npm start      →  NODE_ENV=production node apps/server/src/index.ts
                  └─ Express: /api/* (as today) + apps/client/dist (static) + index.html fallback
```

The Docker image is that same production build. It has a multi-stage `Dockerfile`: one stage builds the client, and a slim runtime stage holds only production dependencies, the server source, the migrations, and `dist/`. `compose.yaml` publishes the container's port 3000 as `127.0.0.1:8080` and bind-mounts `./data/docker` as the container's data folder. The container's default database path (`<repo>/data/job-tracker.db`, where the repo is `/app` in the image) therefore points at the host's `data/docker/job-tracker.db`, which keeps it separate from the file `npm run dev` uses (AC-3).

**Shutdown:** the server handles `SIGTERM` and `SIGINT` by closing the HTTP server and its connections and then the database. This makes `docker compose down` and Ctrl+C fast (AC-7), and it helps `npm start` too.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| How the server knows it's in production | `NODE_ENV=production`, which makes `loadConfig` return `clientDir` (`<repo>/apps/client/dist`). Otherwise `clientDir` is `undefined`. | A standard convention, and Express also tunes itself for it. `npm run dev` stays unchanged (AC-9). | A `--serve-client` flag, or a `CLIENT_DIR` variable (more surface for no current need) |
| Serving the client | `createApp({ clientDir })` adds `express.static(clientDir)` and a `GET` fallback to `index.html` for any non-`/api` path, after the `/api` routes and the `/api` 404 | The fallback covers the client-routes edge case, and `/api` 404s stay JSON (AC-2). No new dependency. | Serving the client from a separate web server such as nginx, which would need two processes in one container |
| Missing build | `createApp` throws "Client build not found at `<dir>`. Run `npm run build` first." if `index.html` is missing, and `index.ts` exits with code 1 | Easy to unit-test (AC-11) | Checking in `index.ts` only, which is harder to test |
| Compiling the server | None. Production runs `.ts` with Node's type stripping, as in development. | A single code path and no build output to keep in sync. Spec 000 has already proven this works. | `tsc` to `dist/`, which adds a build and differences between dev and production |
| Base image | `node:24-slim` | Official Debian-based Node 24 LTS image. `node:sqlite` is built in. glibc makes any future native dependency easier. | `node:24-alpine`: smaller, but musl can complicate native modules later |
| Image stages | `build` stage: `npm ci` and `npm run build`. `runtime` stage: `npm ci --omit=dev`, then copy `apps/server/{src,migrations}`, `packages/shared/src`, the workspace `package.json` files, and `apps/client/dist` from `build`. | Keeps dev tools (Vite, TypeScript, ESLint, Vitest) out of the image | A single stage, which would ship every dev dependency |
| Process in the container | `CMD ["node", "apps/server/src/index.ts"]` with `ENV NODE_ENV=production`, running as the built-in `node` user | Node gets the stop signals directly, which npm doesn't forward reliably when it's PID 1. Running as a non-root user is safer. | `npm start` as the command; running as root |
| Stop signals | `process.on("SIGTERM" / "SIGINT")`, then `server.close()`, `server.closeAllConnections()`, `db.close()`, and `process.exit(0)` | Node ignores `SIGTERM` by default when it's PID 1, which would make Docker wait 10 seconds and then kill it (AC-7). Closing the database cleanly also checkpoints the WAL. | Compose `init: true` (tini), which still wouldn't close the database |
| Host port | `127.0.0.1:8080:3000` in Compose | Port 8080 is from the spec. Binding to `127.0.0.1` keeps the app off the network (a non-goal). Inside the container the default port 3000 is unchanged, so no `PORT` override is needed. | `8080:3000`, which listens on every interface |
| Database location in Docker | Bind mount `./data/docker:/app/data`. `DATABASE_PATH` is also set explicitly in Compose. | A separate file from the dev database (AC-3). It's on the host and survives rebuilds (AC-4). `data/` is already gitignored. | A named volume (you chose a host folder) |
| Keeping data out of the image | A `.dockerignore` that excludes `data/`, `**/*.db*`, `node_modules/`, `**/dist/`, `.git/`, `coverage/`, and `docs/` | AC-8. It also gives faster, cache-friendly builds. | |
| Restart policy | Compose `restart: "no"` | You chose no automatic restart. | `unless-stopped` |
| Start command | `docker compose up --build --force-recreate` | Found during T8: when a stopped container exists (for example, after Ctrl+C), `up --build` rebuilds the image but restarts the old container, so new code and migrations are skipped. `--force-recreate` always starts from the new image. Data is safe because it lives in the bind mount. | Telling you to always stop with `docker compose down`, which is easy to forget after Ctrl+C |
| Constitution | Add a row to the tech stack table: Packaging is Docker Compose, single image, local only. | The constitution lists the stack, and Docker is now part of it. | |

## Data model

No change.

## API

No new endpoints. In production mode, routing is:

| Method | Path | Response | ACs |
| ------ | ---- | -------- | --- |
| GET | `/api/health` | Unchanged: `200` `HealthResponse` | AC-2 |
| any | `/api/*` (unknown) | Unchanged: `404` `ErrorResponse` | AC-2 |
| GET | A file in `dist/`, such as `/assets/index-abc.js` | The file | AC-1, AC-10 |
| GET | Any other path, such as `/` or `/applications/5` | `dist/index.html` | AC-1, AC-10, client-routes edge case |

In development mode (no `clientDir`), non-`/api` paths get Express's default 404, as they do today. Vite serves the page.

## UI

No change.

## Shared types

No change.

## Scripts

| Where | Script | Command |
| ----- | ------ | ------- |
| root | `build` | `npm run build -w @job-tracker/client` |
| root | `start` | `npm run start -w @job-tracker/server` |
| client | `build` | `vite build` |
| server | `start` | `NODE_ENV=production node src/index.ts` |

## Test strategy

The Docker-specific criteria need Docker running, so they're verified by recorded manual checks rather than in `npm test`. The constitution requires the spec to say so when an AC has no automated test, so `spec.md` will get a short "Verification" note, called out in review.

| AC   | Test level | What it checks |
| ---- | ---------- | -------------- |
| AC-1 | Manual (Docker) | After `docker compose up --build --force-recreate` on a clean checkout, `localhost:8080` shows "Job Tracker". |
| AC-2 | API and manual | API: with `clientDir`, `/api/health` is still 200 and unknown `/api` paths are still a JSON 404, not `index.html`. Manual: `curl` against port 8080. |
| AC-3 | Manual (Docker) | `data/docker/job-tracker.db` is created and has `schema_migrations`. The repo's `data/job-tracker.db` isn't touched (by checking its modified time, or that it doesn't exist). |
| AC-4 | Manual (Docker) | After `down`, `build --no-cache`, and `up`, `schema_migrations` rows and `applied_at` values are unchanged. |
| AC-5 | Manual (Docker) | Add a temporary `0001_docker_check.sql`, rebuild, and confirm it's applied once. Then remove it and delete `data/docker/`. |
| AC-6 | Manual (Docker) | Add a temporary broken migration, rebuild, and confirm the container exits with the failing file named. |
| AC-7 | Integration and manual | Integration: spawn `node src/index.ts` with a temporary database, wait for "Server listening", send `SIGTERM`, and expect exit code 0 within 5 seconds. Manual: `time docker compose down` takes under 5 seconds. |
| AC-8 | Manual (Docker) | With a `data/job-tracker.db` present, build, then confirm `docker run --rm job-tracker find / -name '*.db*'` finds nothing. |
| AC-9 | Manual | `npm run dev`, `npm test`, `npm run lint`, and `npm run typecheck` behave as they did in spec 000. |
| AC-10 | API, unit, and manual | API: with `clientDir`, `/` and `/applications/5` return `index.html`, and a file in `assets/` is served. Unit: `loadConfig({ NODE_ENV: "production" })` returns `clientDir`, and without it `clientDir` is `undefined`. Manual: `npm run build && npm start`, then open `localhost:3000`. |
| AC-11 | Unit | `createApp({ clientDir })` throws the "Run `npm run build` first" error when `index.html` is missing. |
| Edge: missing data folder | Manual (Docker) | Delete `data/docker/`, run `up`, and the folder and database are created. |
| Edge: port 8080 in use | Manual (Docker) | With something on port 8080, `up` fails with Docker's port error. |

API tests use a temporary folder with a fake `index.html` and `assets/app.js`, so they don't depend on a real build.

## Risks and mitigations

- **npm version mismatch:** the lockfile was created with npm 12, but `node:24-slim` ships npm 11. Lockfile version 3 is shared, so `npm ci` should work. If it doesn't, the Dockerfile installs the matching npm with `npm i -g npm@12` in the build stage.
- **Bind-mount permissions:** the container runs as `node` (uid 1000). On macOS, Docker Desktop maps file ownership, so this works. On Linux, a missing `data/docker/` created by Docker would be owned by root and not writable. This app targets macOS, so the risk is documented in the README instead of handled.
- **SQLite WAL on a bind mount:** WAL relies on shared memory, which can't be shared across the VM boundary. That's safe as long as only the container opens Docker's database, which is why it's a separate file (AC-3). The README will say not to open `data/docker/job-tracker.db` from the host while the container is running.
- **Misleading log line:** inside the container, the server logs `localhost:3000`, but you reach it on port 8080. The README notes this. A configurable public URL isn't worth adding yet.

## New dependencies

None. `express.static` is built into Express, and Docker isn't an npm dependency.
