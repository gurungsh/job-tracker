# 021: UI tweaks (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented                    |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Client-only changes, mostly CSS and small edits to existing components. No server, shared-type, or data changes. Each item is independent, so the tasks are ordered by risk, not by dependency.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Neutral stage color | Drop the `color: var(--stage)` rules in `Sidebar.css` (`.sidebar-entry[data-stage]`) and `TableView.css` (`.cell-stage`). Keep `data-stage` attributes and the global tokens. | Board, cards, and badges still use the tokens (AC-3). Fewest edits. | Remove `data-stage` from the markup (breaks existing tests and gains nothing). |
| View button icons | `lucide-react` `Columns3` and `Table2`, 16px, `aria-hidden`, like `UserGuideLink`. | The icon library is already a dependency. | A new icon set. |
| Select All / Deselect All | One button at the top of `FilterDropdown`'s list. It reads "Deselect All" when every option is selected, else "Select All". Select All calls `onChange(all options)`. Deselect All calls the new optional `onDeselectAll`, or `onChange([])` when it isn't given. | Table dropdowns treat `[]` as no filter (AC-6). The board can't have `[]`, so it passes `onDeselectAll` (AC-7). | A separate button for each action (more clutter). |
| Board Deselect All | `useBoardStages` gets a `reset()` that saves `DEFAULT_BOARD_STAGES`. `Board` passes it as `onDeselectAll`. | Reuses the existing save and storage fallback. | Letting `choose([])` mean reset (hides a rule inside a guard that exists to ignore empties). |
| Guide toggle | `UserGuideLink`, when on `/guide`, links to `readGuideOrigin(location.state).path` instead of `/guide`. It stays a `NavLink`, so `aria-current="page"` keeps the highlight, and it gets a stronger active style. The back `Link` and `guide-back` CSS are removed from `UserGuidePage`. | The origin is already tracked in router state (spec 020). | Browser `history.back()` (breaks after a reload or a direct visit). |
| Column height | `.board` gets a fixed height, `calc(100vh - <space taken above it>)` with a `min-height`, and `align-items: stretch`. `.column` becomes a flex column with a border. `.column-cards` gets `flex: 1; overflow-y: auto; min-height: 0`. | The drop handlers are on the whole `<section class="column">`, so a taller column is already a bigger drop target (AC-12). | Letting the page scroll (the owner chose scrolling inside columns). |

## Data model

No change.

## API

No change.

## UI

- **Sidebar and table (AC-1, AC-2, AC-3):** the stage icon and name use the normal text color. Selected sidebar entries keep their existing highlight.
- **View buttons (AC-4):** "Kanban View" and "Table View" with icons, in `ViewSwitch.tsx`. Spacing in `ViewSwitch.css`. The existing `aria-current` highlight stays. On a narrow screen the text stays, as the spec's default says. Revisit only if it doesn't fit in the smoke check.
- **Filter dropdowns (AC-5, AC-6, AC-7):** the toggle button is the first item in the open list, above the checkboxes, with a small divider. It's a plain `button type="button"`, so a click doesn't close the list. The three table dropdowns need no change in `TableView.tsx`. `Board.tsx` passes `onDeselectAll`.
- **User Guide (AC-8, AC-9, AC-13):** highlighted on `/guide`. A second click goes back. The guide text for the board, the table, and the contents of the header are updated: the view names, Select All and Deselect All, and the way back is "choose User Guide again".
- **Board columns (AC-10, AC-11, AC-12):** each column has a 1px `--border` border and fills the height. The empty-column minimum height stays as a floor. The dashed drop outline and the placeholder card are unchanged.

## Shared types

No change.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI (`Sidebar.test.tsx`) | Stage entries still show icon, name, and count. Color itself is CSS, so it's judged in the smoke run. |
| AC-2 | UI (`TableView.test.tsx`) | Stage cells still show icon and name. |
| AC-3 | Smoke | Board headers and cards still colored. |
| AC-4 | UI (`ViewSwitch.test.tsx`) | Links are named "Kanban View" and "Table View", contain an icon, and keep the current view marked and the search carried over. |
| AC-5, AC-6 | UI (`FilterDropdown.test.tsx`, `TableView.test.tsx`) | The button label flips between Select All and Deselect All. Select All selects every option. Deselect All clears it, and the table shows all rows again. The list stays open after a click. |
| AC-7 | UI (`BoardStageFilter.test.tsx`), unit (`useBoardStages.test.ts`) | Select All shows all eight columns. Deselect All shows the default five and saves them. |
| AC-8, AC-9 | UI (`UserGuideLink.test.tsx`, `UserGuidePage.test.tsx`, `AppShell.test.tsx`) | The button is current on `/guide`. There is no back link. Clicking it returns to the board, the table with its filters, or an application page, and to the board after a direct visit. |
| AC-10, AC-11 | Smoke | Columns are bordered, fill the height, and scroll inside with many cards. jsdom has no layout, so this isn't a component test. |
| AC-12 | UI (`Board.dragdrop.test.tsx`) | Dropping on the column element (not on a card) still moves the card. |
| AC-13 | UI (`UserGuidePage.test.tsx`) | The guide mentions Select All and Deselect All and no longer shows a back link. |

## Risks and mitigations

- **Height depends on what sits above the board** (header, view bar, filters, notices). A fixed `calc` can leave a small gap or a page scroll. Mitigation: use a CSS variable for the offset, check it in the smoke run at a desktop size and a short window, and keep a `min-height` so a short window scrolls the page rather than crushing the columns.
- **Contrast tests:** `styles/contrast.test.ts` may check stage colors on the sidebar. Run it after task 1 and adjust only if it fails.
- **Narrow screens:** longer view button text could wrap. Checked in the smoke run.

## New dependencies

None.

## Tasks

- [x] **T1:** Neutral stage colors in the sidebar and table; update tests if they assert color classes (AC-1, AC-2, AC-3)
- [x] **T2:** View buttons: names, icons, styles, and tests (AC-4)
- [x] **T3:** `FilterDropdown` Select All / Deselect All button with optional `onDeselectAll`, and tests (AC-5, AC-6)
- [x] **T4:** Board Stages: `reset()` in `useBoardStages`, wire `onDeselectAll`, and tests (AC-7)
- [x] **T5:** User Guide button toggles and stays highlighted; remove the back link and its CSS; update tests (AC-8, AC-9)
- [x] **T6:** Update the guide text for the changes (AC-13)
- [x] **T7:** Full-height bordered columns that scroll inside; add a drop-on-empty-space test (AC-10, AC-11, AC-12)
- [x] **T8:** Docs: spec status, index row in `docs/specs/README.md`, roadmap line, root `README.md` if a line is no longer true
- [x] **T9:** Final checks: `npm test`, `npm run lint`, `npm run typecheck` one after another, then one smoke script on the production build in one theme (all ACs). The three checks passed. The browser check was done by the owner by hand, not by a script.
