# 004: Logging and observability (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Approved                 |
| Updated | 2026-10-01               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

A small logger written for this app, with no new dependencies. It's created once in `index.ts` and passed to `createApp`. Express middleware handles the request IDs, the request log lines, and the counters. The health check and a new endpoint for browser reports sit beside the existing routes. On the client, one module sends error reports, and it's wired into the window error events, a new error boundary, and `api.ts`.

```
apps/server/src/
  logger.ts         createLogger(): levels, terminal and JSON file output, daily files, 7-day cleanup,
                    request IDs through AsyncLocalStorage (AC-3–AC-10, AC-15)
  requestLog.ts     middleware: assigns the request ID, logs each request when it finishes,
                    counts API requests and 5xx errors (AC-1, AC-2, AC-6, AC-15, AC-19)
  health.ts         GET /api/health, and the RequestCounts type (AC-17–AC-19)
  clientErrors.ts   POST /api/client-errors (AC-11–AC-14)
  config.ts         adds logLevel and logDir (AC-3, AC-4, AC-10)
  app.ts            wires these in. errorHandler logs through the logger and returns the request ID (AC-16)
  index.ts          creates the logger and replaces every console.* call (AC-5)
packages/shared/src/
  observability.ts  HealthResponse, clientErrorReportSchema, ClientErrorReport, and the field limits
  index.ts          ErrorResponse gains an optional requestId. The old HealthResponse moves out.
apps/client/src/
  errorReporting.ts reportError() with the 10-per-minute limit, and installErrorReporting() for window events
  ErrorBoundary.tsx the "Something went wrong" screen (AC-12)
  main.tsx          installs reporting and wraps <App> in <ErrorBoundary>
  api.ts            reports network errors and 5xx responses (AC-13)
```

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Logging library | None. `logger.ts` is about 150 lines on top of `node:fs`. | The needs are small and specific: two output formats, daily files named by local date, and 7-day cleanup. A library would need three packages (a logger, a pretty printer, and a file roller) and still need custom cleanup rules. The constitution asks for a reason for each new dependency. | pino with pino-pretty and pino-roll, or winston with winston-daily-rotate-file |
| Logger interface | `logger.debug/info/warn/error(message, fields?)`. `fields` is a plain object added to the line. Errors in `fields.error` are turned into `{ name, message, stack }`. | Small and easy to fake in tests. | Child loggers or named categories, which nothing needs yet |
| Writing to files | `fs.appendFileSync` for each line, into `<logDir>/<YYYY-MM-DD>.log` | One user and low volume. Synchronous writes keep lines in order and are never lost on `process.exit`. | A write stream, which needs flushing on exit and reopening at midnight |
| Daily file name | `localDate(now, undefined)` from `localDate.ts`, computed for **each line** | Reuses the existing helper. Computing it per line handles midnight and clock changes without a timer (AC-8, edge cases). | A timer at midnight |
| Cleanup | Runs at startup and whenever the date in the file name changes. It deletes only files named `YYYY-MM-DD.log` whose date is more than 6 days before today. | Keeps 7 days including today (AC-9), and leaves other files alone. | Deleting by file modification time, which `touch` or a copy could change |
| File write failures | If creating the folder or appending fails, warn once in the terminal and keep logging there. Each later line tries the file again silently, and a successful write resets the warning. | The app keeps running when the disk is full or the folder is read-only (edge cases), and it recovers by itself. | Turning file logging off for good after the first failure |
| Terminal format | `2026-10-01T22:42:14.123-07:00 INFO  GET /api/applications 200 12ms id=3f2a9c1e`, with extra fields as `key=value` and stack traces on the following lines. Request IDs are shortened to 8 characters in the terminal only. No colors. | Easy to read in a terminal and in `docker compose logs` (AC-7). | Colors, which look garbled in Docker's logs |
| File format | One JSON object per line: `{ time, level, msg, ...fields }`, with the full request ID | Easy to search with `jq` or `grep` (AC-7). | |
| Time format | ISO 8601 with milliseconds and the local offset, from a helper in `logger.ts` | "Data and rules". `Date.toISOString()` only gives UTC. | |
| Log level | `LOG_LEVEL` is read in `loadConfig`. When it's not set, the level is `info` if `NODE_ENV` is `production` and `debug` otherwise. An unknown value throws `LOG_LEVEL must be one of debug, info, warn, error, got "x"`, which `index.ts` already turns into a startup failure. | AC-3 and AC-4, using the existing config pattern. | |
| Log folder | `logDir = path.join(path.dirname(databasePath), "logs")` | AC-10. `data/` is already ignored by git and already mounted as Docker's volume, so nothing else changes. | A separate `LOG_DIR` setting, which the owner decided against |
| Request IDs | `crypto.randomUUID()` for each request, sent back in an `X-Request-Id` header. An `AsyncLocalStorage` holds the ID while the request is handled, and the logger adds it to every line written inside that context. | Covers every line written while handling the request, including errors from deep in a handler (AC-15), without passing the ID around. | Passing `req` to every log call |
| When a request is logged | On the response's `close` event. If `res.writableFinished` is false, the line adds `aborted: true` and the message says "client disconnected". The duration comes from `performance.now()`. | One line for each request, including aborted ones (AC-1, edge cases). | `finish`, which doesn't fire for aborted requests |
| Request levels | A path under `/api`, other than `/api/health`, is an API request: `info` for status codes below 400, `warn` for 4xx, and `error` for 5xx. Everything else, meaning the page, static files, and the health check, is `debug`. The logged path is `req.originalUrl` without its query string. | AC-1, AC-2 | |
| Request bodies | When the active level is debug and `req.body` isn't empty, the request line adds `body`. | AC-6. The middleware reads `req.body` after `express.json()` has run. | |
| Counters | A `{ requests, errors }` object made in `createApp` and shared by the middleware and the health check. Only API requests count, so health checks don't (AC-19). It lives in memory, so a restart sets it back to zero. | AC-17, AC-19 | |
| Version | Read once from `apps/server/package.json` with `fs.readFileSync` when the module loads | The root `package.json` has no version. The server's is copied into the Docker image, so it's the app's version in every run mode. | The client's or shared package's version, which are the same today |
| Database check | `SELECT name FROM schema_migrations ORDER BY version DESC LIMIT 1` inside `try`/`catch`. If it fails, the response is 503 with database status "error" and `latestMigration: null`. | It proves the database answers queries and gives the latest migration in one query (AC-17, AC-18). | A separate `SELECT 1` |
| 500 responses | `errorHandler` becomes `errorHandler(logger)`. It logs `Unhandled error` at error level with the error, and responds `{ error: "Internal server error", requestId }`. | AC-16 | |
| Report validation | `clientErrorReportSchema` in shared uses Zod, like `applicationInputSchema`, and returns 400 with `fields` through the existing `fieldErrors()`. A valid report gets a 204 response. | AC-14, using spec 002's validation pattern | |
| Logging a report | `logger.error(message, { source: "browser", kind, page, stack, api })` | AC-11. The request line for `POST /api/client-errors` is also logged at info, like any API request. | |
| Rate limit | `errorReporting.ts` keeps the send times from the last 60 seconds and drops a report when there are already 10 | "Data and rules": 10 per minute, dropped without a message | A limit on the server, which wouldn't stop a page from sending anyway |
| Sending a report | `fetch("/api/client-errors", { method: "POST", keepalive: true, ... })` called directly, not through `api.ts`. Any failure is ignored. | A failed report is never reported, so it can't loop ("Data and rules"). `keepalive` lets a report finish while the page is reloading. | `navigator.sendBeacon`, which can't send `Content-Type: application/json` without a preflight |
| Field limits on the client | `reportError` cuts the message, stack, and page address to their limits before sending | A long stack trace still gets reported, instead of being rejected with a 400 (AC-14 is for reports that skip the client). | |
| Uncaught errors | `installErrorReporting()` adds `window` listeners for `error` and `unhandledrejection` | AC-11 | |
| Render crashes | `ErrorBoundary`, a class component (React has no hook for this), reports from `componentDidCatch` and shows the fallback screen | AC-12 | React 19's `onUncaughtError` root option, which can't show a fallback screen |
| Failed API calls | In `api.ts`'s `request()`, a network error or a 5xx response calls `reportError({ kind: "api", ... })` before the existing `ApiError` is thrown. Messages in the UI don't change. | AC-13 | |
| Quiet tests | `createApp`'s `logger` option defaults to a logger that writes nothing. Tests that check logging pass a logger that collects lines in an array. | Tests stay quiet ("Edge cases"), and the existing `createApp({ db })` calls keep working. | Turning logging off with an environment variable |
| Errors before the logger exists | If `loadConfig` throws, for example on a bad `LOG_LEVEL`, `index.ts` reports it through a terminal-only logger at error level | The rule that "the server no longer writes to the terminal any other way" (AC-5) still holds. | Keeping `console.error` for this one case |

