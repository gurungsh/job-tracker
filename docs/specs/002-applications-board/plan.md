# 002: Applications board (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Approved                 |
| Updated | 2026-10-01               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

This is the first feature, so it also sets the patterns later specs will follow:

- **One source of validation rules.** Zod schemas in `packages/shared` define the application input. The client uses them to show field errors (AC-7, AC-20), and the server uses the same schemas to reject bad requests (AC-21). The TypeScript types come from the schemas, so the rules and the types can't drift apart.
- **The server owns the rules.** The stage-date rules (AC-12 to AC-15) and company matching (AC-18, AC-19) run only on the server, in small modules that are easy to test. The client just shows what the server returns.
- **A plain React client.** No state or data-fetching library: a small `api.ts` wraps `fetch`, and the board reloads its list after each save or delete. With one user and a few hundred applications at most, that's fast and simple.

```
apps/server/src/
  app.ts                    createApp({ db, clientDir }) mounts the routers below
  applications/
    dates.ts                pure stage-date rules (AC-12 to AC-15)
    store.ts                SQL: list, create, update, delete, plus company find-or-create
    router.ts               /api/applications endpoints, validation, and error mapping
  companies/router.ts       GET /api/companies
  localDate.ts              "today" in the client's time zone
apps/server/migrations/0001_create_companies_and_applications.sql
packages/shared/src/
  stages.ts                 the 8 stages, labels, and open or closed
  applications.ts           Zod schemas and the Application and Company types
apps/client/src/
  api.ts                    fetch wrappers. Errors carry the server's field messages.
  dates.ts                  localToday(), isOverdue(), daysInStage(), and date formatting
  Board.tsx, Card.tsx       board, columns, cards, and the empty and error states
  ApplicationPanel.tsx      add or edit form, unsaved-changes and delete confirmations
  ConfirmDialog.tsx         small accessible confirmation dialog
  styles.css                plain CSS with color variables
```

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Validation | `zod` 4 schemas in `packages/shared` | The same rules run in the form and on the server (AC-20, AC-21), and the types come from the schemas. | Hand-written checks in two places; `valibot`, which is smaller but less familiar |
| Client data loading | Plain `fetch` in `api.ts`, and the board reloads its list after each change | Simplest code that covers AC-5 and AC-10. There's one user, so the lists stay small. | TanStack Query, which is worth adding if caching or background refresh is ever needed |
| Forms | Controlled React state, validated with the shared schema on save | About 6 fields don't need a form library. | `react-hook-form` |
| Company suggestions | Native `<input list>` with a `<datalist>` filled from `GET /api/companies` | No dependency, accessible, and browsers already filter by what you type without regard to case (AC-17). Companies are few, so the client loads them all. | A custom combobox with a search endpoint, which means more code for the same result at this size |
| Company matching | `name TEXT COLLATE NOCASE UNIQUE`, and the server trims the name, then finds or creates the company in the same transaction as the application save | Case-insensitive uniqueness is enforced by the database (AC-18, AC-19). | Matching in application code alone, which allows duplicates if a bug slips in |
| Side panel and dialogs | Custom components: the panel is a `role="dialog"` side sheet, and `ConfirmDialog` is a `role="alertdialog"` with focus moved into it and Escape to cancel | Needed for AC-11 and AC-16 with the application's name in the message. Testable in jsdom. | `window.confirm`, which can't be styled and looks out of place; native `<dialog>`, whose jsdom support is uneven |
| "Today" on the server | Each write request sends the browser's time zone in an `X-Time-Zone` header (from `Intl`). The server works out the local date with `Intl.DateTimeFormat`. A missing or unknown zone falls back to the server's own zone. | The spec says "today" is my computer's local date, but the server in Docker runs in UTC. Without this, the applied and closed dates could be off by a day in the evening. | Setting `TZ` in Compose, which macOS doesn't expose reliably; storing timestamps for applied and closed dates, which doesn't fit an editable applied date |
| Stored date formats | `next_step_due`, `applied_on`, and `closed_on` are `YYYY-MM-DD` text. `stage_changed_at`, `created_at`, and `updated_at` are ISO 8601 UTC timestamps. | Calendar dates have no time zone to get wrong. Timestamps are exact. The client turns them into local dates for display and for days in stage (AC-22). | All timestamps |
| When the applied date is set automatically | When an application is **created** in Applied or later, or its **stage changes** into Applied or later, and it has no applied date | This follows AC-13 and AC-15 together. A save that doesn't change the stage leaves the dates as they are, so clearing the applied date by hand sticks. | Setting it on every save, which would undo a manual clear right away |
| Moving between closed stages | Keeps the original closed date (for example, Rejected to Withdrawn) | The application didn't close again. The spec only covers open-to-closed (AC-14). | Resetting it to today |
| Updates | `PUT` with the full editable input | The form always sends every field, so a full replace is the simplest correct choice. | `PATCH` with partial updates |
| Card order | The server returns applications sorted by `next_step_due` (soonest first, empty ones last), then `created_at`, newest first. The client groups them by stage and keeps that order. | AC-4, with one rule in one place | Sorting on the client |
| UI tests | `@testing-library/user-event`, plus a stubbed `fetch` per test | Realistic typing and clicking with no network. | MSW, which is more setup than these tests need |
| Styling | One `styles.css` with CSS variables, a CSS grid board with narrower closed columns, and sideways scrolling | AC-1 and the narrow-screen edge case, with no dependency. | Tailwind, or a component library |

