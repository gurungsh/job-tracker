# 017: Archive, company website, and entry times (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

One migration adds three columns, and each feature rides on the existing layers, with no new dependency.

- **Archive** is a nullable `archived_at` on an application. The API keeps returning every application, with `archivedAt` set or `null`, and the client's one shared list (spec 014) is split in two: the active ones feed the board, the table, and the counts, and the archived ones feed the Archived table and its count. Archiving and restoring swap one application in that list, so every screen updates without a reload. The server refuses changes to an archived application's own data, so read-only holds even if the client slips.
- **Company website** is a nullable `website` on the company. The application's Add and Edit form gets a Website field and sends it as `companyWebsite`, which the server writes to the company inside the same transaction that finds or creates it.
- **Entry time** is a nullable `occurred_time` (`HH:MM`) on an activity. The timeline's form gets a Time field, and the list order gains a time tiebreak, on the server and in the client's own re-sort.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| How the client gets archived applications | `GET /api/applications` returns all of them, each with `archivedAt`. The client filters. | The shared list already feeds the sidebar, board, table, and page. One list means archive and restore update every screen at once (AC-3, AC-5). This is a personal app with a small list. | A `?archived=` query and a second fetch: two lists to keep in step, and a count that needs its own request. |
| Archive state | `archived_at` timestamp, `null` when active | It records when (spec's data rules) and doubles as the flag. | A 0/1 flag: loses the time. |
| Archive and restore calls | `POST /api/applications/:id/archive` and `.../restore`, each returning the application. Repeating one is harmless and keeps the first `archivedAt`. | They are actions, not edits, so they don't go through the full-replace `PUT`. The stage and every other field stay as they are (AC-5). A double click or a second tab can't fail. | Putting `archived` in the `PUT` body: every save path would have to carry it. |
| Read-only while archived | `PUT /api/applications/:id`, and every create, change, or delete of the application's timeline entries and requirements, answer `409 {"error":"Application is archived"}`. Deleting the application still works. | The spec says everything waits for Restore (AC-6). Checking on the server means a stale page can't change an archived application. | UI-only locking: easy to bypass from a stale tab or a script. |
| Contacts while archived | The page's contact controls are disabled in the UI. The contacts API is not blocked. | Contacts belong to the company and are shared with its other applications (spec 008), so an archived application can't own the right to freeze them. The spec only asks that the page's controls be unavailable. | Blocking the contacts API: would stop me editing a person from another application. |
| Company website | A `website` column on `companies`, filled from the application form as `companyWebsite`, validated by the job link's rules (`normalizeJobLink`, `isValidJobLink`, 2,000 characters) | The company is shared, so one website serves all its applications (AC-7). The job link's rules already add `https://` and reject bad addresses. | A website per application: the spec chose per company. |
| Missing `companyWebsite` in a save | It clears the website, like every other optional field in the full-replace `PUT` | Consistent with how the whole request already works. So every client save path must send it (see Risks). | Leaving it alone when missing: two different meanings for "missing". |
| Prefilling Website in the form | The form reads the website from the company list (`GET /api/companies` now includes it) when the name matches a known company | Choosing a different company shows its website (AC-7) with no extra request. | A request per company pick: slower and one more error state. |
| Entry time format | `occurred_time` as `HH:MM`, 24-hour, no time zone, checked by a `GLOB` pattern in the table and by the shared schema | It is the wall-clock time I typed, so there's nothing to convert (spec's data rules). The browser's time input produces this format. | A full timestamp with a zone: would shift when I travel. |
| Timeline order | Server: `ORDER BY occurred_on DESC, occurred_time IS NULL, occurred_time DESC, id DESC`. The client's re-sort in `Timeline.tsx` gets the same rule. | AC-11, and the page re-sorts after a save without asking the server (spec 007). Both sides must agree. | Re-fetching after each save: slower and flickers. |
| Archived entry in the sidebar | A second `Link` below the stage list, opening `/table?archived=1`. The address's `archived` flag is part of the table query. | Reuses the table's search, sort, and bookmarkable address (AC-4). | A new route and page: duplicates the table. |
| Quick archive on cards and rows | A small icon button on each card and row, named `Archive: <job title> at <company>`, that doesn't open the application | AC-2. A card menu is a later spec (018), so this stays one small button. | Waiting for the card menu: leaves AC-2 unmet. |
| Migration | One file, `0006_archive_website_entry_times.sql`, with three `ALTER TABLE ADD COLUMN` | Each column is nullable, so existing rows need no backfill (AC-12). One file because the three belong to one feature and ship together. | Three files: three versions for one release. |

