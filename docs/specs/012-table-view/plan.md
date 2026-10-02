# 012: Table view (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented        |
| Updated | 2026-10-02         |

Approved 2026-10-02.

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

The client gets a router with two routes, `/` for the board and `/table` for the table. Today `Board` loads the applications and owns the side panel. Both views now need the same data and the same panel, so that moves up into a new `ApplicationsPage`, which renders the Kanban/Table switch, the active view, and the panel. `Board` keeps its drag and drop. The new `TableView` is a plain table over the same list.

The table's search, filters, and sort live in the URL's query string (`/table?q=acme&stage=applied&sort=pay&dir=desc`). Parsing, filtering, and sorting are pure functions in `lib/`, so they are easy to test and the component only wires them up. The switch carries the query string to the other view, so switching to the board and back keeps the table's state (AC-15) without any storage. Nothing changes on the server or in the database.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Router | `react-router` in `apps/client`, with `BrowserRouter` in `main.tsx` and `MemoryRouter` in tests | The roadmap says spec 012 adds a router so filters can live in the address (AC-13). It also gives `useSearchParams` and `NavLink` | Hand-written `history` and `URLSearchParams` code: more to get wrong, and Back/Forward (AC-2) would be ours to maintain |
| Routes | `/` board, `/table` table, anything else redirects to `/` | AC-1, AC-2, and the "view that doesn't exist" edge case | A `?view=table` parameter: mixes the view with the filters |
| Server | No change | `app.ts` already sends every other GET to `index.html`, and Vite's dev server does the same | A server route for `/table`: not needed |
| Shared state | `lib/useApplications.ts`: the load state, `reload`, and `replaceApplication`, moved out of `Board.tsx` | Two views now need the same list (AC-15, AC-17). The "second use case" the constitution asks for now exists | Each view loads its own copy: edits on one wouldn't show on the other without a reload |
| Panel owner | `ApplicationsPage` owns `panel` state and renders `ApplicationPanel`. `Board` and `TableView` receive `openPanel` | One panel, opened from a card or a row (AC-16) | A panel in each view: duplicated save and delete wiring |
| Add button | Stays in `Board`'s toolbar and is not added to the table | The owner is moving it later, so the table gets none (Non-goals) | A shared header button: that is the later spec's job |
| URL parameters | `q`, repeated `stage`, `mode`, and `type`, and `sort` plus `dir` (`asc` or `desc`). Absent means default | Repeated keys read with `getAll` and de-duplicate in a `Set`, so a repeated value counts once (edge case). Short names keep addresses readable | Comma-separated lists: need escaping rules |
| URL updates | Every change uses `replace`, not `push`. Search typing updates the address on each keystroke | Back must return to the previous view, not step through each keystroke (AC-2, AC-6) | `push` per change: Back becomes a history of typing |
| Parsing | `lib/tableQuery.ts`: `parseTableQuery(params)` returns only values that are valid (a known stage, work mode, employment type, sort column, or direction) and `toSearchParams(query)` writes it back | Invalid values are ignored and the rest still applies (AC-14) | Throwing on bad input: breaks the page |
| Filtering | `filterApplications(applications, query)` in `lib/tableRows.ts`. Search is a plain `includes` on the lowercased, trimmed company name and job title | Special characters match as text, with no regular expression (AC-6, edge case). Filters AND together, values inside one filter OR (AC-7 to AC-9) | A fuzzy search library: not asked for |
| Sorting | `sortApplications(applications, sort)` in `lib/tableRows.ts`. It starts from the default order (stage order, then the loaded order, which is board order), then applies one stable sort on the chosen column. Rows with an empty value go last in both directions | Ties keep their default order (AC-5, AC-11, AC-12, edge case) | Re-sorting from scratch each time: loses the tie order |
| Pay sort key | The lowest amount, which is the minimum, or the maximum when there is no minimum. Hourly is multiplied by 2,080 | The owner chose "lowest" (AC-12) | Sorting annual and hourly apart: odd results |
| Next step sort | Rows with a due date first, by date. Then rows with only text, alphabetically. Empty last | The spec says "due date when it has one, otherwise by its text" (AC-12) | One text sort: dates are not alphabetical |
| Time in stage | Sorts by whole days, using the existing `daysInStage()` | Same count as the card (AC-4, AC-12) | A new calculation |
| Dropdown filters | A small `FilterDropdown` component: a button showing the label and the number chosen, which opens a list of checkboxes. It closes on Escape, on a click outside, and when focus leaves it | The owner chose dropdowns with a checkbox per value (AC-7, AC-8, AC-22). Native checkboxes give the keyboard use for free | A native `<select multiple>`: awkward to use. A UI library: a new dependency for one component |
| Table markup | A real `<table>`. Each sortable heading holds a `<button>` and the `<th>` has `aria-sort`. Each row has a click handler, and the job title cell holds a `<button>` so the keyboard can open it | Correct semantics, and keyboard use (AC-11, AC-16, AC-22) | `div`s with roles: more to get right |
| Cells | Stage: icon from `STAGE_ICONS` and name, with `data-stage`. Employment: new exported `employmentLabel()` in `lib/jobSummary.ts`, which `jobSummary` also uses. Pay: `compactSalary`. Time: `shortTimeInStage(daysInStage())`. Due date: `formatDate` and the "Overdue" marker as on the card. Empty: "–" | Reuses what spec 011 built, so the table and cards always agree (AC-4) | Copying the formatting: drifts apart |
| Long text | Cells use `max-width` with `text-overflow: ellipsis` and `white-space: nowrap`, and the table scrolls sideways inside its own container if the columns don't fit | AC-21. The page itself never scrolls sideways | Wrapping: uneven rows |
| Styles | `TableView.css`, `FilterDropdown.css`, and `ViewSwitch.css`, each beside its component. Uses the existing color tokens, so both themes work | Constitution §3 | Global styles |

