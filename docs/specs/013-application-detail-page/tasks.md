# 013: Application detail page (tasks)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Plan    | [plan.md](plan.md) |
| Status  | Implemented        |
| Updated | 2026-10-02         |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

- [x] **T1:** Add `getApplication(db, id)` to the server's application store and `GET /api/applications/:id` to its router, with API tests: the application is returned, and a missing id, `abc`, `1.5`, and `-1` give 404. Add `api.getApplication` to the client's `api.ts` with a test, and the same route to the fake server (AC-1, AC-10, AC-11)
- [x] **T2:** Add `lib/useDialogFocus.ts` with tests: focus moves in on open, Tab and Shift+Tab wrap inside, and focus returns to the opener on close (AC-16)
- [x] **T3:** Use `useDialogFocus` in `ConfirmDialog`, and add tests that Tab stays on its two buttons and that a confirmation over another dialog traps focus on its own (AC-16)
- [x] **T4:** Split the panel: move the form into `ApplicationForm` (no tabs, stage info, or delete button of its own), and add `ApplicationDialog` (title, close button, discard confirmation, `useDialogFocus`) with its styles. Rename the panel's add tests to match. To keep the board and table tests green until cards and rows open the page, a thin `ApplicationPanel` stays for editing, wrapping `ApplicationForm` with the tabs, stage info, and delete button, and is deleted in T13 (AC-6, AC-13, AC-16)
- [x] **T5:** Open the Add dialog from `ApplicationsPage` instead of the side panel, and test that Add opens the dialog, that saving closes it and the new application shows on the board and in the table, and that it traps Tab and gives focus back (AC-13, AC-16)
- [x] **T6:** Add `lib/viewOrigin.ts` with tests: build the `from` value from a location, and read it back from router state, accepting only `/` or `/table` with an optional search and returning the board for anything else, with the label "Back to board" or "Back to table" (AC-8, AC-9, AC-10)
- [x] **T7:** Add `ApplicationDetailPage` and its route `/applications/:id`, with its styles: the loading, not-found (including an id that isn't digits), and error states, the back link, the header with the company, the title, and the work mode and employment type, and an empty body. Tests: the page loads from its address with no state, and the not-found message (AC-1, AC-9, AC-10, AC-11, AC-15)
- [x] **T8:** Add the Details section as a description list, the Job description section, and the Requirements, Timeline, and Contacts sections with their headings, in the two-column layout that becomes one column with Details first on narrow screens. Tests: every row of Details, "–" for empty values, the "Overdue" mark, a valid and an invalid job link, the empty and filled description with line breaks kept, and no `tab` role (AC-2, AC-3, AC-4, AC-12, AC-14, AC-15)
- [x] **T9:** Add the stage menu: fetch the latest application, save it with only the stage changed, show the new stage at once, and put the saved one back with an alert on failure. Remount the timeline afterward, and ignore results of earlier changes. Tests cover the requests, the failure, the stage-change entry, and two quick changes (AC-5, AC-12)
- [x] **T10:** Add Edit, which opens `ApplicationDialog` filled with the application and updates the page and the timeline on save, and Delete with its `ConfirmDialog`, which deletes and goes to the view I came from. Tests: Edit and Save, the discard check, cancel deleting nothing, and delete going back to the saved view (AC-6, AC-7, AC-8, AC-16)
- [x] **T11:** Open the page from the board's cards and the table's rows by navigating with the current address as `from`, and test going back, using the browser's Back, and deleting from a filtered table, plus an edited row showing its new values there. The side panel can no longer be opened, so delete `ApplicationPanel` with its styles and the panel parts of the form and the outlet context here. Move the tests that expected a panel: those for the timeline, contacts, requirements, and job details now go through the page, and the panel's own tests become page tests (AC-1, AC-8, AC-9, AC-13)
- [x] **T12:** Add a page-level test that adds a timeline entry, a contact, and a requirement, and a keyboard test that tabs through the link back, the stage menu, Edit, Delete, and the sections (AC-12, AC-16)
- [x] **T13:** Check that no `aside` or panel is rendered anywhere, and extend the contrast test with the page's text and background tokens in both themes (AC-13, AC-14)
- [x] **T14:** Note the detail page in the changelogs of specs 002, 003, 006, 007, 008, 009, and 012, where their criteria describe the side panel or its tabs (Risks in the plan)
- [x] **T15:** Run the browser checks in both themes against the production build, including reloading `/applications/:id` directly, and a Docker image copy, and record them below (AC-1 to AC-16)
- [x] **T16:** Set the spec and plan status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- T4 and T5 differ from the plan in order only: the side panel can't lose its tabs and delete button before the page has them, or about 100 existing tests for them would fail for several commits. So `ApplicationPanel` stays, as a thin wrapper around `ApplicationForm`, until T13 deletes it. The end state is the one in the plan.
- The page's title is an `h2`, because the app's header already has the `h1`. On a narrow screen the sections are reordered with CSS only (Details first), so keyboard order follows the wide layout. Details has only one link, so this is minor.
- Details shows the stage with its icon and color, time in stage as on a card ("5 days"), and the closed date when there is one, besides the items in AC-3. Next step and its due date share one row.
- `Contacts` gained an optional `onChange` callback, so the page can reload the timeline's contact choices after a contact is added, changed, or deleted (AC-12).
- T11 also did the panel cleanup that T13 planned, because the panel became unreachable as soon as cards and rows opened the page. T13 keeps the contrast test and the no-panel check. Spec 006's AC-8 (the panel closes when its application is dragged to another column) no longer applies and its test is removed.
- Browser checks were run by the assistant on 2026-10-02 in headless Chromium (Playwright, outside the repo), against the production build on a temporary database, in the light and the dark theme. All 65 checks passed in each theme (130 in all), and the same 130 passed against a separate copy of the Docker image on port 8099 with its own empty database. The test container and image were removed afterward, and the check script is not committed:
  - A card opens `/applications/:id` with no dialog or `aside`, the header shows the company, title, and badges, and the five sections show with no tabs (AC-1, AC-2).
  - Details shows the stage, pay, location, source, next step with "Overdue", applied date, and an "Open posting" link that opens in a new tab. The description keeps its line breaks (AC-3, AC-4).
  - Rendered text colors in the page measured at least 4.5 to 1 against their real backgrounds in both themes (AC-14).
  - The stage menu saves, shows the new stage, and adds the timeline entry, and the stage can be put back (AC-5).
  - A timeline entry, a contact, and a requirement can each be added and are still there after a reload. A contact added on the page shows up in the timeline's contact choices (AC-12).
  - Reloading the page address shows the page, and its link goes to the board. A missing number and `abc` show the "doesn't exist" message (AC-9, AC-10, AC-11).
  - Edit opens with the current values, Escape asks before discarding, Cancel keeps the form, Save closes it and updates the page, and focus goes back to Edit. In the dialog, 45 presses of Tab never left it (AC-6, AC-16).
  - Tab reaches the link back, the stage menu, Edit, and Delete (AC-16).
  - From `/table?stage=applied&q=init` the link says "Back to table". Cancel deletes nothing, delete returns to the same filtered table, and the browser's Back and the link back keep the search, filters, and sort (AC-7, AC-8, AC-9).
  - Add application opens the dialog, saving adds the card, and no side panel exists (AC-13).
  - At 390 pixels wide the sections are in one column with Details first, nothing scrolls sideways, and very long text wraps, at 1,280 pixels too (AC-15).
  - No uncaught browser errors and no request left the app.
- The browser checks found four problems that the component tests could not, and they are fixed and tested or rechecked:
  - In a 900 pixel high window the dialog grew taller than the screen and its Save button was out of reach. The dialog now caps its height and the form scrolls inside it.
  - Pressing Escape right after typing didn't ask before discarding, because the dialog learned about the change one render late. It now reads the change from a ref when the key is pressed.
  - A very long company name with no spaces made the Contacts heading, and the page, wider than a phone. Text in the page's sections now wraps anywhere.
  - Adding a contact or changing the stage remounted the timeline, which cleared an entry being typed. The timeline now reloads in place, with tests for both.
- Not covered in the browser: dragging cards (unchanged by this spec, and covered by its component tests).