## Data model

Migration `apps/server/migrations/0006_archive_website_entry_times.sql`:

```sql
ALTER TABLE applications ADD COLUMN archived_at TEXT; -- UTC timestamp, NULL when not archived
ALTER TABLE companies ADD COLUMN website TEXT;
ALTER TABLE activities ADD COLUMN occurred_time TEXT
  CHECK (occurred_time IS NULL OR occurred_time GLOB '[0-2][0-9]:[0-5][0-9]'); -- HH:MM, no time zone
```

Existing rows become unarchived, with no website and no time (AC-12). The `GLOB` pattern is a backstop. The shared schema is what rejects `25:00`.

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| `GET` | `/api/applications`, `/api/applications/:id` | | `Application`, now with `archivedAt` and `companyWebsite` | `404` | AC-3, AC-4, AC-8 |
| `POST` | `/api/applications/:id/archive` | none | `200` `Application` | `404` | AC-1, AC-2 |
| `POST` | `/api/applications/:id/restore` | none | `200` `Application` | `404` | AC-5 |
| `POST`, `PUT` | `/api/applications`, `/api/applications/:id` | the existing body plus optional `companyWebsite` | `Application` | `400` with `fields.companyWebsite`. `PUT` on an archived one: `409` | AC-6, AC-7 |
| `DELETE` | `/api/applications/:id` | | `204` | `404` | AC-6 |
| `GET` | `/api/companies` | | `Company[]`, now with `website` | | AC-7 |
| `POST`, `PUT`, `DELETE` | the timeline and requirements routes | the timeline body plus optional `occurredTime` | the entry, now with `occurredTime` | `400` with `fields.occurredTime`. Any write on an archived application's entries or requirements: `409` | AC-6, AC-9, AC-10 |
| `GET` | `/api/applications/:id/activities` | | entries in the new order | `404` | AC-11 |

Changes to an entry or requirement, found by its own id, look up the application it belongs to for the archive check.

## UI

