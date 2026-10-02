# 009: Requirements checklist (tasks)

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

- [x] **T1:** Add the shared requirement types, labels, and input schema (AC-9, AC-10)
- [x] **T2:** Add migration `0005_create_requirements.sql`, with tests for the table, constraints, and cascade (AC-11, AC-12)
- [x] **T3:** Add the requirements store: list in display order, create, update, delete (AC-3, AC-4, AC-5, AC-7, AC-8)
- [x] **T4:** Add the requirements routes with validation and 404s, and mount them (AC-3, AC-5, AC-7, AC-8, AC-10)
- [x] **T5:** Add the client API calls and extend the fake server for requirements (AC-3, AC-13)
- [x] **T6:** Build `Requirements.tsx` with loading, error, empty, and list states, and the summary (AC-2, AC-4, AC-6, AC-12, AC-13)
- [x] **T7:** Add the form: add an item, validation errors, and failed-add handling (AC-3, AC-9, AC-13)
- [x] **T8:** Add the checkbox, with saving state and failure handling (AC-5, AC-6, AC-13)
- [x] **T9:** Add edit and delete with confirmation (AC-7, AC-8, AC-13)
- [x] **T10:** Add the Requirements tab to the panel (AC-1, AC-14)
- [x] **T11:** Confirm existing board, panel, timeline, contacts, and drag and drop tests pass unchanged (AC-12)
- [x] **T12:** Run the browser checks and record them below (AC-1 to AC-14)
- [x] **T13:** Set the spec status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

- The Requirements tab makes four tabs, so the tab test in `Contacts.test.tsx` now expects four (spec 008 AC-1 is noted in its changelog).
- While checking the edit flow I found that an edge case in the spec contradicted AC-4: it said an item moved to the other kind goes last in its new group. The code, the server test, and AC-4 order each group by when items were added, so the spec's edge case was corrected to match.
- Checking an item waits for the server before the box changes, as the plan says, so the box always matches what is stored. A browser script that expects an instant change needs to wait for the summary instead.
- Browser checks were run by the assistant on 2026-10-02 in a real headless Chromium (Playwright, outside the repo) against the production build with a throwaway database. All 12 passed:
  - Four tabs in order for an existing application, none for a new one (AC-1). The empty state shows the message, no summary, and Required selected (AC-2, AC-12).
  - Empty and 501-character text show errors (AC-9).
  - Adding clears the text and keeps the kind, and the list is required first then preferred, each in the order added (AC-3, AC-4).
  - Checking and unchecking updates the summary, items keep their place, and it all survives a reload (AC-5, AC-6).
  - Edit changes text and kind, keeps met, moves the item to its new group, and Cancel discards (AC-7).
  - Delete asks first, Cancel keeps, and confirming removes the item and updates the counts (AC-8).
  - The timeline and the board card are unchanged (AC-12). Unsaved Details edits survive a trip to Requirements (AC-14).
  - With the browser offline, adding keeps the typed text, and a failed check leaves the box as it was (AC-13).
  - Deleting the application removes its requirements (AC-11). No uncaught browser errors.
  - The spec 007 checks (18) still pass, and the spec 008 checks (16 of 17) pass. The 17th expected exactly three tabs, which this spec changed.
- Not covered in the browser: a failed load, a failed delete, and direct server requests (AC-10). Automated tests cover them. The check script is not committed.
Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
