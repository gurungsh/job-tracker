# 008: Contacts (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented      |
| Updated | 2026-10-02         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Add a `contacts` table owned by a company, and a nullable `contact_id` on `activities`. Contacts have their own routes keyed by company, since the list is shared by every application at that company. The side panel gets a third tab, `Contacts.tsx`, built like `Timeline.tsx`. Timeline entries gain an optional contact: the server checks it belongs to the application's company, and clears links when an application moves to another company, in the same transaction as the save.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Contact ownership | `contacts.company_id`, `ON DELETE RESTRICT` (like applications) | Companies are never deleted today, and RESTRICT keeps it that way | `CASCADE`: silent loss if companies ever become deletable |
| Link on entries | `activities.contact_id`, `ON DELETE SET NULL` | Deleting a contact keeps the history (AC-7) in one place, with no extra code | Clear links in code: easy to forget |
| Routes | List and add at `/api/companies/:id/contacts`; edit and delete at `/api/contacts/:id` | Mirrors the timeline routes (spec 007) | Nested only |
| Entry-count for the delete question | Each contact in the list carries `entryCount` | The confirmation needs it (AC-7) with no extra request | A second request when deleting |
| Same-company check | In the activities store, comparing the contact's company with the application's | The rule lives next to the data it protects (AC-10) | A database trigger: hidden logic |
| Company change | In `updateApplication`, if `company_id` changed, `UPDATE activities SET contact_id = NULL WHERE application_id = ?` | Same transaction as the save (AC-11) | Block the change: the draft asks the owner |
| Entry contact on edit | The update sends `contactId` every time. Omitted or null means none | One rule, easy to test | Omitted means keep: two meanings |
| Entry display | The activity response includes `contactName`, joined in the query | Renames show at once (AC-6) | Store the name: goes stale |
| Contact tab UI | New `Contacts.tsx`, with its own state and requests | Same pattern as `Timeline.tsx`, keeping the panel small | Inline in the panel |
| Email check | Zod's email check in the shared schema | Same rules on client and server (AC-4) | A hand-written pattern |
| Libraries | None new | Existing Express, node:sqlite, Zod, React | — |

## Data model

Migration `apps/server/migrations/0004_create_contacts.sql`:

```sql
CREATE TABLE contacts (
  id         INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies (id) ON DELETE RESTRICT,
  name       TEXT NOT NULL,
  role       TEXT,
  email      TEXT,
  phone      TEXT,
  notes      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX contacts_company_idx ON contacts (company_id, name COLLATE NOCASE);

ALTER TABLE activities ADD COLUMN contact_id INTEGER REFERENCES contacts (id) ON DELETE SET NULL;
CREATE INDEX activities_contact_idx ON activities (contact_id);
```

Existing entries get `NULL` (AC-12). A migration test builds a database at version 0003 with an entry, migrates, and checks it.

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/companies/:id/contacts` | none | `Contact[]` by name, ignoring case, then id | 404 unknown company | AC-2, AC-12 |
| POST | `/api/companies/:id/contacts` | `ContactInput` | `201` with the `Contact` | 400 with `fields`, 404 | AC-3, AC-4, AC-5 |
| PUT | `/api/contacts/:id` | `ContactInput` | The updated `Contact` | 400 with `fields`, 404 | AC-5, AC-6 |
| DELETE | `/api/contacts/:id` | none | `204`; entries that named it are unlinked | 404 | AC-7 |
| POST, PUT | `/api/applications/:id/activities`, `/api/activities/:id` | existing body plus `contactId` | `Activity` with `contactId`, `contactName` | 400 naming `contactId` | AC-8, AC-9, AC-10 |
| PUT | `/api/applications/:id` | unchanged | unchanged | unchanged | AC-11 (side effect on entries) |

Validation errors use the existing `fieldErrors` format.

## UI

- `ApplicationPanel.tsx`: the tab list gains "Contacts", shown for existing applications only. The Details form stays mounted for every tab (AC-1, AC-14).
- `Contacts.tsx` (+ `Contacts.css`): the company name as a heading, an add form (name, role, email, phone, notes), and the list with Edit and Delete per contact. States: loading, load error with "Try again", empty (AC-2, AC-13). Delete uses `ConfirmDialog` and mentions `entryCount` when it's above zero (AC-7).
- `Timeline.tsx`: takes the application's `companyId`, loads the contacts once, and `EntryForm` gains a "Contact" select (None plus contacts). The entry shows "with <name>". Reloading contacts when I return from the Contacts tab keeps the choices current (AC-8, AC-9).
- Board, `Card`, and drag and drop: no change (AC-12).

## Shared types

In `packages/shared/src/contacts.ts`, exported from `index.ts`: `Contact` (`id`, `companyId`, `name`, `role`, `email`, `phone`, `notes`, `entryCount`, `createdAt`, `updatedAt`), `contactInputSchema` with the spec's limits, and `ContactInput`. In `activities.ts`: add `contactId` (number or null) to `Activity` along with `contactName`, and an optional `contactId` to both input schemas.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI | Three tabs for an existing application, none for a new one |
| AC-2 | API + UI | Alphabetical order ignoring case; fields and line breaks shown; empty message |
| AC-3 | API + UI | Add posts and shows the contact; another application at the same company sees it; another company doesn't |
| AC-4 | shared unit + UI | No name, bad email, and each limit show field errors and send nothing |
| AC-5 | API | 400 names the fields; 404 for unknown company or contact; nothing is saved |
| AC-6 | API + UI | Edit saves; Cancel discards; linked entries show the new name |
| AC-7 | API + store + UI | Confirmation text with the entry count; cancel keeps; confirm removes and unlinks entries in every application at the company |
| AC-8 | API + UI | Entry saved with a contact shows "with name"; None clears it |
| AC-9 | API + UI | An automatic entry can take a contact |
| AC-10 | API | A contact from another company, or an unknown one, gives 400 on `contactId` |
| AC-11 | API + store | A company change clears links on that application's entries only; a same-company save keeps them |
| AC-12 | migration + UI | Migrated entries have no contact; existing board tests pass unchanged |
| AC-13 | UI | Offline load, add, edit, and delete show errors; typed text kept; contact kept |
| AC-14 | UI | Edit Details, switch to Contacts and back: value kept |
| Browser | Playwright run by the assistant | The flows above against the production build |

## Risks and mitigations

- Adding a column with a foreign key through `ALTER TABLE` has limits in SQLite: it needs a `NULL` default, which this has. The migration test covers it.
- Entries and contacts at different companies would be inconsistent: the same-company check on every entry write, and the company-change clearing, together prevent it. Both are tested.
- A growing panel: all contact code is in `Contacts.tsx`, and `ApplicationPanel.tsx` only gets one more tab.
- Existing `Timeline` tests need the contacts request in the fake server: the fake gains contacts routes first.

## New dependencies

None.