- **Detail page header** (`ApplicationDetailPage.tsx`): an **Archive** button beside Edit and Delete. When archived it shows an "Archived" pill and **Restore** in its place, and the stage menu and Edit are disabled. The company name is an `<a target="_blank" rel="noopener noreferrer">` when the company has a website (AC-8). Archive and Restore update the shared list through `replaceApplication`, and show a message on failure (the page's existing `stageError` style).
- **Requirements, Timeline, Contacts**: each takes a `readOnly` prop. When set, the checkboxes, "+ Add", and every Edit and ✕ are disabled or left out, and the box says nothing else changed. A short "Archived. Restore to make changes." line sits at the top of the page.
- **Application form** (`ApplicationForm.tsx`): a **Website** field under Company, with its error message. It starts from the application's `companyWebsite`, and when the Company field names a known company it shows that company's website instead (AC-7).
- **Timeline form and entry** (`Timeline.tsx`): a **Time** `<input type="time">` beside Date, optional, in both the add and edit forms. An entry's muted line shows `date`, then `· 2:30 PM` formatted for the user's locale, when it has a time (AC-9, AC-10).
- **Board and table**: use only the active applications. Each card and row gets an **Archive** icon button (`Card.tsx`, `TableView.tsx`) that archives without opening the page and doesn't start a drag. The Archived table has **Restore** in place of Archive on each row.
- **Sidebar** (`Sidebar.tsx`): an **Archived** entry below the stage list, with the archived count. It is marked current while `/table?archived=1` is open, and none of the others are. The counts and "All applications" total use active applications only.
- **Table** (`TableView.tsx`, `tableQuery.ts`): `archived` joins the query kept in the address. When it is set the table lists archived applications, with the same search and sort. An empty Archived table says "Nothing is archived."
- **States:** loading, error, and the empty message follow what the page already does. Archiving or restoring shows the change at once, and a failed call puts it back with a message.

## Shared types

In `packages/shared`:

- `Application` gains `archivedAt: string | null` and `companyWebsite: string | null`. `Company` gains `website: string | null`.
- `applicationInputSchema` gains `companyWebsite`, an optional web address, using the job link's normalizing and validation (`jobDetails.ts`), with its own message, "Website must be a web address starting with http:// or https://".
- `activities.ts`: `Activity` gains `occurredTime: string | null`. The input and update schemas gain an optional `occurredTime`, empty becoming `null`, matching `^([01]\d|2[0-3]):[0-5]\d$`, with the message "Time must be a valid time".
- A small `compareActivities` helper (newest date, then timed before untimed with the later time first, then newest id) used by the server's SQL tests and the client's re-sort, so the rule lives once.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | API, UI | `POST .../archive` sets `archivedAt` and keeps every other field. The page shows the pill and Restore in place of Archive. |
| AC-2 | UI | A card's and a row's Archive button archives it, removes it from the view without a reload, has an application-specific accessible name, and doesn't open the page or start a drag. |
| AC-3 | UI | Archiving lowers the stage count and total. The board and the table no longer list it. |
| AC-4 | UI | The Archived entry shows the count, opens only archived applications with search and sort, shows the empty message, and is marked current only there. |
| AC-5 | API, UI | `restore` clears `archivedAt` and keeps the stage. It returns to the board, table, and counts. Repeating archive or restore changes nothing. |
| AC-6 | API, UI | Every write on an archived application's own data, entries, and requirements is `409`, and `DELETE` still works. The page's controls are disabled, including contacts, and everything stays readable. |
| AC-7 | shared, API, UI | The website is normalized, rejected when invalid, cleared when empty, shared by the company's other applications, and prefilled from the chosen company. |
| AC-8 | UI | The company name is a new-tab link with a website and plain text without one. |
| AC-9 | shared, API, UI | The optional time is accepted, rejected when invalid, and cleared when emptied, in both forms. |
| AC-10 | UI | The muted line shows the time when set and only the date otherwise. Automatic and older entries show no time. |
| AC-11 | shared, API, UI | Entries sort by date, then timed before untimed with the later time first, then newest added. The client's re-sort matches the server's. |
| AC-12 | migration | Applying 0006 to a database with data leaves every application unarchived, every company without a website, and every entry without a time. |
| AC-13 | UI | The new controls are reachable with the keyboard, readable in both themes by the existing contrast test, and don't overflow a narrow screen. |

One short smoke script on the production build, in one theme, covers archive, restore, the website link, and a timed entry.

## Risks and mitigations

- **A save path that forgets `companyWebsite` would clear the website.** `applicationToInput` (used by the stage menu, drag and drop, and Edit) must carry it. A test saves a stage change on a company with a website and checks it survives.
- **Archive and the board's drag and drop.** An archived card is never on the board, so it can't be dragged, but a drag in flight when another tab archives it would hit the `409`. The board already puts a card back and shows a message when a move fails (spec 006), and a test covers a `409`.
- **The server and the client order the timeline separately.** The shared `compareActivities` and a test that runs the same cases through both keep them from drifting.
- **Moving an application to another company in the form.** The website field now belongs to the company chosen when saving, so a test checks that changing the company name replaces the field's value and saves to the chosen company (spec's edge case).
- **The time input varies by browser.** Its value is always `HH:MM`, and the shared schema checks it again on the server, so a browser that shows a text box still sends something valid or gets a message.
- **Existing databases.** The migration only adds nullable columns, so it can't fail on existing data, and the migration test runs it against a database filled by the earlier ones.

## New dependencies

None.

## Tasks

Tier 3: the tasks are in [tasks.md](tasks.md), written after this plan is approved.