## Data model

`apps/server/migrations/0001_create_companies_and_applications.sql`:

```sql
CREATE TABLE companies (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
) STRICT;

CREATE TABLE applications (
  id               INTEGER PRIMARY KEY,
  company_id       INTEGER NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  job_title        TEXT NOT NULL,
  stage            TEXT NOT NULL CHECK (stage IN ('wishlist', 'applied', 'screening', 'interviewing',
                                                  'offer', 'accepted', 'rejected', 'withdrawn')),
  next_step        TEXT,
  next_step_due    TEXT,  -- YYYY-MM-DD
  applied_on       TEXT,  -- YYYY-MM-DD
  closed_on        TEXT,  -- YYYY-MM-DD
  stage_changed_at TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
) STRICT;

CREATE INDEX applications_company_idx ON applications (company_id);
```

- Companies are never deleted in this spec, so they're still suggested after their last application is deleted (spec rule). `ON DELETE RESTRICT` protects applications if company deletion is added later.
- Lengths and formats are enforced by the shared schema, not by the database, so the limits live in one place.

## API

All bodies are JSON. Field names are camelCase.

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/applications` | None | `200` `Application[]`, sorted as in AC-4 | None | AC-1 to AC-4, AC-8, AC-10 |
| POST | `/api/applications` | `ApplicationInput` and the `X-Time-Zone` header | `201` `Application` | `400` validation | AC-6, AC-7, AC-13, AC-14, AC-18 to AC-21 |
| PUT | `/api/applications/:id` | `ApplicationInput` and the `X-Time-Zone` header | `200` `Application` | `400` validation, `404` | AC-10, AC-12 to AC-15, AC-21 |
| DELETE | `/api/applications/:id` | None | `204` | `404` | AC-16 |
| GET | `/api/companies` | None | `200` `Company[]`, sorted by name | None | AC-17, AC-19 |

- A validation error is `400` with `ValidationErrorResponse`: `{ "error": "Invalid application", "fields": { "jobTitle": "Job title is required" } }` (AC-21).
- A body that isn't valid JSON is `400` with an `ErrorResponse`. A non-numeric `:id` is `404`.
- Writes run in a transaction: find or create the company, apply the date rules, then insert or update.

## Shared types

`packages/shared/src/stages.ts`:
- `STAGES`, the 8 stage ids in board order.
- `STAGE_LABELS`.
- `CLOSED_STAGES`.
- `isClosedStage()`.
- `isAppliedOrLater()`.

`packages/shared/src/applications.ts`:
- `applicationInputSchema`, with these fields:
  - `companyName`, trimmed, 1–200 characters
  - `jobTitle`, trimmed, 1–200 characters
  - `stage`, defaulting to `"wishlist"`
  - `nextStep`, trimmed, up to 500 characters, with an empty value stored as `null`
  - `nextStepDue`, a `YYYY-MM-DD` date that must exist, or `null`
  - `appliedOn`, the same as `nextStepDue`

  Error messages are written for people, such as "Job title is required."
- `ApplicationInput`, inferred from the schema.
- `Application`, which adds:
  - `id` and `companyId`
  - `companyName`, the stored spelling
  - `closedOn`
  - `stageChangedAt`, `createdAt`, and `updatedAt`
- `Company`, which is `{ id, name }`.
- `ValidationErrorResponse`, which extends `ErrorResponse` with `fields: Record<string, string>`.

## UI

- **Board (`Board.tsx`):**
  - It loads applications and companies at the start, showing "Loading…" while they load.
  - If loading fails, it shows an error with a **Try again** button (AC-5). If there are no applications, it shows an empty message that points to the **Add application** button (AC-2).
  - It has 8 columns, each with a header showing the label and count. Closed columns are narrower (AC-1).
  - One **Add application** button, in a toolbar above the columns, opens an empty panel.
- **Card (`Card.tsx`):**
  - It's a button, so it works with the keyboard. It shows the company, the job title, the next step, and the due date, with longer text cut off with an ellipsis.
  - An overdue date gets a highlight, plus the text "Overdue" so the warning doesn't depend on color alone (AC-3).
  - Clicking it opens the panel (AC-9).
- **Panel (`ApplicationPanel.tsx`):**
  - Fields: company (with the `datalist`), job title, stage (a select), next step, next step due date, and applied date (a date input).
  - Read-only info: closed date, "In Screening for 12 days" (AC-22), and the stage-changed date.
  - **Save** first validates with the shared schema and shows field errors (AC-7, AC-20). It then sends the request and shows server field errors the same way. If the request fails, the panel stays open and shows the error, with the input kept (edge case).
  - **Close** or Escape asks for confirmation if the form has changed (AC-11).
  - **Delete** (edit mode only) opens `ConfirmDialog` with "Delete {job title} at {company}?" (AC-16).
- **Client dates (`dates.ts`):**
  - `localToday(now)` returns the local date.
  - `isOverdue(due, today)` is true when `due < today`, so a due date of today isn't overdue.
  - `daysInStage(stageChangedAt, now)` counts the calendar days between the local date the stage changed and today.
  - Formatting uses `Intl.DateTimeFormat("en-US")`.

## Test strategy

| AC | Level | What it checks |
| -- | ----- | -------------- |
| AC-1 | UI | Eight column headings in order, with counts. The closed columns have the narrow class. |
| AC-2 | UI | An empty list shows the empty message and the add button. |
| AC-3 | UI and unit | The card shows all four values, and is marked "Overdue" only when the due date is before today. `isOverdue` is checked for yesterday, today, and tomorrow. |
| AC-4 | API | The list order follows due dates, puts empty dates last, and breaks ties newest first. |
| AC-5 | UI | When fetch fails, the error shows. **Try again** refetches and then shows the board. |
| AC-6 | UI and API | UI: adding with only company and title puts a card in Wishlist. API: `POST` with just those two returns 201 and stage `wishlist`. |
| AC-7 | Unit and UI | The schema rejects a blank or spaces-only company or title. The form shows "required" next to the field and sends nothing. |
| AC-8 | API and manual | API: a `POST` followed by a `GET` returns every field unchanged. Manual: fill in every field, reload, and reopen. |
| AC-9, AC-22 | UI and unit | Clicking a card opens the panel with its values and dates. `daysInStage` returns 0, 1, and 12, and the panel shows the matching text. |
| AC-10 | UI and API | An edit is saved, and the card updates. A `PUT` followed by a `GET` returns the new values. |
| AC-11 | UI | Closing a changed form asks for confirmation, and canceling keeps the panel open. Closing an unchanged form doesn't ask. |
| AC-12 to AC-15 | Unit and API | `dates.ts` cases: create in each stage; a move into Applied or later with and without an applied date; a move to a closed stage; reopening; a save with no stage change; a manual clear that sticks; and Wishlist to Rejected setting both dates. API: `stage_changed_at` changes only when the stage does, and the `X-Time-Zone` header changes which "today" is used. |
| AC-16 | UI and API | The dialog names the job title and company. Cancel keeps the card, and confirm sends `DELETE` and removes the card. API: 204, then 404 on a second delete. |
| AC-17 | UI | The datalist options come from `GET /api/companies`. The browser's own filtering is checked manually. |
| AC-18, AC-19 | API | "acme corp" and " Acme Corp " link to the existing company, and the company count is unchanged. A new name creates one company, and the next `GET /api/companies` includes it. |
| AC-20 | Unit and UI | The schema's limits (200 and 500 characters, real dates). The form shows the message next to the field. |
| AC-21 | API | A bad body returns 400 with `fields`, and nothing is saved. A bad stage and bad JSON are rejected too. |
| Edge cases | Unit, API, and manual | Duplicate company and title are allowed (API). A failed save keeps the panel and its input (UI). Long text is cut off and the board scrolls sideways (manual). |

The real migration is also run against a temporary database in a test, so a bad SQL file fails `npm test`.

## Risks and mitigations

- **NOCASE is ASCII-only:** names like "Émile" vs "émile" aren't matched ignoring case. That's acceptable for company names for now. If it matters later, a stored lowercase key could fix it.
- **jsdom and `datalist`:** jsdom doesn't show browser suggestions, so the UI test checks the options and a manual check covers the dropdown (AC-17).
- **Time zone header:** if a non-browser client leaves it out, the server's zone is used. That's documented in the router and tested.
- **Review size:** this is the largest spec so far. Tasks are ordered server first, then client, so the backend can be reviewed on its own.

## New dependencies

| Package | Workspace | Why |
| ------- | --------- | --- |
| `zod` | shared (runtime) | Shared validation and types (decision above). Installed in the Docker runtime image through the shared workspace. |
| `@testing-library/user-event` | client (dev) | Realistic typing and clicking in UI tests. |
