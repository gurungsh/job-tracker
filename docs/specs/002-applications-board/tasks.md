# 002: Applications board (tasks)

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

- [x] **T1:** Add `stages.ts` with `STAGES`, `STAGE_LABELS`, `CLOSED_STAGES`, `isClosedStage()`, and `isAppliedOrLater()`. Write unit tests for the order and the helpers. (AC-1, AC-13, AC-14)
- [x] **T2:** Install `zod` in shared. Add `applications.ts` with `applicationInputSchema` (trimming, required fields, length limits, real `YYYY-MM-DD` dates, empty values stored as `null`, and stage defaulting to Wishlist), plus the `Application`, `Company`, and `ValidationErrorResponse` types. Write unit tests for each rule and message. (AC-7, AC-20, AC-21)

### Server

- [x] **T3:** Add migration `0001_create_companies_and_applications.sql`. Write a test that runs the real migrations folder against a temporary database and checks the tables and the case-insensitive unique company name. (AC-18, AC-19)
- [x] **T4:** Add `localDate.ts` with `localDate(now, timeZone?)`. It falls back to the server's zone when the zone is missing or invalid. Write unit tests for an evening in Chicago that is already the next day in UTC, an invalid zone, and no zone. (AC-13, AC-14)
- [x] **T5:** Add `applications/dates.ts` with a pure function that takes the previous state (or none, on create), the new stage, the applied date entered, today, and now, and returns `appliedOn`, `closedOn`, and `stageChangedAt`. Write unit tests for every case in the plan's test table. (AC-12 to AC-15)
- [x] **T6:** Add `applications/store.ts` with `listApplications`, `createApplication`, `updateApplication`, and `deleteApplication`, using company find-or-create and the date rules in a transaction. Add `listCompanies`. Write unit tests against a temporary database for ordering, case-insensitive company reuse, new companies, and missing ids. (AC-4, AC-8, AC-18, AC-19)
- [x] **T7:** Add `applications/router.ts` and `companies/router.ts`. They handle JSON parsing, schema validation (a 400 with `fields`), the `X-Time-Zone` header, and 404s. Change `createApp` to take `{ db, clientDir }` and mount the routers, and update `index.ts` and the existing app tests. Write API tests for every endpoint in the plan's API table. (AC-4, AC-6, AC-8, AC-10, AC-12 to AC-19, AC-21)

### Client

- [x] **T8:** Install `@testing-library/user-event`. Add `api.ts` (fetch wrappers that send `X-Time-Zone` and throw an error carrying `fields`) and `dates.ts` (`localToday`, `isOverdue`, `daysInStage`, and formatting). Write unit tests for `dates.ts` and for the API error handling. (AC-3, AC-5, AC-21, AC-22)
- [x] **T9:** Add `Board.tsx` and `Card.tsx` with `styles.css`: the loading, error with **Try again**, and empty states; 8 columns with counts and narrower closed columns; and cards with an overdue marker. Show the board from `App.tsx`. Write UI tests with a stubbed `fetch`. (AC-1, AC-2, AC-3, AC-5)
- [x] **T10:** Add `ConfirmDialog.tsx` (`role="alertdialog"`, focus moved into it, Escape cancels). Write UI tests. (AC-11, AC-16)
- [x] **T11:** Add `ApplicationPanel.tsx` for adding: an **Add application** button, the form fields, the company `datalist`, and validation with the shared schema and with server field errors. A failed save keeps the panel and its input. Write UI tests. (AC-6, AC-7, AC-17, AC-20, failed-save edge case)
- [x] **T12:** Extend the panel for editing. Clicking a card opens it with the values, the dates, and the days in the current stage. Saving updates the board, and changing the stage moves the card. Closing a changed form asks to confirm. Write UI tests. (AC-9, AC-10, AC-11, AC-12, AC-22)
- [x] **T13:** Add **Delete** to the edit panel, with a confirmation naming the job title and company. Write UI tests for cancel and confirm. (AC-16)

### Wiring and docs

- [x] **T14:** Update `README.md`: briefly describe what the app does now, and add the `X-Time-Zone` note to an API section. Check that the Docker image still builds and serves the board. (US-1 to US-7)

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

### Manual checks

| Check | AC | Result |
| ----- | -- | ------ |
| In `npm run dev`, add, edit, change the stage of, and delete an application from start to finish, and confirm each change is still there after a reload | AC-6, AC-8, AC-10, AC-12, AC-16 | Pass, 2026-10-01, checked by the owner in the browser. |
| Fill in every field, save, reload, reopen, and confirm every value is the same | AC-8 | Pass, 2026-10-01, checked by the owner in the browser. |
| Typing "acm" in the company field shows "Acme Corp" in the browser's suggestions | AC-17 | Pass, 2026-10-01, checked by the owner in the browser. |
| A narrow window scrolls the board sideways, long titles are cut off with an ellipsis, and the closed columns are narrower | AC-1, edge cases | Pass, 2026-10-01, checked by the owner in the browser, using sample data that covered every stage, overdue and due-today cards, and a long title. |
| `docker compose up --build --force-recreate` serves the working board on port 8080, and applications persist in `data/docker/` | AC-8 | Pass, 2026-10-01. The container applied `0001_create_companies_and_applications.sql` and served the page with its CSS. An application created on port 8080 (with `X-Time-Zone: America/Chicago`, applied date 2026-10-01) was unchanged after `down` and `up`. The test application was deleted afterward. |

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- **T5:** The spec doesn't say what happens when an application moves from one closed stage to another, for example Rejected to Withdrawn. It keeps its original closed date, because it didn't close again. `plan.md` is updated to match.
- **T7:** `createApp` now needs the database, so `index.ts` opens and migrates the database before checking for the client build. With a missing build, `npm start` now creates or migrates the database before exiting with the same message (spec 001, AC-11 still holds). Server tests share a small helper module, `src/testing.ts`, for starting a test server and creating an in-memory migrated database.
- **T11:** The board has one **Add application** button, in a toolbar above the columns. The empty state shows only its invitation text, instead of a second button with the same name (the plan had one in each place). `plan.md` is updated to match.
