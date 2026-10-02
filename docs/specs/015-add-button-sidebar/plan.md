# 015: Add button in the sidebar (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented              |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

The Add dialog moves from `ApplicationsPage`, which only the board and table use, up to `AppShell`, which wraps every screen. The `Sidebar` gets an Add application button above its stage list that asks the shell to open the dialog. The board's toolbar and its button are removed.

When a new application is saved, it is added straight to the shared list, so the counts, the board, and the table update at once without the address changing. The two empty-state messages are reworded to point at the sidebar.

No data, API, or dependency changes.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Where the dialog lives | In `AppShell`, next to the drawer, as `adding` state | The drawer unmounts when I choose Add on a narrow screen, so the dialog can't live inside it, and `ApplicationsPage` isn't on the detail page (AC-1, AC-3, AC-6). The shell is on every screen. | In the `Sidebar`: it would vanish with the drawer. A context with an `openAdd` function: more plumbing for one caller. |
| How the button reaches the shell | `Sidebar` takes an `onAdd` prop and a ref for the button | The shell already passes `onNavigate` to the sidebar for the drawer, so this follows the same shape. The ref lets focus go back to the button (AC-5). | The sidebar owning the dialog: see above. |
| Layout of the sidebar | A `div.sidebar` holding the Add button, then the `nav` named "Stages" | A button isn't a navigation link, so it stays out of the `nav` landmark, and it still comes first in tab order (AC-1, AC-8). The sticky rule moves from the `nav` to the `div`, so the button stays at the top when the page scrolls (spec edge case). | The button inside the `nav` list: announces an action as a destination. |
| Adding to the shared list | A new `addApplication(saved)` in the store: inserts it in board order and adds its company to the company suggestions if new. If the list isn't loaded yet, or failed, the store reloads instead. | `ApplicationDialog` already hands back the saved application (spec 013). Adding it directly makes the counts and views change at once without a request (AC-4), and a reload covers the loading and failed cases (AC-9). | Always reloading: the counts and views wait for a request before they change. |
| After saving | Close the dialog and do nothing to the address | The spec says I stay where I was (AC-4). Nothing navigates, so the table keeps its filters and the page stays put. | Navigating to the new application: ruled out in the spec. |
| Focus after the dialog closes | The shell sends focus to the Add button on a wide screen and to the menu button on a narrow one, after the dialog has gone | The dialog's focus hook gives focus back to what had it before, which is gone on a narrow screen because the drawer closed (AC-5, AC-6). Setting it explicitly also covers browsers that don't focus a button on click. | Relying on the hook alone: loses focus on a narrow screen. |
| Opening from the drawer | The drawer closes and the dialog opens in the same step, without sending focus to the menu button first | The dialog takes focus when it opens. The menu button gets it back only when the dialog closes (AC-6). | Reusing the drawer's "close and focus the menu button" path: it would fight the dialog for focus. |
| Stacking order | Dialog backdrops go above the sticky header, at `z-index: 40` | Since spec 014 the header (30) sits above a dialog's backdrop (20), so it isn't dimmed and its buttons stay clickable under a modal. The Add form can now open from every screen, so this has to be right. `ConfirmDialog` shares the backdrop class, so it is fixed too. | Lowering the header: it needs to stay above the drawer. |
| Dialogs on a phone | The dialog backdrop's grid has one `minmax(0, 1fr)` column, and the form's job details fieldset and salary columns can shrink (`min-width: 0`) | Found in the browser checks: at 390 pixels the form ran off the right edge. A grid column and a fieldset both default to the width of their content. | Setting a width on the dialog: it would not stop the fields inside it from pushing it wider. |
| Starting stage | Unchanged: the form already starts on Wishlist | Nothing to build (AC-3). | Prefilling from the screen: ruled out in the spec. |
| Empty-state wording | Both messages say "Use the Add application button in the sidebar to add your first one." | It's true on a wide screen and in the narrow drawer, and neither says "board" (AC-7). | Different text for narrow screens: needs the media query in two more places for one sentence. |
| Button look | The existing `primary` button style, a `Plus` icon from `lucide-react`, full width of the sidebar | The text and background are the accent pair whose contrast is already checked (AC-10). | A new style: a new color pairing to check. |

## Data model

No change. No migration.

## API

No change.

## UI

**`Sidebar`** (changed). It takes `onAdd` and an `addRef`. It renders a `div.sidebar` with:

- an "Add application" button, `type="button"`, class `primary sidebar-add`, with the `Plus` icon (hidden from screen readers) and the label (AC-1, AC-8, AC-10)
- the existing `nav` named "Stages", unchanged

**`AppShell`** (changed). It owns `adding`:

