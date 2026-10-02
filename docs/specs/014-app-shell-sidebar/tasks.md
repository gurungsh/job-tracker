# 014: App shell and sidebar (tasks)

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

- [x] **T1:** Add `lib/stageCounts.ts` with tests: `stageCounts(applications)` gives one count per stage, counts closed stages, and gives 0 for a stage with none or for an empty list (AC-2)
- [x] **T2:** Add `lib/useMediaQuery.ts` with tests and the `NARROW_QUERY` constant (`(max-width: 52rem)`): it reads `matchMedia`, follows changes, and reads as wide where `matchMedia` doesn't exist (AC-8)
- [x] **T3:** Move the list into `ApplicationsProvider` in `lib/useApplications.ts`, with a hook to read it and a new `removeApplication`. Wrap the routes in it in `App.tsx`. `ApplicationsPage` reads the list from the provider and reloads it quietly on mount when it was already loaded. Tests for the provider and for the quiet reload, and all existing board, table, and dialog tests pass unchanged (AC-3, AC-7)
- [x] **T4:** Make the detail page keep the shared list right: `replaceApplication` when the stage changes (at once, then with the saved result, or the saved stage after a failure) and after an edit, and `removeApplication` after a delete. Tests read the list through a small test consumer of the provider (AC-3)
- [x] **T5:** Add `Sidebar` with its styles and tests, not yet shown in the app: "All applications" with the total and the eight stages in board order, each with its icon, stage color, and count, the links built with `toSearchParams`, the selected entry from the address with `aria-current="page"`, and no counts while loading or after a failure (AC-1, AC-2, AC-4, AC-5, AC-7, AC-11)
- [x] **T6:** Add `AppShell` with its styles and show it from `App.tsx`: the header with the app name as a link inside the `h1`, the theme toggle, and the body with the sidebar column and `main` (focusable). Make the existing test queries that now match the sidebar too specific by role or region. Tests for the shell on the board, the table, an application's page, and a missing one (AC-1, AC-6, AC-7, AC-10, AC-12)
- [x] **T7:** Add the narrow layout: the menu button (`aria-expanded` and `aria-controls`, only on a narrow screen), the drawer with its backdrop and `useDialogFocus`, closing on an entry, Escape, the backdrop, and the button with the right focus, and closing when the screen becomes wide. Tests with `matchMedia` set to narrow (AC-8, AC-9, AC-10)
- [x] **T8:** Change the detail page's columns to switch by its own width with a container query instead of the screen width (AC-12)
- [x] **T9:** Test that the counts stay live across screens: adding an application, dragging a card, changing the stage in the edit form and from the page's menu, a failed stage change, and deleting, with the right counts after going to another screen. Test the click paths from the board, the table with filters set, and an application's page (AC-3, AC-4, AC-5)
- [x] **T10:** Add `AppShell.css` and `Sidebar.css` to the contrast test's token-only check, and check the text colors they set are ones whose pairings are verified (AC-11)
- [x] **T11:** Note the shell in the changelogs of specs 002, 012, and 013, where their criteria describe the header, the board's toolbar, or the page layout (Risks in the plan)
- [x] **T12:** Run the browser checks in both themes against the production build, at wide and phone widths, including reloading `/table?stage=…` directly and a Docker image copy, and record them below (AC-1 to AC-12)
- [x] **T13:** Set the spec and plan status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
- T3 and T4 are one commit, because moving the list into a provider left two delete tests red until the detail page told the shared list about deletes.
- Resizing across the narrow width resets the menu by adjusting state while rendering, as React recommends, instead of in an effect.
- The header is sticky and sits above the drawer and its backdrop, so the menu button stays in reach while the menu is open, and the drawer starts below it. The page is at least as tall as the window, so the sidebar's column reaches the bottom.
- Browser checks were run by the assistant on 2026-10-02 in headless Chromium (Playwright, outside the repo), against the production build on a temporary database, in the light and the dark theme. All 78 checks passed in each theme (156 in all), and the same 156 passed against a separate copy of the Docker image on port 8099 with its own empty database. The test container and image were removed afterward, and the check script is not committed. The 130 checks from spec 013's run were repeated against the new build and passed too:
  - The sidebar is beside the page on the board, the table, an application's page, and the page for a missing application, with "All applications" and the eight stages in board order, each with an icon, and the eight stage entries each in their own color (AC-1, AC-12).
  - The counts matched the server's after loading, after adding an application, after dragging a card, after the stage menu, after the edit form, and after deleting, and the deleted card was gone from the board (AC-2, AC-3).
  - From a table with a search, a filter, a sort, and a stage, a stage entry opened `/table?stage=…` and nothing else, and showed only those rows. "All applications" opened `/table`. Both worked from an application's page, and a reload kept the view and the selection (AC-4).
  - The selected entry was the one stage for one chosen stage whatever else was set, "All applications" for none, and nothing for two stages, on the board, and on an application's page. It stood out with a different background, a left border, and bolder text (AC-5).
  - The app name linked to the board from every screen (AC-6).
  - Rendered text colors in the header, the sidebar, the selected entry, and the drawer measured at least 4.5 to 1 against their real backgrounds in both themes (AC-11).
  - Tab reached the app name, the theme toggle, and every entry, and Enter opened an entry (AC-10).
  - At 390 pixels wide the sidebar was gone and the menu button said it was closed. It opened a drawer below the header with the counts and focus inside, Tab and Shift+Tab never left it, and Escape, the backdrop, and the button each closed it with focus on the button. Choosing an entry opened its table, closed the drawer, and put focus on the page (AC-8, AC-9, AC-10).
  - Widening the window closed the menu and showed the sidebar, and narrowing it again started closed with the page unchanged.
  - Nothing scrolled sideways on the board, the table, or an application's page, with very long text too, at 390 and 1,280 pixels wide, and at 880 pixels the sidebar stayed beside the page while the page stacked its sections by its own width (AC-12).
  - No uncaught browser errors and no request left the app.
- The browser checks and screenshots found two layout problems that the component tests could not, both fixed with a test of the rule:
  - The sidebar's white column stopped partway down a short page. The page is now at least as tall as the window.
  - On a narrow page the detail page's stacked sections kept their content's width instead of filling the page. The grid's `align-items: start` was inherited when spec 013 stacked them, so this was a cosmetic bug from 013 that the new layout made visible. Stacked sections now stretch.
- Not covered in the browser: opening the app on a real phone. The 390 pixel window stands in for it.
