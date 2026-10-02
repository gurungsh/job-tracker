# 010: Light and dark themes (tasks)

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

- [x] **T1:** Add the contrast test, then move the tokens to `:root` and `:root[data-theme="dark"]` with a `color-scheme` for each, adjusting any token that fails 4.5 to 1 (AC-8, AC-9)
- [x] **T2:** Add `public/theme-init.js` and its tag in `index.html`, with tests for the device default, a stored choice, a bad stored value, and failing storage (AC-2, AC-4, AC-5, AC-7)
- [x] **T3:** Add `lib/theme.ts` with the `useTheme` hook, device-change handling, and storage, with tests (AC-3, AC-4, AC-6, AC-7)
- [x] **T4:** Add `ThemeToggle` and place it in the header, with tests (AC-1, AC-3)
- [x] **T5:** Confirm all existing tests pass unchanged (AC-11)
- [x] **T6:** Run the browser checks, against the dev build, the production build, and the Docker image, and record them below (AC-1 to AC-10)
- [x] **T7:** Set the spec status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

- Every text pairing in the spec already met 4.5 to 1 in both themes, so no color had to change. The old device-based dark block in `global.css` became `:root[data-theme="dark"]` with the same values.
- The test runner blanks CSS imports, even with `?raw`, so the contrast test reads `global.css` from disk. That needed Node's types in the client's `tsconfig.json` (`"types": ["vite/client", "node"]`). Nothing in `src/` uses Node APIs.
- The early script is tested by running the real `public/theme-init.js` file through `new Function`, with a lint exception noted in the test. `tests/support/theme.ts` stubs the device setting for the script, hook, and component tests.
- The open side panel is pinned to the top right and covers the header's right end, including the theme button. The spec doesn't require switching with a panel open (AC-3 only needs the panel to show the new theme), so the layout is unchanged. Close the panel, switch, and reopen. Later specs that change the header or panel layout can revisit this.
- Browser checks were run by the assistant on 2026-10-02 in a real headless Chromium (Playwright, outside the repo) against three targets: the production build, a Vite dev server on other ports with a throwaway database, and a separate test copy of the Docker image on port 8099. All 9 checks passed on each target:
  - A first visit follows a dark and a light device (AC-2), and `color-scheme` follows the theme (AC-9).
  - The button is last in the header at the right end, named for the other theme, and can take keyboard focus (AC-1).
  - Switching changes the board, the side panel and all four tabs, and a confirmation dialog, and the label flips (AC-3, AC-9).
  - The choice survives a reload and a new tab, even against the device setting (AC-4).
  - The theme is already set when the body first exists and at first paint, for a device theme and for a chosen one (AC-5).
  - With no choice, device changes are followed. After a choice, they are ignored (AC-6).
  - Blocked storage and a stored `"purple"` both fall back to the device, with no page errors, and the toggle still works (AC-7).
  - Date pickers and drop-downs follow the chosen theme (AC-9).
  - Add, drag, and the timeline work in the dark theme (AC-11).
- The first production run found the covered-button issue above. The check script was adjusted to close the panel first, and the rerun passed. The checks ran against the Docker image from this branch, on a separate tag and port, so the running `job-tracker` container and image were left alone. To see the change in that container, rebuild it with `docker compose up --build --force-recreate`.
- Not covered in the browser: the exact contrast numbers (the unit test covers them) and updating another already-open tab (a non-goal). The check script is not committed.
Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
