# 004: Logging and observability (tasks)

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

### Shared

- [x] **T1:** Add `observability.ts` with `LOG_LEVELS`, `CLIENT_ERROR_KINDS`, `CLIENT_ERROR_LIMITS`, `clientErrorReportSchema`, and `ClientErrorReport`. Add an optional `requestId` to `ErrorResponse`. Write unit tests that cover valid reports of each kind, a missing message, an unknown kind, each field over its limit, and `api` present on the wrong kind or missing on `api`. (AC-14)

### Server: logger

- [x] **T2:** Add `logLevel` and `logDir` to `loadConfig`. The level defaults to debug, or to info in production. `LOG_LEVEL` overrides it, and an unknown value throws a message that lists the valid levels. The log folder is `logs` next to the database. Write config tests for each case. (AC-3, AC-4, AC-10)
- [x] **T3:** Add `logger.ts` with `createLogger({ level, logDir, terminal, now })`. It provides the four levels, level filtering, readable terminal lines, JSON lines in the day's file, ISO times with the local offset, error serialization, `runWithRequestId()` with AsyncLocalStorage, and a silent logger plus a collecting logger for tests. Write unit tests for filtering, both formats carrying the same fields, the time format, and the request ID being added inside the context. (AC-3, AC-4, AC-7, AC-15)
- [x] **T4:** Add daily files to the logger: the file name is the local date of each line, cleanup runs at startup and when the day changes, and file failures warn once and recover. Write unit tests with a fake clock and a temporary folder for crossing midnight, 10 days of files plus `notes.txt`, and a folder that can't be written. (AC-8, AC-9, edge cases)

### Server: requests, errors, health, reports

- [x] **T5:** Add the `requestLog.ts` middleware and wire it into `createApp` with an optional `logger` that is silent by default. It assigns `X-Request-Id`, writes one line per request on `close`, sets the level from the status code, logs page, static file, and health check requests at debug, strips the query, includes the body at debug, and marks aborted requests. Write API tests with a collecting logger, including a built client folder for the static case. (AC-1, AC-2, AC-6, AC-15, edge cases)
- [x] **T6:** Change `errorHandler` to `errorHandler(logger)`, logging the error under the request ID and returning `{ error, requestId }`. Update the existing errorHandler test, which uses `console.error` today. Write an API test for a route that logs and then throws, checking that every line and the response share the ID. (AC-15, AC-16)
- [x] **T7:** Add `health.ts` and the shared `HealthResponse`, along with the request and error counters, the version from `apps/server/package.json`, and the database check that returns 503 when it fails. Replace the existing health test. Write API tests for the fields, a closed database, counts that leave out health checks, and a new app starting at zero. (AC-17, AC-18, AC-19)
- [x] **T8:** Add `clientErrors.ts` for `POST /api/client-errors`, returning 204 and logging the report at error level with `source: "browser"`, or returning 400 with `fields`. Write API tests for valid reports, invalid reports, and invalid reports logging no browser line. (AC-11, AC-14)
- [x] **T9:** In `index.ts`, create the logger from the config and pass it to `createApp`. Replace every `console.*` call with log lines for startup, migrations, listening, shutdown, and startup failures, including a terminal-only logger for config errors. Extend `index.test.ts` to check the startup lines, the log file in `<temp>/logs`, and that a bad `LOG_LEVEL` exits with code 1. Check that no `console.` calls remain in the server's source. (AC-5, AC-10)

### Client

- [x] **T10:** Add `errorReporting.ts` with `reportError()`, which limits reports to 10 per rolling minute, trims fields to `CLIENT_ERROR_LIMITS`, sends with `fetch` and `keepalive`, and ignores failures. Add `installErrorReporting()` for `error` and `unhandledrejection`, and call it from `main.tsx`. Add the endpoint to the fake test server. Write unit tests for the window events, the rate limit with a fake clock, trimming, and a failed send not reporting again. (AC-11)
- [x] **T11:** Add `ErrorBoundary.tsx` with the "Something went wrong" screen and its styles, and wrap `<App>` in `main.tsx`. Write a UI test in which a throwing child shows the screen and the Reload button, sends a `render` report, and shows no error details. (AC-12)
- [x] **T12:** Report network errors and 5xx responses from `api.ts`'s `request()`. Write tests through the fake server in which a 500 and a network failure each send an `api` report, a 400 doesn't, and the `ApiError` messages don't change. (AC-13)

### Docs

- [x] **T13:** Update the README, covering `LOG_LEVEL` in Configuration, where the log files are and how long they're kept, the new health check fields and `POST /api/client-errors` in API, and the `X-Request-Id` header. Run the manual checks below and record their results. (AC-2, AC-7, AC-10, AC-12)

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

### Manual checks

| Check | AC | Result |
| ----- | -- | ------ |
| `npm run dev`: requests appear in the terminal at debug, including the body of a save, and `data/logs/<today>.log` holds the same lines as JSON | AC-3, AC-6, AC-7 | Pass, 2026-10-01, run by Claude. It used a rejected save (an empty company name), so the dev data wasn't changed. Health checks showed at DEBUG, and a browser report sent through the Vite proxy was logged at ERROR with its stack. |
| `npm run build && npm start`: only API requests are shown at info, and loading the page adds no lines | AC-2, AC-3 | Pass, 2026-10-01, run by Claude. The page, a client route, the built assets, and the health check added no lines. The two API requests did. |
| Docker: `docker compose logs` shows readable lines, `data/docker/logs/<today>.log` exists on the host, and `git status` is clean | AC-7, AC-10 | Pass, 2026-10-01, run by Claude. The file is named by the UTC date (`2026-10-02.log`), as the README says. Stopping the container logged "Received SIGTERM, shutting down". |
| `curl localhost:3000/api/health` shows every field, and the counts go up as the board is used | AC-17, AC-19 | Pass, 2026-10-01, run by Claude, in dev, production, and Docker. Every field was present, `latestMigration` was `0002_add_job_details.sql`, and the counts matched the API requests made, with health checks left out. |
| In the browser, a forced render error shows the "Something went wrong" screen, Reload recovers, and the report is in the log | AC-11, AC-12 | Pass, 2026-10-01, run by the owner with a temporary crash hook (removed). "Something went wrong" showed, Reload recovered, and the report was logged at ERROR with `kind: render` and its stack. |
| Stop the server while the app is open, then save: the usual error message shows, and once the server is back, no report storm happens | AC-13 | Pass, 2026-10-01, run by the owner. With the server stopped, the usual error message showed, and after it restarted no browser reports were logged. |

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- **T2:** An empty `LOG_LEVEL` counts as unset, as an empty `DATABASE_PATH` already does, so a Compose file can pass `LOG_LEVEL=` without stopping the app.
- **T6:** On Node 24, the request ID survives `express.json()`'s callbacks, so no extra step is needed to restore it after the body parser. The AC-15 test sends a JSON body, which guards this.
- **T7:** The version is read from `apps/server/package.json` with `fs.readFileSync`, not a JSON import, because a JSON import needs `resolveJsonModule` and a file outside the server's `src` folder in its TypeScript settings. `plan.md` is updated to match.
- **T9:** Added an ESLint `no-console` rule for the server's non-test source, so the rule that "the server no longer writes to the terminal any other way" (AC-5) stays enforced. The "Server listening" line no longer repeats the database path, which is now on the "Server starting" line.