## Data model

No change. The health check reads the existing `schema_migrations` table.

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/health` | — | `200` `HealthResponse` | `503` `HealthResponse` with `status: "error"` when the database check fails | AC-17–AC-19 |
| POST | `/api/client-errors` | `ClientErrorReport` | `204` | `400` `ValidationErrorResponse` | AC-11–AC-14 |
| any | any | — | Adds the `X-Request-Id` header | `500` gains `requestId` | AC-15, AC-16 |

`HealthResponse`:

```json
{
  "status": "ok",
  "version": "0.0.0",
  "uptimeSeconds": 42,
  "database": { "status": "ok", "latestMigration": "0002_add_job_details.sql" },
  "requests": 17,
  "errors": 0
}
```

`ClientErrorReport`:

```json
{
  "kind": "uncaught" | "unhandledRejection" | "render" | "api",
  "message": "1–2,000 chars",
  "stack": "optional, up to 20,000 chars",
  "page": "1–2,000 chars",
  "api": { "method": "GET", "path": "/api/applications", "status": 502 }   // only and required for kind "api"; status 0 = network error
}
```

## UI

- **ErrorBoundary** wraps `<App>`. When a component throws while rendering, the boundary shows a centered panel with the heading "Something went wrong", the line "The app hit an unexpected error.", and a "Reload" button that calls `location.reload()`. It shows no error details (AC-12). It uses the existing styles and colors in `styles.css`.
- Nothing else in the UI changes. Existing API error messages stay as they are (AC-13).

## Shared types

`packages/shared/src/observability.ts`:
- `LOG_LEVELS = ["debug", "info", "warn", "error"] as const` and the `LogLevel` type (used by the server's config)
- `HealthResponse`, which replaces the old `{ status: "ok" }`
- `CLIENT_ERROR_KINDS`, `clientErrorReportSchema`, and `ClientErrorReport`
- `CLIENT_ERROR_LIMITS = { message: 2000, stack: 20000, page: 2000 }`, used by both the schema and the client's trimming

`ErrorResponse` gains an optional `requestId?: string`.

## Test strategy

| AC | Level | What it checks |
| -- | ----- | -------------- |
| AC-1 | API | A request to a test app with a collecting logger produces one line with the request ID, method, path without the query, status, and duration. The level is info for 200, warn for 404 or 400, and error for 500. |
| AC-2 | API | With a built client folder, `GET /`, a static file, and `GET /api/health` are logged at debug. |
| AC-3, AC-4 | Unit | `loadConfig` gives `debug` by default, `info` with `NODE_ENV=production`, uses `LOG_LEVEL` when set, and throws on an unknown level with the list of valid levels. Logger: lines below the level aren't written to either output. |
| AC-5 | Process | Extends `index.test.ts`: the started server's output has "Server starting", "Migration applied", and "Listening" lines in the terminal format, and a log file appears in `<temp>/logs`. A bad `LOG_LEVEL` exits with code 1 and lists the valid levels. |
| AC-6 | API | A `POST` body appears on the request line at debug level and is absent at info. |
| AC-7 | Unit | The same message is written to a fake terminal stream as a readable line, and to a temporary folder as a parseable JSON line with the same fields. |
| AC-8 | Unit | With a fake clock moved past local midnight, the next line goes into the new day's file. |
| AC-9 | Unit | With files for 10 days plus `notes.txt` in a temporary folder, startup leaves 7 dated files and `notes.txt`. A day change triggers the cleanup again. |
| AC-10 | Unit | `loadConfig` puts `logDir` next to `DATABASE_PATH`. Manual check: `git status` after running the app, and `data/docker/logs` after running Docker. |
| AC-11 | Unit (client) | Dispatching `error` and `unhandledrejection` events on `window` sends a report with the matching kind, message, stack, and page. |
| AC-11, AC-14 | API | A valid report gets 204 and one error line with `source: "browser"`. A missing message, an unknown kind, or an over-limit field gets 400 with `fields`, and no browser line is logged. |
| AC-12 | UI | A child component that throws shows "Something went wrong" and a Reload button, sends a `render` report, and shows no error text. |
| AC-13 | Unit (client) | Through the fake server, a 500 and a network failure each send an `api` report, a 400 doesn't, and the `ApiError` message is unchanged. |
| Rate limit | Unit (client) | With a fake clock, 12 reports send 10. After 60 seconds, sending works again. A failed send doesn't trigger another report. |
| AC-15 | API | A route that logs a line and then throws: the line, the error line, and the request line all share the `X-Request-Id` value. |
| AC-16 | API | The 500 body is `{ error, requestId }`, and `requestId` matches the header. |
| AC-17 | API | The health check returns 200 with every field, the version from `package.json`, and the latest migration name. |
| AC-18 | API | With a closed database, the health check returns 503 with `status: "error"` and database status `"error"`. |
| AC-19 | API | After 3 API requests (one a 500) and 2 health checks, the counts are `requests: 3` and `errors: 1`. A new app starts at 0. |
| Edge cases | Unit | A log folder that can't be written (a file where the folder should be) gives one warning in the terminal and keeps terminal output. An aborted request is logged with `aborted: true`. |

## Risks and mitigations

- **Synchronous file writes slow down requests.** At one user's traffic, an append takes microseconds. If that changes, a write stream can replace it behind the same logger interface.
- **AsyncLocalStorage loses the context in callback-style code.** Express 5 handlers and `node:sqlite` are synchronous or use promises, so the context carries through. The AC-15 test guards this.
- **Request bodies at debug level contain personal job data.** Debug is the default only in development, and log files stay in `data/`, which isn't committed, as the owner chose in the spec.
- **Changing `HealthResponse` breaks a caller.** Only `app.test.ts` uses it, and that test is updated in the same task.
- **An error in a report loops back as another report.** Reports are sent outside `api.ts`, and failures are ignored.

## New dependencies

None.