## Data model

No change. No migration.

## API

No change. The table uses `GET /api/applications` and `GET /api/companies` as the board does.

## UI

- `main.tsx`: wraps `App` in `BrowserRouter`.
- `App.tsx`: the header as now, then `Routes`: `/` and `/table` render `ApplicationsPage` (so the panel and loaded data persist when switching), and `*` redirects to `/`.
- `components/ApplicationsPage.tsx`: uses `useApplications()`, owns `panel`, and renders the loading and error states (with "Try again", as the board has), `ViewSwitch`, the board or the table, and `ApplicationPanel`. Panel `onSaved` and `onDeleted` close it and reload, as today (AC-17).
- `components/ViewSwitch.tsx` (+ `.css`): two links, Kanban and Table, as a group labeled "View". The current one has `aria-current="page"`. The links keep the current query string (AC-1, AC-2, AC-15, AC-22).
- `components/Board.tsx`: keeps columns, drag and drop, and the Add button. It now takes the loaded applications, `replaceApplication`, `panel`, and `setPanel` as props instead of loading them itself. Behavior is unchanged.
- `components/TableView.tsx` (+ `.css`): the toolbar, the table, and its empty states.
  - Toolbar: a search box ("Search company or job title"), `FilterDropdown`s for Stage, Work mode, and Employment type, a result count such as "3 of 12" and a "Clear" button, both shown only when a search or filter is set (AC-6 to AC-10).
  - Table: columns Company, Job title, Stage, Location, Work mode, Employment type, Pay, Next step, Time in stage, in that order. Each heading sorts (ascending, then descending, then default) and shows an arrow for the sorted column (AC-3, AC-11).
  - States: no applications shows "No applications yet." and no sort arrows (AC-18). Applications that all get filtered out show "No applications match." with a Clear button (AC-19). Loading and error are handled by `ApplicationsPage`.
- `components/FilterDropdown.tsx` (+ `.css`): described above.
- `lib/tableQuery.ts`, `lib/tableRows.ts`, `lib/useApplications.ts`: described above.
- Light and dark: the table uses the same `--surface`, `--border`, and `--text` tokens as the board and `data-stage` colors for the stage cell, so no new colors are needed (AC-20).

## Shared types

