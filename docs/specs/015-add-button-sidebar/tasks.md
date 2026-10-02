# 015: Add button in the sidebar (tasks)

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

- [x] **T1:** Add `addApplication(saved)` to the store in `lib/useApplications.tsx`, with tests: it inserts the application in board order, adds its company to the suggestions when it's new and not twice when it isn't, and does nothing to a list that isn't ready (AC-4, AC-9)
- [x] **T2:** Add the Add application button to `Sidebar`: a `div.sidebar` with the button above the "Stages" navigation, the `onAdd` prop and `addRef`, the `Plus` icon, `.sidebar-add` styles, and the sticky rule moved to the whole sidebar. Tests that it is first in the sidebar and outside the navigation, has the icon and the `primary` class, comes first in tab order, and calls `onAdd` on Enter and Space (AC-1, AC-8, AC-10)
- [x] **T3:** Move the dialog to `AppShell` and wire the button on a wide screen: `adding` state, `ApplicationDialog` with the company names from the store (none while loading or failed), saving through `addApplication` or a reload when the list isn't ready, the address untouched, and focus going back to the Add button when it closes. Remove the board's toolbar and button, the dialog and `openAdd` from `ApplicationsPage`, and `openAdd` from the outlet context. Tests from the board, the table with filters set, an application's page, and the missing-application page: one Add button on each, the form opens on Wishlist, saving keeps the address and raises the counts at once, the row appears in the table only when it matches, closing a changed form asks first, it works while the list is loading or has failed, and choosing it twice opens one form (AC-1, AC-2, AC-3, AC-4, AC-5, AC-9, AC-11)
- [x] **T4:** Add from the narrow drawer: choosing the button closes the drawer and opens the form without the drawer's own focus step, and when the form closes focus goes to the menu button. Tests with `matchMedia` set to narrow, including that the header has no Add button (AC-6)
- [x] **T5:** Reword the empty messages on the board and the table to point at the Add application button in the sidebar, with tests that neither says "board" (AC-7)
- [x] **T6:** Raise the dialogs' backdrop above the sticky header (`z-index: 40`), with a CSS test that the dialog layer is above the header and the drawer's layers stay below the header (AC-3)
- [x] **T7:** Check `Sidebar.css` and `Board.css` in the contrast test's token-only rules, that the button's text and background are the accent pair that is already checked, and that the board's toolbar styles are gone (AC-10, AC-11)
- [x] **T8:** Note the moved button in the changelogs of specs 002, 012, 013, and 014, where their text says the Add button is in the board's toolbar or that the table has none (Risks in the plan)
- [x] **T9:** Run the browser checks in both themes against the production build, at wide and phone widths, including a screenshot of a dialog over the header and a Docker image copy, and record them below (AC-1 to AC-11)
- [x] **T10:** Set the spec and plan status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
- T2 and T3 are one commit, because a second "Add application" button in the sidebar would break every existing test that finds the board's button by name until the board's is removed.
- The store's `addApplication` leaves a list that isn't ready alone, and the shell decides to reload in that case, instead of the store doing both as the plan's decision table says. The result for the user is the same.
- Browser checks were run by the assistant on 2026-10-02 in headless Chromium (Playwright, outside the repo), against the production build on a temporary database, in the light and the dark theme. All 47 checks passed in each theme (94 in all), and the same 94 passed against a separate copy of the Docker image on port 8099 with its own empty database. The test container and image were removed afterward, and the check script is not committed. The earlier scripts for specs 013 (65 checks) and 014 (78 checks) were run again against the new build, in both themes, and passed:
  - On the board, the table, an application's page, and the page for a missing application there is exactly one Add application button. It is first in the sidebar, above "All applications", full width, with an icon, and the board has no toolbar and no gap where it was. Its text measured at least 4.5 to 1 against its background in both themes (AC-1, AC-2, AC-10, AC-11).
  - Choosing it on each screen opened one Add application form on Wishlist. A dialog's backdrop covered the header and the sidebar, and so did the discard confirmation. Enter and Space opened the form, and the button came before the sidebar's links in tab order (AC-3, AC-8).
  - Saving from the board raised the counts at once and put the card in its column. From `/table?q=corp&stage=applied&sort=company&dir=desc` the address stayed the same, a matching row appeared, and a row that didn't match did not, though the counts rose. From an application's page it stayed on that page (AC-4).
  - A changed form asked before closing, Cancel kept what was typed, and focus went back to the Add button after discarding, after an unchanged form closed, and after saving (AC-5).
  - At 390 pixels wide the header had no Add button. The drawer had it first, above "All applications". Choosing it closed the drawer and opened the form, focus went to the menu button after Escape and after saving, the address stayed, and the drawer showed the new count (AC-6).
  - With the list failing to load, the button was there, the form opened without suggestions, and after saving the list loaded again with its counts (AC-9).
  - With no applications, the board and the table both said "No applications yet. Use the Add application button in the sidebar to add your first one.", and the first application could be added from there (AC-7).
  - Choosing the button twice quickly opened one form, and on a long page the button stayed at the top of the sidebar.
  - No uncaught browser errors and no request left the app.
- The screenshots and the browser checks found three problems that the component tests could not, all in dialogs and all older than this spec. Each is fixed with a test of the rule:
  - The sticky header from spec 014 sat above a dialog's backdrop, so it wasn't dimmed and its buttons stayed clickable. Dialogs now sit above it (T6).
  - On a 390 pixel screen a dialog ran off the right edge, with its close button cut off. The backdrop's one column is now the width of the screen. The form's job details fieldset and the two salary fields also refused to shrink, and now do.
  - The same fixes apply to the confirmation dialogs, which share the backdrop.
- Not covered in the browser: opening the app on a real phone. The 390 pixel window stands in for it.
