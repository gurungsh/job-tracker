# 012: Table view (tasks)

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

- [x] **T1:** Add `lib/tableQuery.ts` with tests: `parseTableQuery` (valid values only, repeated values counted once) and `toSearchParams` (AC-13, AC-14)
- [x] **T2:** Add `lib/tableRows.ts` with tests: `filterApplications` (search and the three filters) and `sortApplications` (default order, every column rule, empty values last, stable ties). Export `employmentLabel()` from `lib/jobSummary.ts` for the table's cells (AC-5, AC-6, AC-7, AC-8, AC-9, AC-12)
- [x] **T3:** Install `react-router` in `apps/client`, wrap `App` in `BrowserRouter` in `main.tsx`, and add the routes `/`, `/table`, and a redirect from anything else to `/`, with the existing `App` and board tests wrapped in `MemoryRouter` (AC-1, edge case)
- [x] **T4:** Move the load state, `reload`, and `replaceApplication` from `Board` into `lib/useApplications.ts`, and add `ApplicationsPage`, which owns the panel and renders the loading and error states, the active view, and `ApplicationPanel`. `Board` takes its data and panel controls as props. All existing board, drag and drop, and panel tests pass with only the router wrapper changed (AC-16, AC-17)
- [x] **T5:** Add `ViewSwitch` with its styles and tests: Kanban and Table links that keep the query string, `aria-current` on the current one, and Back returns to the previous view (AC-1, AC-2, AC-15, AC-22)
- [x] **T6:** Add `FilterDropdown` with its styles and tests: a checkbox per value, a count on the button, closes on Escape, outside click, and focus leaving, and works with the keyboard (AC-7, AC-8, AC-22)
- [x] **T7:** Add `TableView` and its styles: the nine columns and cell formats, the empty and no-match states, and long text cut off with "…" (AC-3, AC-4, AC-18, AC-19, AC-20, AC-21)
- [x] **T8:** Wire the toolbar: search as I type, the three dropdowns, the "N of M" count and Clear, all kept in the address with `replace` (AC-6, AC-7, AC-8, AC-9, AC-10, AC-13, AC-14, AC-15)
- [x] **T9:** Wire the sort: headings cycle ascending, descending, default, with `aria-sort` and an arrow (AC-11, AC-12, AC-13)
- [x] **T10:** Open the panel from a row click and from Enter on its title button, and test that a save or delete closes the panel and updates the table (AC-16, AC-17, AC-22)
- [x] **T11:** Extend the contrast test if the table adds color tokens, and check the table's text in both themes (AC-20)
- [x] **T12:** Note the second view in the changelogs of specs 002 and 011, where their criteria describe the board as the only view (Risks in the plan)
- [x] **T13:** Run the browser checks in both themes against the production build, including reloading `/table?...` directly, and a Docker image copy, and record them below (AC-1 to AC-22)
- [x] **T14:** Set the spec and plan status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- `react-router` 8.4.0 was installed. The client script grew from about 352 kB to about 400 kB (121 kB gzipped).
- Existing board, panel, timeline, contacts, requirements, and theme tests now render the app through a router (`tests/support/render.tsx`). Their assertions did not change.
- The Stage dropdown and the Stage column's sort button have the same name, so the toolbar is a labeled group ("Search and filters") that tests use to tell them apart.
- No new color tokens were needed. The table, filter, and switch styles use the existing tokens, and a test fails if a hex color is written into one of those files (T11).
- Browser checks were run by the assistant on 2026-10-02 in headless Chromium (Playwright, outside the repo), against the production build on a temporary database, in the light and the dark theme. All 54 checks passed in each theme (108 in all), and the empty-state check (AC-18) passed in both on a fresh database:
  - The main address shows the board, Table opens `/table`, and Back and Forward move between them (AC-1, AC-2).
  - The nine columns, one row per application, stage order, and the cell formats: stage icon, pay, "Contract · 6 mo", overdue marker, and "–" for empty values (AC-3, AC-4, AC-5).
  - Search as I type, including `c++` and spaces only, the "2 of 6" count, and Clear (AC-6, AC-10).
  - The three dropdowns and their combinations, Escape and a click outside closing them, and the no-match message (AC-7, AC-8, AC-9, AC-19, AC-22).
  - Sorting by pay (hourly as yearly, empty last, three clicks back to default) and by company, with `aria-sort` (AC-11, AC-12).
  - Reloading a `/table?...` address directly shows the same view, invalid values are ignored, an unknown address shows the board, and the search and filters survive a switch to the board and back (AC-13, AC-14, AC-15).
  - Clicking a row opens the panel, closing it leaves the view alone, and a save closes the panel and removes a row that stops matching (AC-16, AC-17).
  - Very long text is cut off with an ellipsis, the page doesn't scroll sideways, and at 600 pixels wide the table scrolls inside its own box (AC-21).
  - Rendered text colors measured at least 4.5 to 1 against their real backgrounds for the headings, cells, titles, stage cell, time in stage, overdue chip, due date, the switch, the search box, the filter buttons, and a hovered row (AC-20).
  - Tab reaches the switch, the search box, the filters, the headings, and the job titles, and Enter on a title opens the panel (AC-22).
  - The board still shows all its cards, no uncaught browser errors, and no request left the app.
- The same 108 checks and the empty-state check also passed against a separate test copy of the Docker image on port 8099, with its own empty database. The test container and image were removed afterward. The check script is not committed.
- Not covered in the browser: adding an application while the table is open, because the table has no Add button (the board's button is unchanged). Component tests cover a save and a delete updating the table.
