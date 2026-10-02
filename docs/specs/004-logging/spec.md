# 004: Logging and observability

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | In Progress                                            |
| Branch  | `feature/logging`                                      |
| Created | 2026-10-01                                             |
| Updated | 2026-10-01                                             |
| Depends | [000: Project foundation](../000-project-foundation/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

When something goes wrong in job-tracker today, I have little to go on. The server prints a few unstructured lines to the terminal, which are lost when it restarts. Errors in the browser never reach the server. Nothing tells me which version is running or whether the database is healthy. This spec makes the app explain itself before more features are added.

## Goals

- Log every API request with its outcome and how long it took.
- Log server events at clear levels (debug, info, warn, error), with the level adjustable.
- Keep logs in daily files for a week, as well as showing them in the terminal.
- Get browser errors into the same logs as server errors.
- Tie each request's log lines together, and link an error response back to its log entry.
- Check the app's health, version, uptime, and request counts at one address.

## Non-goals (out of scope)

- A screen in the app for viewing logs or health.
- Sending logs or metrics to an external service.
- Alerts or notifications.
- Charts, history, or counters that survive a restart.
- Tracing the time spent inside a request, such as database timings.

## User stories

- **US-1:** As the owner, I want every API request logged with its result and duration, so that I can see what the app did and spot slow or failing requests.
- **US-2:** As the owner, I want server messages to have levels that I can turn up or down, so that I see more detail while developing and less noise otherwise.
- **US-3:** As the owner, I want logs saved to daily files that are cleaned up automatically, so that I can look back after a restart without filling my disk.
- **US-4:** As the owner, I want browser errors reported to the server, so that I learn about problems I'd otherwise miss.
- **US-5:** As the owner, I want a friendly screen instead of a blank page when the app crashes, so that I know something went wrong and can recover.
- **US-6:** As the owner, I want an error I see to point to its log entry, so that I can find out what happened.
- **US-7:** As the owner, I want a health check that reports status, version, uptime, the database, and request counts, so that I can tell at a glance whether the app is working.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** the app is running
  - **When** any API request finishes
  - **Then** one log line records the time, level, request ID, method, path, status code, and duration in milliseconds. The level is info for 1xx–3xx, warn for 4xx, and error for 5xx. Query strings are left out of the path.
- **AC-2** (US-1)
  - **Given** the app is running in production
  - **When** the browser loads the page or its static files, or something calls the health check
  - **Then** those requests are logged at debug level, so they're hidden at the default production level.
- **AC-3** (US-2)
  - **Given** I start the app without setting a log level
  - **When** it logs messages
  - **Then** the level is debug in development (`npm run dev`), and info in production (`npm start` and Docker). Messages below the active level aren't written anywhere.
- **AC-4** (US-2)
  - **Given** I start the app with the log level set to debug, info, warn, or error
  - **When** it logs messages
  - **Then** that level is used in any mode. An unknown level stops the app at startup with a message that lists the valid levels.
- **AC-5** (US-2)
  - **Given** the app is running
  - **When** it starts, applies a migration, starts listening, shuts down, or hits an unexpected error
  - **Then** each event is logged at the right level, as listed in "Data and rules". The server no longer writes to the terminal any other way.
- **AC-6** (US-1, US-2)
  - **Given** the log level is debug
  - **When** an API request with a body finishes
  - **Then** its log line also includes the request body. At info and above, request bodies are never logged.
- **AC-7** (US-3)
  - **Given** the app is running
  - **When** it logs a message at or above the active level
  - **Then** the message appears in the terminal as a readable line, and in the current day's log file as one JSON object per line with the same information.
- **AC-8** (US-3)
  - **Given** the app keeps running past midnight, local time
  - **When** it logs a message on the new day
  - **Then** the message goes into a new file for that day, and the previous day's file is left complete.
- **AC-9** (US-3)
  - **Given** the log folder holds files from more than 7 days back
  - **When** the app starts, or a new day's file is started
  - **Then** log files older than 7 days are deleted, and the 7 most recent days, including today, are kept. Other files in the folder are untouched.
- **AC-10** (US-3)
  - **Given** I run the app with `npm run dev`, `npm start`, or Docker
  - **When** it writes log files
  - **Then** they're in a `logs` folder next to the database, so Docker's logs land on my machine with its data, and they're never committed to git.
- **AC-11** (US-4)
  - **Given** the app is open in the browser
  - **When** an uncaught error or an unhandled promise rejection happens
  - **Then** it's reported to the server, which logs it at error level, marked as coming from the browser, with the message, stack trace, and page address.
- **AC-12** (US-4, US-5)
  - **Given** the app is open in the browser
  - **When** a component crashes while rendering
  - **Then** the crash is reported as in AC-11, and instead of a blank page, I see a "Something went wrong" screen with only a short message and a button to reload the app. No error details are shown.
- **AC-13** (US-4)
  - **Given** the app is open in the browser
  - **When** an API call fails because of a network error or a 5xx response
  - **Then** it's reported as in AC-11, with the method, path, and status (or "network error"). The app's existing error messages still appear as before.
- **AC-14** (US-4)
  - **Given** a browser error report reaches the server directly
  - **When** it's missing a message, isn't valid, or has fields over the limits in "Data and rules"
  - **Then** the server rejects it with a 400 error that names the invalid fields, and logs nothing for it.
- **AC-15** (US-6)
  - **Given** any API request
  - **When** the response is sent
  - **Then** it carries a request ID in a response header, and every log line written while handling the request includes the same ID.
- **AC-16** (US-6)
  - **Given** an API request fails with an unexpected server error
  - **When** the 500 response is sent
  - **Then** its body includes the request ID with the error message, and the error with its stack trace is logged under that ID.
- **AC-17** (US-7)
  - **Given** the app is running and the database works
  - **When** I request the health check
  - **Then** it responds 200 with: status "ok", the app version, uptime in seconds, the database status "ok" with the latest applied migration, and the number of API requests and of 5xx errors since the server started.
- **AC-18** (US-7)
  - **Given** the database can't answer a query
  - **When** I request the health check
  - **Then** it responds 503 with status "error" and the database status "error". The other fields are still included.
- **AC-19** (US-7)
  - **Given** the health check has been requested several times
  - **When** I check the request counts
  - **Then** health check requests themselves aren't counted, and the counts start at zero again after a restart.

## Data and rules

**Log levels**, from most to least detailed: debug, info, warn, error. The active level shows that level and everything after it.

**What is logged, and at which level:**

| Event | Level |
| ----- | ----- |
| API request finished | info, warn for 4xx, error for 5xx (AC-1) |
| Static file, page, or health check request | debug (AC-2) |
| Request body | debug only, on the request's line (AC-6) |
| Server starting: port, database path, log folder, level | info |
| Migration applied | info |
| Shutdown signal received | info |
| Unexpected server error, with stack trace | error |
| Startup failure, such as a port already in use | error |
| Browser error report | error |

**Every log line has:** the time (ISO 8601 with the local offset), the level, and a message. Request lines add the request ID, method, path, status, and duration. Browser reports add the source ("browser"), page address, and stack trace.

**Log files:**
- One file per local calendar day, named by its date, such as `2026-10-01.log`.
- Kept for 7 days, including today. Older log files are deleted (AC-9).
- One JSON object per line.

**Browser error reports:**

| Field | Rules |
| ----- | ----- |
| Kind | Uncaught error, unhandled rejection, render crash, or failed API call. Required. |
| Message | Text, 1–2,000 characters. Required. |
| Stack trace | Text, up to 20,000 characters. Optional. |
| Page address | Text, up to 2,000 characters. Required. |
| API call | For failed API calls only: method, path, and status, or "network error". |

- The browser sends at most 10 reports per minute. Reports past that limit are dropped without a message.
- A report that fails to send isn't reported again, so a broken connection can't cause a loop.

**Health check:**

| Field | Value |
| ----- | ----- |
| Status | "ok" or "error" |
| Version | The version number in the app's `package.json`, as is |
| Uptime | Whole seconds since the server started |
| Database | Status "ok" or "error", and the name of the latest applied migration |
| Requests | API requests since startup, not counting health checks |
| Errors | 5xx responses since startup |

## Edge cases

- The log folder doesn't exist: it's created at startup. If it can't be created or written to, the app still runs and logs to the terminal, and it warns about the problem once.
- The disk fills up while the app is running: the app keeps running and keeps logging to the terminal.
- The clock is changed, or the time zone changes: the file name always uses the current local date when the line is written.
- A request is aborted before it finishes: it's still logged, with the status that was set and a note that the client disconnected.
- A request body at debug level holds a long job description: it's logged in full, because debug level is for development.
- The same browser error repeats many times: the limit of 10 reports per minute applies.
- Tests: logging doesn't print to the terminal while tests run, unless a test asks for it.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should requests for static files and the page be logged at debug level, or not at all? **At debug level**, as in AC-2.
- [x] Is a limit of 10 browser reports per minute right? **Yes.**
- [x] Should the version be the number in `package.json` (now 0.0.0), or should it be bumped in this spec? **Use `package.json` as is.** Versioning can be decided separately.
- [x] What should the "Something went wrong" screen show? **Only a short message and the reload button.** Details stay in the logs (AC-12).
- [x] Where should the log files go? **In a `logs` folder next to the database**, as in AC-10.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved the open questions: static and health check requests are logged at debug level, the browser sends at most 10 reports per minute, the version comes from `package.json`, the crash screen shows no details, and logs go next to the database.
- 2026-10-01: Approved.
- 2026-10-01: Implementation started.
