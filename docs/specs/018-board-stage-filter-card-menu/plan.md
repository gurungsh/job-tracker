# 018: Board stage filter and card menu (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented        |
| Updated | 2026-10-02         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

All client work. The board keeps a list of visible stages in state, read from and written to `localStorage` by a small hook. A new filter row above the columns holds a stage filter, built on the existing `FilterDropdown`. Each card gets a "Move to" menu button next to its Archive button. The menu calls the board's existing `moveApplication`, so a menu move saves, rolls back on failure, and records the timeline entry exactly as a drag does. No server, shared-type, or database change.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Where the choice lives | `localStorage` key `job-tracker-stages`, a JSON array of stage names, read and written in `lib/useBoardStages.ts` | Per-browser preference, no schema change (AC-5, AC-6). Follows `theme.ts`'s guarded read and write | Database (needs a migration, and it is not data about an application); page address (owner chose browser storage) |
| Saved value format | Array of stage names. On read, keep only valid stages in board order. Anything invalid, empty, or unreadable gives the default | Old or damaged data must never break the board (AC-6) | Bitmask or object: harder to read and to validate |
| Stage filter control | Reuse `FilterDropdown` with all eight stages as options | Same checkbox list, Escape, and click-outside handling as the table (AC-2, AC-3) | New component |
| Keeping one column | `useBoardStages` ignores a change that would leave zero stages, so the last box stays checked | AC-4. The dropdown is controlled, so the box stays checked on its own | Disable the last checkbox: needs a new `FilterDropdown` prop for one use |
| Toolbar placement | A `board-filters` row at the top of `Board` (not `board-toolbar`, since spec 015 has tests that the board has no toolbar class) | The board's toolbar is empty since spec 015, and the table's filters sit in the table, so the board's belong in the board | `view-bar` next to the view switch: it is shared with the table, which has its own filters |
| Card menu | New `CardMenu` component: a "⋯" button (`MoreHorizontal` icon from lucide-react, already a dependency) opening a `role="menu"` list of seven `role="menuitem"` buttons | AC-7 to AC-12. A menu role gives arrow-key behavior a clear contract | Native `<select>`: can't show stage icons and colors |
| Menu keyboard | Opening focuses the first item. Up and Down move (wrapping), Home and End jump, Enter activates, Escape closes and returns focus to the button, Tab closes | AC-12, AC-10 | Roving only on arrows: Tab would trap focus |
| Menu placement | Rendered inside `.card-wrap`, a sibling of the card button, beside the Archive button. Absolutely positioned, opens downward, and flips to open leftward on a narrow screen | The card is a `<button>`, so a button inside it is invalid HTML. Same trick as `ArchiveButton`. A sibling can't start a drag or open the page (AC-11) | A portal: more code, and focus handling gets harder |
| Hidden-target message | After a successful move to a hidden stage, `Board` shows a `role="status"` line "Moved {title} to {Stage}." with a Dismiss button, in the same area as the error banner | AC-9. The card is already gone, so the message is the only sign of where it went | A toast system: no second use yet, so none is added |
| Move from menu | Calls `moveApplication(application, stage)`. It returns a promise that resolves to whether the save worked, so the caller can show the message only on success | AC-8, AC-9, AC-13. Reuses spec 006's save, rollback, and error banner | A second move function: duplicates rollback logic |
| Drag onto a hidden stage | Not possible, since its column isn't shown | Nothing to do | — |
| Existing board tests | Update the ones that expect all eight columns to set the stored choice first | The default now hides three columns | Leave them failing: no |

## Data model

No change. The only stored value is a browser preference, not part of the database.

## API

No change. A menu move uses the existing `PUT /api/applications/:id`, as drag and drop does.

## UI

**Board toolbar (`Board.tsx`)**
- A `board-filters` row above the columns with a `FilterDropdown` labeled "Stages". Its count badge shows the number of stages the board shows, as the table's filters do (AC-2).
- Only the visible stages render as columns, in board order (AC-1, AC-3).
- The empty-board text appears only when there are no applications at all, not when the visible columns are empty.

**`CardMenu.tsx` (new)**
- A button named "Move {job title} at {company}", with `aria-haspopup="menu"` and `aria-expanded`. It sits at the card's top right, next to the Archive button, and is always visible on touch screens and on hover or focus on wide ones, like the Archive button.
- The open menu has a "Move to" heading and the seven other stages, each with its stage icon and color (AC-7). Picking one closes the menu and calls `onMove(stage)` (AC-8, AC-10).
- Escape, a click outside, and Tab close it (AC-10). A click on the button or menu stops propagation, so the card doesn't open (AC-11).
- States: closed, open, and disabled while that card's save is pending.

**`Card.tsx`**
- Takes an `onMove(application, stage)` prop and renders `CardMenu` beside `ArchiveButton`.

**`useBoardStages.ts` (new)**
- Returns `[stages, setStages]`. The initial value is read once from storage (AC-6). A change that leaves no stage is ignored (AC-4). Otherwise it is saved, and a blocked storage is ignored so the choice lasts until reload (AC-5, AC-6).