None. `TableQuery` and the sort column names are client-only, in `lib/tableQuery.ts`. Stage, work mode, and employment type values and labels come from `packages/shared`.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI (`App.test.tsx`) | `/` shows the board and the switch marks Kanban as current |
| AC-2 | UI (`ViewSwitch.test.tsx`, `App.test.tsx`) | Clicking Table opens the table, clicking Kanban returns, `aria-current` follows, and going back one step returns to the previous view |
| AC-3 | UI (`TableView.test.tsx`) | One row per application, and the headings in order |
| AC-4 | UI | Each cell's formatting: stage icon and name, pay, "Contract · 6 mo", time in stage, due date with "Overdue", and "–" for empty values |
| AC-5 | unit (`tableRows.test.ts`) + UI | Default order is stage order, with board order inside a stage |
| AC-6 | unit + UI | Match on company or title, ignoring capitals and outer spaces. Spaces only filter nothing. `C++` and `(` match as text |
| AC-7, AC-8 | unit + UI | Several stages OR together. Work mode and employment type likewise. Nothing checked filters nothing. An application with no work mode is hidden once that filter has a choice |
| AC-9 | unit | Search and all three filters together |
| AC-10 | UI | "3 of 12" and Clear appear only when something is set, and Clear empties the search and filters but keeps the sort |
| AC-11 | UI | Ascending, descending, default on repeat clicks. One column sorted at a time. `aria-sort` and arrow follow |
| AC-12 | unit (`tableRows.test.ts`) | Each column's order, including pay with hourly converted, lowest amount, next step with dates before text, empty values last in both directions, and ties in default order |
| AC-13 | UI + unit (`tableQuery.test.ts`) | Every change writes the expected query string. Loading that address shows the same rows. Search typing changes the address without adding history entries |
| AC-14 | unit + UI | An unknown stage, sort column, or direction is dropped, and the valid parts still apply. A repeated value counts once |
| AC-15 | UI | Set a search and filters, go to Kanban, return to Table, and they are back |
| AC-16 | UI | Clicking a row, and pressing Enter on its title button, opens the panel for that application. Closing it leaves the query unchanged |
| AC-17 | UI | After a save the panel closes and the row shows the new values, and after a delete it is gone. A stage change that no longer matches the filters removes the row |
| AC-18 | UI | No applications: the message, and no sort arrows |
| AC-19 | UI | Everything filtered out: the message and Clear |
| AC-20 | unit (`contrast.test.ts`, extended if new tokens are added) + browser | Table text and headings meet 4.5 to 1 in both themes |
| AC-21 | browser | Very long company, title, location, and next step are cut off with "…" and the other columns keep their place |
| AC-22 | UI (`FilterDropdown.test.tsx`, `TableView.test.tsx`) + browser | Dropdowns open and close with Enter, Space, and Escape. Every control is reachable by Tab |
| Edge | UI | An address for an unknown view shows the board. Applications added or edited while the table is open show without a reload |
| Browser | Playwright run by the assistant | Everything above against the production build, including reloading `/table?...` directly (the server's fallback), in both themes, plus a Docker image copy |

Existing tests: `Board.test.tsx`, `Board.dragdrop.test.tsx`, and `App.test.tsx` render `Board` or `App` directly. They will render inside a `MemoryRouter` (and `Board` through `ApplicationsPage`) with their assertions unchanged, which shows the board still behaves the same.

## Spec corrections made

The owner decided two points where the first spec and the code disagreed, and the spec was updated in this branch:

1. **AC-17 and the panel.** A save or delete in `ApplicationPanel` closes it, as today. The row then leaves the table if it no longer matches the filters. The spec no longer says the panel stays open.
2. **AC-12.** Next step appears only under its own rule: rows with a due date first, by date, then text-only rows alphabetically, then empty.

## Risks and mitigations

- Moving the load and panel state out of `Board` could change board behavior: the existing board and drag tests must pass unchanged apart from the router wrapper.
- A router changes how the page address behaves in production: reloading `/table?...` relies on the server's existing fallback, so the browser check includes it, in the production build and in Docker.
- Typing in search rewrites the address on every keystroke: `replace` avoids history noise, and filtering is a quick in-memory pass over a small list.
- A custom dropdown is easy to get wrong for keyboard users: it is built on real checkboxes, with tests for opening, closing, Escape, and Tab.
- Existing specs say a card or the main screen is the board only: the changelogs of 002 and 011 get a note that spec 012 adds a second view (a task).

## New dependencies

| Package | Workspace | Why |
| ------- | --------- | --- |
| `react-router` | `apps/client` | Routes for `/` and `/table`, and the query string as the home of the search, filters, and sort, with Back and Forward working (AC-2, AC-13). The roadmap already names a router as spec 012's dependency |
