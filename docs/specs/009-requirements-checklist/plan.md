# 009: Requirements checklist (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented      |
| Updated | 2026-10-02         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Add a `requirements` table owned by an application, with routes shaped like the timeline's, and a fourth side-panel tab, `Requirements.tsx`, built like `Timeline.tsx` and `Contacts.tsx`. The server returns the list in display order, and the client keeps that order when it changes the list locally. The summary is computed on the client from the loaded items.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Ownership | `application_id`, `ON DELETE CASCADE` | Items go with the application (AC-11), as timeline entries do | Keep items: nothing to attach them to |
| Order | `ORDER BY kind DESC, id` on the server (`required` sorts after `preferred` alphabetically, so descending puts it first) | One rule, tested on the server (AC-4) | A position column: more state, no reordering needed |
| Routes | List and add at `/api/applications/:id/requirements`; edit, check, and delete at `/api/requirements/:id`, in one router mounted at `/api` | Same shape as `activitiesRouter` | Separate check route: a second way to change an item |
| Checking an item | `PUT /api/requirements/:id` with the whole item (`text`, `kind`, `met`) | One validated write path (AC-5, AC-7, AC-10) | A `PATCH` for `met` only |
| Check feedback | Wait for the server, with the box disabled while saving, then take the saved item | The box always matches what is stored, and a failure just leaves it as it was (AC-13) | Optimistic update with rollback: more code for a fast local call |
| Summary | Computed in the client from the items | It must update as I check (AC-6), and no extra request is needed | A server count |
| Delete confirm | Reuse `ConfirmDialog` | Same pattern as the other tabs (AC-8) | Delete without asking |
| Libraries | None new | Existing Express, node:sqlite, Zod, React | — |

## Data model

Migration `apps/server/migrations/0005_create_requirements.sql`:

```sql
CREATE TABLE requirements (
  id             INTEGER PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('required', 'preferred')),
  met            INTEGER NOT NULL DEFAULT 0 CHECK (met IN (0, 1)),
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
) STRICT;

CREATE INDEX requirements_application_idx ON requirements (application_id, kind DESC, id);
```

Existing applications get no rows (AC-12).

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/applications/:id/requirements` | none | `Requirement[]` in display order | 404 unknown application | AC-2, AC-4, AC-12 |
| POST | `/api/applications/:id/requirements` | `RequirementInput` (`met` defaults to false) | `201` with the `Requirement` | 400 with `fields`, 404 | AC-3, AC-9, AC-10 |
| PUT | `/api/requirements/:id` | `RequirementInput` | The updated `Requirement` | 400 with `fields`, 404 | AC-5, AC-7, AC-10 |
| DELETE | `/api/requirements/:id` | none | `204` | 404 | AC-8 |

Validation errors use the existing `fieldErrors` format. `met` is returned as a boolean.

## UI

- `ApplicationPanel.tsx`: the tab list gains "Requirements" after "Contacts", for existing applications only. The Details form stays mounted for every tab (AC-1, AC-14).
- `Requirements.tsx` (+ `Requirements.css`): a summary line, an add form (text, Required or Preferred select, button), and the list with a checkbox, text, and Edit and Delete per item. States: loading, load error with "Try again", empty (AC-2, AC-13). The checkbox is labeled with the item's text and disabled while its save is in flight (edge case).
- Summary: "Required: 3 of 5 met · Preferred: 1 of 2 met", omitting a group with no items (AC-6).
- Edit turns the item into the same form with Save and Cancel (AC-7). Delete uses `ConfirmDialog` (AC-8).
- Board, `Card`, and drag and drop: no change (AC-12).

## Shared types

In `packages/shared/src/requirements.ts`, exported from `index.ts`: `REQUIREMENT_KINDS`, `REQUIREMENT_KIND_LABELS`, `Requirement` (`id`, `applicationId`, `text`, `kind`, `met`, `createdAt`, `updatedAt`), `requirementInputSchema` (`text` trimmed, 1 to 500 characters; `kind`; `met` optional boolean, default false) and `RequirementInput`.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI | Four tabs in order for an existing application, none for a new one |
| AC-2 | UI | Empty message, no summary, add form present |
| AC-3 | API + UI | Add saves unmet and shows in its group; text clears and kind stays; survives a fresh `GET` |
| AC-4 | API + store | Required first, then preferred, each in order added |
| AC-5 | API + UI | Check and uncheck persist; the item keeps its place |
| AC-6 | UI + unit | Summary text for mixed, one-group-only, and no items; updates on check |
| AC-7 | API + UI | Edit changes text and kind, keeps met; moving kind moves the group; Cancel discards |
| AC-8 | API + UI | Delete asks first; confirm removes and updates counts; cancel keeps |
| AC-9 | shared unit + UI | Empty and over-limit text show field errors and send nothing |
| AC-10 | API | 400 names the fields; 404 for unknown application or item; nothing saved |
| AC-11 | migration + API | Deleting an application removes its items |
| AC-12 | migration + UI | Migrated database has an empty table; existing board tests pass unchanged |
| AC-13 | UI | Offline load, add, edit, check, and delete show errors; typed text kept; box and item unchanged |
| AC-14 | UI | Edit Details, switch to Requirements and back: value kept |
| Browser | Playwright run by the assistant | The flows above against the production build |

## Risks and mitigations

- Sorting on a text column to put required first is easy to get backwards: a store test pins the order with mixed kinds and insertion order.
- `met` is 0 or 1 in SQLite but a boolean in the API: the store converts both ways, and a test covers a round trip.
- The panel keeps growing tabs: all checklist code is in `Requirements.tsx`, and `ApplicationPanel.tsx` only gets one more tab.

## New dependencies

None.