**Error and status line**
- The existing `board-error` banner keeps showing failed moves (AC-13). A matching `board-notice` line shows the hidden-target message (AC-9).

## Shared types

No change. `isClosedStage` and `STAGES` already exist in `packages/shared`. The default is `STAGES.filter((s) => !isClosedStage(s))`.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI (`Board.test.tsx`) | With no stored choice, five columns show and the three closed ones don't |
| AC-2 | UI (`BoardStageFilter.test.tsx`) | The Stages dropdown lists all eight with the right boxes checked |
| AC-3 | UI (`BoardStageFilter.test.tsx`) | Unchecking and checking a stage removes and restores its column, in order |
| AC-4 | UI and unit (`BoardStageFilter.test.tsx`, `useBoardStages.test.ts`) | The last checked box can't be unchecked |
| AC-5 | UI (`BoardStageFilter.test.tsx`) | A choice is written to storage, and a fresh render reads it back |
| AC-6 | Unit (`useBoardStages.test.ts`) | Missing, malformed, empty, unknown-stage, and throwing storage all give the default |
| AC-7 | UI (`CardMenu.test.tsx`) | The menu lists the seven other stages with icons |
| AC-8 | UI (`Board.cardmenu.test.tsx`) | Picking a stage sends the update, moves the card, and updates the sidebar count |
| AC-9 | UI (`Board.cardmenu.test.tsx`) | A move to a hidden stage removes the card and shows the message |
| AC-10 | UI (`CardMenu.test.tsx`) | Escape, outside click, Tab, and picking all close it |
| AC-11 | UI (`CardMenu.test.tsx`) | Clicking the button doesn't open the page, and the card stays draggable |
| AC-12 | UI (`CardMenu.test.tsx`) | Enter opens it, arrows, Home, and End move, and Enter picks |
| AC-13 | UI (`Board.cardmenu.test.tsx`) | A failed save puts the card back and shows the error |

Tests live in `apps/client/tests/`, mirroring `src/`. After the feature, one short smoke script on the production build, in one theme, covers: default columns, hide and show a stage, reload keeps it, move a card from its menu, and move one to a hidden stage.

## Risks and mitigations

- **Existing tests assume eight columns.** Mitigated by updating them in the same task as the default change (T2), so the build stays green.
- **A button inside a draggable card.** Mitigated by making the menu a sibling of the card button, as the Archive button already is.
- **A menu clipped by its column.** Mitigated by checking `overflow` on `.column-cards` and by a narrow-screen check in the smoke script.
- **Storage holds a stage that is later renamed or removed.** Mitigated by keeping only valid stage names on read.

## New dependencies

None. `lucide-react` is already used.

## Tasks

- [x] **T1:** Add `useBoardStages` with the default, the guarded storage read and write, and the keep-one rule, with unit tests (AC-1, AC-4, AC-5, AC-6)
- [x] **T2:** Show only the chosen stages in `Board`, and update the existing board tests for the new default (AC-1)
- [x] **T3:** Add the board toolbar with the Stages `FilterDropdown`, and tests for it (AC-2, AC-3, AC-4, AC-5)
- [x] **T4:** Make `moveApplication` return whether it saved (AC-8, AC-13)
- [x] **T5:** Add `CardMenu` with open, close, and focus handling, with tests (AC-7, AC-10, AC-11)
- [x] **T6:** Add arrow, Home, End, and Enter keys to `CardMenu`, with tests (AC-12)
- [x] **T7:** Wire `CardMenu` into `Card` and `Board`, with tests for a move, a failed move, and the sidebar count (AC-8, AC-13)
- [x] **T8:** Show the "Moved to" message after a move to a hidden stage, with tests (AC-9)
- [x] **T9:** Style the toolbar and menu in both themes and on a narrow screen, and check contrast and reach (AC-7, AC-11)
- [x] **T10:** Run the smoke script, update the spec status, the README index, and the roadmap, then run `npm test`, `npm run lint`, and `npm run typecheck` one after another (all ACs)

## Verification notes

- `npm test` (1030 tests), `npm run lint`, and `npm run typecheck` pass, run one after another.
- The smoke check ran at the HTTP level against the production build with a throwaway database, because no browser tool was used. It confirmed the built page is served, the bundle holds the saved-choice key and the menu, and that moving an application to Applied, Rejected, and back to Wishlist through the API the menu uses returns the new stage each time and records a timeline entry for each change (4 of 4 entries, counting the creation). How the filter and menu look in a browser rests on the component tests and the style tests.

## Differences from the plan

- The filter row's class is `board-filters`, not `board-toolbar`, because spec 015's tests check that the board has no `board-toolbar`.
- The Move button's accessible name is "Move: {title} at {company}", so existing tests that find a card by name now also exclude names starting with "Move", as they already did for Archive and Restore.
- The card header's right padding moved to 4rem, for the two buttons, and spec 017's style test was updated to match.
- Tab inside the open menu closes it and puts focus back on the button, rather than moving on to the next control.
- The test setup now clears `localStorage` after each test, so one test's saved choice can't leak into the next. Existing tests that need all eight columns call `showAllStages()`.
