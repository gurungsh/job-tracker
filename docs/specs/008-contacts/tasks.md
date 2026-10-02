# 008: Contacts (tasks)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Plan    | [plan.md](plan.md) |
| Status  | Implemented      |
| Updated | 2026-10-02         |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

- [x] **T1:** Add the shared contact types and input schema, and add `contactId` and `contactName` to the shared activity types and input schemas (AC-4, AC-5, AC-8)
- [x] **T2:** Add migration `0004_create_contacts.sql`, with tests for the new table, `SET NULL`, and existing entries (AC-7, AC-12)
- [x] **T3:** Add the contacts store: list with entry counts, create, update, delete (AC-2, AC-3, AC-6, AC-7)
- [x] **T4:** Add the contacts routes with validation and 404s, and mount them (AC-3, AC-4, AC-5, AC-6, AC-7)
- [x] **T5:** Carry the contact on entries: store it, join its name, and reject a contact from another company (AC-8, AC-9, AC-10)
- [x] **T6:** Clear an application's entry links when its company changes (AC-11)
- [x] **T7:** Add the client API calls and extend the fake server for contacts and entry contacts (AC-3, AC-13)
- [x] **T8:** Build `Contacts.tsx` with loading, error, empty, and list states (AC-2, AC-12, AC-13)
- [x] **T9:** Add the contact form: add, validation errors, and failed-add handling (AC-3, AC-4, AC-13)
- [x] **T10:** Add edit and delete with the entry-count confirmation (AC-6, AC-7)
- [x] **T11:** Add the Contacts tab to the panel (AC-1, AC-14)
- [x] **T12:** Add the Contact choice to the entry form, and show "with <name>" on entries (AC-8, AC-9)
- [x] **T13:** Confirm existing board, panel, timeline, and drag and drop tests pass unchanged (AC-12)
- [x] **T14:** Run the browser checks and record them below (AC-1 to AC-14)
- [x] **T15:** Set the spec status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

- Nothing diverged from the plan. `requiredText` and `optionalText` in `packages/shared/src/applications.ts` are now exported so `contacts.ts` can reuse them.
- Browser checks were run by the assistant on 2026-10-02 in a real headless Chromium (Playwright, outside the repo) against the production build with a throwaway database. All 17 passed on the first run, and the 18 checks from spec 007 still pass:
  - Three tabs for an existing application and none for a new one (AC-1). The empty state names the company (AC-2, AC-12).
  - Missing name and a bad email show errors next to the field (AC-4).
  - Contacts are listed alphabetically ignoring case, with notes line breaks kept, the form clears, and they survive a reload (AC-2, AC-3).
  - An application whose company was typed in lowercase ("acme") shares the contacts, and one at Globex doesn't (AC-3).
  - Edit and Cancel on a contact (AC-6), and a rename shows on entries (AC-6).
  - The entry form's Contact choice lists None and the contacts. It saves, shows "with <name>", survives a reload, can be changed or set to None, and works on an automatic entry (AC-8, AC-9).
  - Deleting a contact asks first and states "3 timeline entries mention them". Cancel keeps it. Confirming removes it, and the entries in both applications stay with no contact (AC-7).
  - Moving an application to another company clears its entries' contacts and leaves the other application's alone (AC-11).
  - Board cards are unchanged (AC-12). With the browser offline, adding a contact shows an error and keeps the text (AC-13). Unsaved Details edits survive a trip to Contacts (AC-14). No uncaught browser errors.
- Not covered in the browser: a failed load, a failed delete, and direct server requests (AC-5, AC-10). Automated tests cover them. The check script is not committed.
Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
