# 007: Activity timeline (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented      |
| Updated | 2026-10-01         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Add an `activities` table, owned by an application. The server writes the automatic entries inside the same transaction as the application create or update, so a move from the form and a move from dragging (which uses the same `PUT`) are both recorded in one place. Entries I log, edit, or delete go through their own routes. In the side panel, an existing application gets a Details/Timeline tab bar. The form stays mounted while the Timeline tab shows, so unsaved edits survive a tab switch.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Where stage entries are written | In `createApplication` and `updateApplication` in the server store, in the existing transaction | One place covers form and drag and drop (AC-6, AC-7) and can't half-save | Client sends a second request: could miss or double-record |
| Entry shape | `type`, `occurred_on`, `text` only | Automatic text is editable (owner decision), so separate from/to columns would drift from the text | Store from and to stages: out of sync after an edit |
| Ordering | `occurred_on DESC, id DESC` | Matches AC-3, and `id` breaks ties by add order | Order by created time: same result but needs another column |
| Routes | List and add under `/api/applications/:id/activities`; edit and delete at `/api/activities/:id`, all in one `activitiesRouter` mounted at `/api` | Entries belong to an application when created, and have their own identity afterwards | All nested: longer paths for no gain |
| Tabs | Tab bar in `ApplicationPanel`, form hidden with the `hidden` attribute, not unmounted | Keeps unsaved form state (AC-14) with no extra state plumbing | Lifting form state up: bigger change |
| Timeline UI | New `Timeline.tsx` component with its own state and requests | Keeps `ApplicationPanel.tsx` from growing further. Its saves are independent (AC-14) | Inline in the panel |
| Delete confirm | Reuse `ConfirmDialog` | Already the app's pattern (AC-9) | Delete without asking |
| Date validation | `z.iso.date` in the shared activity schema | It's the same check the application dates use, in one line | Exporting the application date schema: more change for one line |
| Library choices | None new | Existing Express, node:sqlite, Zod, React | — |

## Data model

Migration `apps/server/migrations/0003_create_activities.sql`:

```sql
CREATE TABLE activities (
  id             INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  type           TEXT NOT NULL CHECK (type IN ('note', 'email', 'call', 'interview', 'stage_change')),
  occurred_on    TEXT NOT NULL, -- YYYY-MM-DD
  text           TEXT NOT NULL,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
) STRICT;

CREATE INDEX activities_application_idx ON activities (application_id, occurred_on DESC, id DESC);
```

Existing applications get no rows (AC-10). Deleting an application removes its rows through `ON DELETE CASCADE` (AC-11); the plan's first server task confirms foreign keys are enabled in `db.ts`, and fixes that if not.

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/applications/:id/activities` | none | `Activity[]` in timeline order | 404 unknown application | AC-3, AC-10 |
| POST | `/api/applications/:id/activities` | `ActivityInput` | `201` with the `Activity` | 400 with `fields`, 404 | AC-2, AC-4, AC-5 |
| PUT | `/api/activities/:id` | `ActivityInput` | The updated `Activity` | 400 with `fields`, 404 | AC-5, AC-8 |
| DELETE | `/api/activities/:id` | none | `204` | 404 | AC-9 |
| POST, PUT | `/api/applications[/:id]` | unchanged | unchanged | unchanged | AC-6, AC-7 (side effect: automatic entry) |

Validation errors use the existing `fieldErrors` format. Create and edit accept only `note`, `email`, `call`, and `interview` from a client. Editing an automatic entry keeps its type: `type` is optional on `PUT` for those and must be omitted or `stage_change`. Create and update use the same `X-Time-Zone` clock as applications for "today".

## UI

- `ApplicationPanel.tsx`: for an existing application, a tab bar with "Details" and "Timeline" (`role="tablist"`). The Details body gets `hidden` when Timeline is selected. No tabs for a new application (AC-1, AC-14).
- `Timeline.tsx` (+ `Timeline.css`): an "Add entry" form (type select, date input defaulting to local today, text area, button) above the list. The list shows type, date, and text (`white-space: pre-wrap`) with Edit and Delete per entry. Edit turns the entry into the same form with Save and Cancel. States: loading, load error with "Try again", empty message (AC-10), and an inline error on failed add, edit, or delete that leaves typed text alone (AC-13).
- Automatic entries show type "Stage change" and the edit form hides the type select (AC-8).
- Dates formatted with `formatDate` from `lib/dates.ts`; "today" from `localToday`.
- Board, `Card`, and drag and drop: no change (AC-12).

## Shared types

In `packages/shared/src/activities.ts`, exported from `index.ts`:

- `ACTIVITY_TYPES`, `ACTIVITY_TYPE_LABELS`, `Activity` (`id`, `applicationId`, `type`, `occurredOn`, `text`, `createdAt`, `updatedAt`).
- `activityInputSchema` (`type`, `occurredOn`, `text` with the rules in the spec) and `ActivityInput`.
- A helper that builds the automatic text from stage labels, used by the server.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI | Tabs exist for an existing application, Details selected, and not for a new one |
| AC-2 | UI + API | Add posts the entry, it shows at the top, the form clears with today's date; the entry survives a fresh `GET` |
| AC-3 | API + store | Order by date then add order; text with line breaks round-trips |
| AC-4 | UI + shared unit | Empty, too long, and invalid-date text show field errors and send nothing |
| AC-5 | API | 400 names the fields; 404 for unknown application or entry; nothing is saved; clients can't create `stage_change` |
| AC-6 | API + store | Create writes "Added to <Stage>" dated by the client's time zone |
| AC-7 | API + store + UI | Update with a changed stage writes "Moved from X to Y"; unchanged stage writes nothing; one entry when other fields change too; drag path covered through the same route |
| AC-8 | UI + API | Edit saves date, text, and type; Cancel discards; automatic entries hide the type and keep it |
| AC-9 | UI + API | Delete asks first, removes on confirm, keeps on cancel |
| AC-10 | UI + migration | Migrated database has an empty table; the tab shows the empty message |
| AC-11 | store | Deleting an application removes its entries |
| AC-12 | UI | Existing board tests pass unchanged |
| AC-13 | UI | Offline load shows an error and "Try again"; failed add keeps the typed text |
| AC-14 | UI | Edit a Details field, switch tabs, and back: value kept, and closing still asks to confirm |

## Risks and mitigations

- Foreign keys might not be enforced, which would leave orphan entries: check `db.ts` first, and add a store test for cascade (AC-11).
- Editing an automatic entry's text makes it unreliable as a record: this is the owner's decision (see spec), noted here so it isn't a surprise later.
- The panel is already large: all timeline code lives in `Timeline.tsx`, and `ApplicationPanel.tsx` only gets the tabs.
- Adding a row on every stage change touches the main save path: the existing server tests for dates and updates must pass unchanged.

## New dependencies

None.