- `onAdd` on the sidebar, and on the drawer's sidebar, opens the dialog. From the drawer it also closes the drawer, without the drawer's own focus step (AC-3, AC-6).
- It renders `ApplicationDialog` with the company names from the store (an empty list while loading or failed) (AC-9).
- On save it calls `addApplication`, or reloads when the list isn't ready, and closes the dialog. The address is not touched (AC-4).
- On any close it sends focus to the Add button (wide) or the menu button (narrow), once the dialog has gone (AC-5, AC-6).

**`Board`** (changed). The toolbar and its button are removed, along with `openAdd`. The empty message is reworded (AC-2, AC-7, AC-11).

**`TableView`** (changed). The empty message is reworded (AC-7).

**`ApplicationsPage`** (changed). It no longer owns the dialog or `openAdd`, and the outlet context is `{ applications, replaceApplication }`.

**`useApplications.tsx`** (changed). The store gains `addApplication`.

**Styles.** `Sidebar.css` gets `.sidebar-add` (full width, a gap below it, the icon beside the label). `AppShell.css`'s sticky rule moves to `.app-sidebar > .sidebar`. `Board.css` loses `.board-toolbar`, so the columns sit where the toolbar was. `ConfirmDialog.css`'s `.dialog-backdrop` goes to `z-index: 40`.

| State | What shows |
| ----- | ---------- |
| Any screen | The Add button at the top of the sidebar |
| Narrow, drawer closed | No Add button, since the sidebar isn't there. The menu button opens it. |
| Narrow, drawer open | The Add button at the top of the drawer |
| List loading or failed | The Add button works, and the form has no company suggestions |
| Dialog open | The dialog over a backdrop that covers the header too |

## Shared types

No new types.

## Test strategy

Tests go in `apps/client/tests/`, mirroring `src/`.

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI | The Add application button is the first thing in the sidebar, above "All applications" and outside the "Stages" navigation, on the board, the table, an application's page, and the page for a missing application. It has a plus icon and the `primary` class. |
| AC-2 | UI | The board and the table each have exactly one button named "Add application", and the board's toolbar is gone. |
| AC-3 | UI | Choosing it on each of those screens opens the dialog titled "Add application", with the stage set to Wishlist. |
| AC-4 | UI | Saving from the board, from the table with filters set, and from an application's page closes the dialog, leaves the address exactly as it was, and raises the sidebar's counts at once. The card shows on the board. The table shows the row when it matches the filters, and does not when it doesn't, while the counts still rise. A new company is offered as a suggestion the next time. |
| AC-5 | UI | Closing a changed form asks first, and Escape on an unchanged one closes it. Afterward focus is on the Add button. |
| AC-6 | UI | On a narrow screen the drawer has the button first. Choosing it closes the drawer and opens the dialog, the header has no Add button, and after the dialog closes focus is on the menu button. |
| AC-7 | UI | With no applications, the board and the table say to use the Add application button in the sidebar, and neither says "board". |
| AC-8 | UI | Tab reaches the Add button before the sidebar's links, and Enter and Space each open the dialog. |
| AC-9 | UI | While the list is loading, and when it fails, the button opens a working form with no suggestions. After saving, the list loads again and the counts appear. |
| AC-10 | Unit | `contrast.test.ts` checks `Sidebar.css` still uses only color tokens, and the accent pairing it relies on is already in the checked pairs. A browser check measures the button's rendered contrast. |
| AC-11 | UI, manual | The existing board and table tests pass. A browser check in both themes at wide and phone widths: no gap where the toolbar was, and nothing else moved. |

Also tested: the store's `addApplication` (inserts in board order, adds a new company, does nothing to a list that isn't ready), choosing the button twice opening one dialog, and a dialog's backdrop sitting above the header (a CSS check, plus the browser check).

Tests that opened the Add dialog from the board's button keep working, since the button keeps its name. Those that look for the board's toolbar change.

## Risks and mitigations

- **Focus handling is easy to get wrong.** It has three paths: wide, narrow from the drawer, and a changed form closing. Mitigation: each path has its own test, and the browser check covers the narrow one.
- **The save goes through the shared list.** A missed update would show wrong counts. Mitigation: the store function is tested alone, and the screen tests check counts at once.
- **The z-index change touches every dialog.** Mitigation: all dialogs share one backdrop class, a screenshot in the browser check shows the header covered, and the drawer's layers (20 and 25) stay below the header's 30 and the dialogs' 40.
- **Existing tests that find "Add application" or the toolbar.** Mitigation: the button keeps its name, and the few that depend on the toolbar are listed in `tasks.md` as they are found.

## New dependencies

None. `Plus` comes from `lucide-react`, which is already used.
