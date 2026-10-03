# 017: Archive, company website, and entry times (tasks)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Plan    | [plan.md](plan.md) |
| Status  | Implemented |
| Updated | 2026-10-02         |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

The order is shared code, then the migration and the server, then the client, so each step builds on one that is already tested.

- [x] **T1:** In `packages/shared`, add `occurredTime` to `Activity` and to the activity input and update schemas (optional, empty becomes `null`, `HH:MM` 24-hour, message "Time must be a valid time"), and add `compareActivities` (newest date, then timed before untimed with the later time first, then newest id), with tests for valid and invalid times, clearing, and every ordering case (AC-9, AC-11)
- [x] **T2:** In `packages/shared`, add `companyWebsite` to `applicationInputSchema` (the job link's normalizing and validation, "Website must be a web address starting with http:// or https://", 2,000 characters, empty clears), and add `archivedAt` and `companyWebsite` to `Application` and `website` to `Company`, with tests: `https://` added, a bad address rejected, an empty value becoming `null` (AC-7)
- [x] **T3:** Add migration `0006_archive_website_entry_times.sql` (`archived_at`, `website`, `occurred_time` with its `GLOB` check) and extend `migrate.test.ts` and `schema.test.ts`: it applies on top of a database filled by migrations 0001 to 0005, and every application is unarchived, every company has no website, and every entry has no time (AC-12)
- [x] **T4:** Entry times on the server: `activities/store.ts` reads and writes `occurred_time`, orders by date, timed before untimed, later time first, then id, and the router passes `occurredTime` through. Tests for create, edit to set and to clear a time, an invalid time returning `400` with `fields.occurredTime`, the order matching `compareActivities`, and automatic stage-change entries having no time (AC-9, AC-10, AC-11)
- [x] **T5:** Company website on the server: `applications/store.ts` writes the company's `website` from `companyWebsite` in the same transaction as finding or creating the company, returns `companyWebsite` on every application and `website` from `GET /api/companies`, and an empty or missing value clears it. Tests: set and clear, shared by the company's other applications, an invalid address returning `400` with `fields.companyWebsite`, and choosing another company saving to that company (AC-7, AC-8)
- [x] **T6:** Archive and restore on the server: `archiveApplication` and `restoreApplication` in the store (idempotent, keeping the first `archivedAt`), `POST /api/applications/:id/archive` and `.../restore` in the router, and `archivedAt` returned on every application. Tests: archive keeps every other field and the stage, restore clears it and keeps the stage, repeating either changes nothing, an unknown id returns `404` (AC-1, AC-2, AC-5)
- [x] **T7:** Read-only on the server: `PUT /api/applications/:id` and every create, change, or delete of the application's timeline entries and requirements return `409 {"error":"Application is archived"}`, looking up the owning application by the entry's or requirement's id, while `DELETE /api/applications/:id` and the contacts routes still work. Tests for each route, before and after restore (AC-6)
- [x] **T8:** Client data: add `archivedAt` and `companyWebsite` handling to `lib/api.ts` (`archiveApplication`, `restoreApplication`), carry `companyWebsite` in `applicationToInput`, split the shared list into active and archived in `useApplications.tsx`, and make `stageCounts` and the sidebar total use the active ones. Tests: a stage change on a company with a website keeps it, archiving and restoring swap one application in the list, and the counts drop and return (AC-3, AC-5, AC-7)
- [x] **T9:** Table query and sidebar: add `archived` to `tableQuery.ts` (parsed from and written to the address), and make `TableView` list archived applications when it is set, with the same search and sort and the empty message "Nothing is archived." Add the **Archived** entry with its count to `Sidebar.tsx`, marked current only on `/table?archived=1`. Tests for the address round trip, the entry, its count, its current mark, and the empty message (AC-4)
- [x] **T10:** Quick archive and restore: an **Archive** icon button on each card (`Card.tsx`) and table row (`TableView.tsx`), named `Archive: <job title> at <company>`, that doesn't open the page or start a drag, and **Restore** in its place on the Archived table's rows. The board and table drop an application at once, and a failed call puts it back with a message. Tests for the name, the keyboard, no navigation, no drag, and the failure (AC-2, AC-3, AC-5, AC-13)
- [x] **T11:** Detail page archive: an **Archive** button beside Edit and Delete, or the "Archived" pill with **Restore** and a disabled stage menu and Edit, plus the "Archived. Restore to make changes." line, with a message when the call fails. Tests for archive, restore, the disabled controls, and Delete still asking first and working (AC-1, AC-5, AC-6)
- [x] **T12:** Read-only boxes: give `Requirements`, `Timeline`, and `Contacts` a `readOnly` prop that disables the checkboxes and "+ Add" and leaves out every Edit and ✕, and pass it from the page for an archived application. Tests for each box, and that everything stays readable (AC-6)
- [x] **T13:** Company website in the form and on the page: the **Website** field and its error in `ApplicationForm.tsx`, starting from the application's website and switching to the chosen company's website when the Company field names a known company, and the company name in the page header as a new-tab link (`rel="noopener noreferrer"`) when there is a website. Tests: the field's start value and its switch, an error shown, saving it, clearing it, the link with and without a website (AC-7, AC-8)
- [x] **T14:** Entry time in the timeline: the optional **Time** field beside Date in the add and edit forms, the time on an entry's muted line formatted for the user's locale, and the client's re-sort in `Timeline.tsx` using `compareActivities`. Tests: adding, editing, and clearing a time, an invalid time shown as an error, the line with and without a time, and the order after a save matching the server's (AC-9, AC-10, AC-11)
- [x] **T15:** Styles and accessibility: style the new buttons, pill, banner line, Archived entry, and fields on the existing tokens in both themes and on a narrow screen, and add the new text and background pairings to the contrast test. Tests for contrast and for keyboard reach (AC-13)
- [x] **T16:** Docs: add the Archived view, the company website, and entry time to the README's "What it does", the new routes to its API table, the `archived`, `companyWebsite`, and `occurredTime` fields to its field notes, and the new columns to its data model diagram. Mark the roadmap's 017 line implemented, set this spec, plan, and tasks to Implemented, and update the index row

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] One smoke script on the production build, in one theme, covers: archive from the page and from a card, the counts and Archived entry, restore, a read-only archived page, a company website link, and a timed timeline entry. Results noted below

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- The smoke script ran at the HTTP level against the production build (`npm run build`, then `npm start`) with a throwaway database, because no browser tool was available in the session. It made 17 checks: the built page and the archived address are served, a company website is saved and shared, an invalid website and time are rejected, a timed entry sorts before an untimed one, archive keeps the stage and repeats harmlessly, every change to an archived application and its entries and requirements returns `409` while reading still works, restore brings back the same stage and allows changes, and an archived application can be deleted. All 17 passed. How the new controls look in a browser rests on the component tests and the contrast and style tests.
- A save that leaves `companyWebsite` out clears the company's website, as the plan decided (the same as every other optional field in a full-replace save). The form always sends it, filled from the company, so only a script that omits it is affected. One case in the form: if the company suggestions couldn't load, the Add form can't prefill a known company's website, and saving would clear it.
- Existing tests that found a card by its name now skip the new Archive button, whose name also holds the company and title, and the table gained a visually hidden "Actions" column header. The sidebar's entry count went from 9 to 10.
