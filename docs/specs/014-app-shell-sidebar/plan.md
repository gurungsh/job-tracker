# 014: App shell and sidebar (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented              |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

The applications list moves up from `ApplicationsPage` to a provider that wraps the whole app, so the sidebar can count them on every screen. The board, the table, and the detail page all read and update that one list, which keeps the counts live (AC-3).

A new `AppShell` wraps the routes with the header and a two-column body: the sidebar on the left and the page on the right. The sidebar is a list of links with counts worked out from the list. On a narrow screen the sidebar is not rendered until the menu button opens it as a drawer, which reuses the focus handling from spec 013.

Nothing is stored or sent differently, so there is no migration and no new API.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Where the list lives | `ApplicationsProvider` around the routes in `App`, built from today's `useApplications` hook | The sidebar needs the list on every screen, including the detail page, which doesn't load it today (AC-1, AC-3). One list means one set of counts. | The sidebar fetching on its own: a second copy of the list that disagrees with the board until it reloads. |
| How the detail page keeps counts right | It calls `replaceApplication` when its stage changes (at once, and again with the saved result or the saved stage on a failure) and after an edit, and `removeApplication` after a delete. Adding still reloads the list. | The page has its own copy of one application, so the shared list must be told (AC-3). Replacing at once matches how the board's drag and drop behaves (spec 006). | Reloading the whole list after every change: slower, and the counts would lag the page. |
| Fresh data on the board and table | `ApplicationsPage` reloads the list quietly when it mounts and the list was already loaded | Before this spec each visit to the board or table loaded the list again, which is how a change made in another tab showed up (spec edge case). The provider now outlives the views, so the visit has to ask for it. The old list stays on screen while it loads, so nothing flashes. | Never reload: the views would keep stale data for the whole session. |
| Counting | A pure `stageCounts(applications)` returning one count per stage, and the total is the list's length | Easy to test, and the same function serves the sidebar and any later use (AC-2). | Counting inside the component: harder to test. |
| Entry addresses | Built with `toSearchParams` from spec 012 with only `stages` set, and the bare `/table` for "All applications" | It's the same address the table already reads and writes, so the table shows exactly that stage and clears search, other filters, and sort (AC-4). | Writing the query string by hand: a second place that knows the table's address format. |
| Which entry is selected | From the current location: on `/table`, `parseTableQuery` gives the stages. Exactly one selects that stage, none selects "All applications", and anything else selects nothing. Elsewhere nothing is selected. | The selection follows the address, so reloads and the browser's Back button keep it right (AC-5). Marked with `aria-current="page"`. | Component state for the last click: goes wrong on reload and on Back. |
| Telling narrow from wide | `useMediaQuery("(max-width: 52rem)")` built on `matchMedia`, with the width in one constant. The shell switches layout with a class from that value. | The menu button, the drawer, and the layout all follow one answer, so they can't disagree (AC-8). A test can set the answer. Without `matchMedia`, as in jsdom, it reads as wide. | A CSS-only media query: the button would still be in the page on a wide screen and the drawer couldn't be tested. |
| Narrow sidebar | Rendered only while open, as a drawer with a backdrop, and not at all when closed | A hidden sidebar's links must not be reachable by Tab (AC-10), and not rendering it is the simplest way to guarantee that. | `display: none` on the sidebar: works, but the open drawer would animate from nothing and the test would need real CSS. |
| Drawer focus | `useDialogFocus` on the drawer. Escape, the backdrop, and the menu button close it and focus goes to the menu button. Choosing an entry closes it and focus goes to the page's `main`. | It's the hook from spec 013, so Tab stays inside and nothing new is written (AC-9, AC-10). The menu button gets focus explicitly, because some browsers don't focus a button when it is clicked. | A second focus trap: duplicate code. |
| Resizing across the width | The drawer's open state is reset when the screen becomes wide | Going back to narrow must start closed, not pop open over the page (spec edge case). | Keep the state: the drawer would reappear open. |
| Detail page layout next to a sidebar | The detail page switches to one column with a container query on its own width, not a viewport media query | The sidebar takes about 15rem, so the page is narrower than the screen. At 52rem of screen the two columns would be cramped (AC-12). Container queries are supported by every current browser. | Raising the media query width: guesses at the sidebar's width in a second place. |
| App name | `<h1><Link to="/">Job Tracker</Link></h1>` | Keeps the heading the tests and screen readers use, and makes it a link (AC-6). | A separate link beside the heading: two things for one name. |
| Menu button | A button named "Menu" with `aria-expanded` and `aria-controls`, only rendered on a narrow screen | The state is announced without changing the name, and a wide screen has no button at all (AC-8). | A name that flips between "Open menu" and "Close menu": announces the state twice. |
| Icons | `List` for "All applications" and `Menu` and `X` for the button, from `lucide-react` | The library is already a dependency (spec 011), and the stage icons already come from it. | Hand-drawn icons: more to maintain. |

## Data model

No change. No migration.

## API

No change.

## UI

**`App.tsx`** (changed). `ApplicationsProvider` wraps `AppShell`, which wraps the same routes as now. The routes don't change.

**`AppShell`** (new), in `components/`. It renders:

- **Header:** on a narrow screen the menu button, then the `h1` with the app name as a link to `/`, then `ThemeToggle` (AC-6, AC-8).
- **Body:** a grid of the sidebar column and `main`. On a wide screen the column is about 15rem and always has the sidebar. On a narrow screen there is one column and the sidebar is the drawer, when open (AC-1, AC-8, AC-12).
- **`main`:** gets `tabIndex={-1}`, so focus can be sent to it after an entry is chosen (AC-9).

**`Sidebar`** (new). A `nav` named "Stages" holding a list of links:

- "All applications" with the `List` icon and the total, linking to `/table`.
- The eight stages in board order, each with its icon and name in the stage's color (`data-stage`) and its count, linking to `/table?stage=…`.
- The entry that matches the current address has `aria-current="page"` and a selected style.

| State | What shows |
| ----- | ---------- |
| Loading, or the list failed to load | The entries, working as links, with no counts (AC-7) |
| Ready | The entries with their counts |
| Narrow, closed | Nothing, and the menu button is the only way in |
| Narrow, open | The drawer over a backdrop, with focus inside it |

**`ApplicationsPage`** (changed). It reads the list from the provider instead of loading it, still shows the loading and error states for the views, still owns the Add dialog, and reloads quietly when it mounts if the list was already loaded. The outlet context for the board and table doesn't change.

**`ApplicationDetailPage`** (changed). It calls `replaceApplication` and `removeApplication` as listed in the decisions.

**`useApplications.ts`** (changed). It gains `ApplicationsProvider`, a hook to read it, and `removeApplication`. The existing load, retry, reload, and `replaceApplication` logic is unchanged.

**New lib files.** `lib/stageCounts.ts` and `lib/useMediaQuery.ts`.

**Styles.** `AppShell.css` and `Sidebar.css` sit beside their components. They use only the existing color tokens, so both themes work (AC-11). `ApplicationDetailPage.css` swaps its `@media` for `@container`. `App.css`'s header gets room for the menu button.

## Shared types

No new types.

## Test strategy

Tests go in `apps/client/tests/`, mirroring `src/`. Tests that need a narrow screen set `window.matchMedia` to match.

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI | The sidebar is on the board, the table, an application's page, and the "doesn't exist" page, with "All applications" then the eight stages in board order, each with its icon and its stage color attribute. |
| AC-2 | Unit, UI | `stageCounts` counts each stage and handles none. The sidebar shows the counts, closed stages included, and 0 for an empty stage, and the total on "All applications". |
| AC-3 | UI | The counts change without a reload after: adding an application, dragging a card, changing the stage in the edit form, changing it from the page's menu, and deleting from the page. A failed stage change puts the old counts back. They are right after going to another screen. |
| AC-4 | UI | Clicking a stage from `/table?q=acme&type=contract&sort=pay&dir=desc` goes to `/table?stage=…` and nothing else. "All applications" goes to `/table`. Both work from the board and from an application's page. |
| AC-5 | UI | `aria-current="page"` is on the stage for one chosen stage, on "All applications" for none, on nothing for two stages, on the board, and on the detail page. Search and other filters don't change it. |
| AC-6 | UI | The header's `h1` contains a link named "Job Tracker" to `/`, from every screen, and the theme toggle is still there. |
| AC-7 | UI | While the list is loading, and when it fails, the entries are there with no counts, and they link correctly. The counts appear after a retry. |
| AC-8 | UI | On a narrow screen the sidebar isn't rendered and the menu button is, with `aria-expanded` false, then true when it opens the drawer. On a wide screen there is no menu button. |
| AC-9 | UI | The drawer closes on an entry, on Escape, on the backdrop, and on the menu button. Focus goes to the menu button for the last three, and to `main` for the entry, which also opens its table. |
| AC-10 | UI | Tab reaches the app name, the theme toggle, and each entry on a wide screen. On a narrow screen a closed drawer's links aren't in the page, and in an open drawer Tab stays inside it. |
| AC-11 | UI | `contrast.test.ts` lists `AppShell.css` and `Sidebar.css` among the files that use only color tokens, and checks any text color they set is one whose pairings are verified. |
| AC-12 | UI, manual | The existing board, table, and detail page tests pass with the shell around them (with their queries made specific where the sidebar adds a second match). A manual browser check in both themes at wide and phone widths: no sideways scrolling, nothing cut off, the detail page's columns stack by its own width, and the Add button still works. Recorded in `tasks.md`. |

## Risks and mitigations

- **Existing tests may find the sidebar's text.** Words such as "Applied" and "Offer" now appear in the sidebar as well as on columns, and in filters. Mitigation: do the shell last in the build order, then make the few queries that clash specific by role or region.
- **The shared list could go stale.** It now outlives the views. Mitigation: the quiet reload on visiting the board or table, and every change on the page updates the list at once.
- **Focus handling is easy to get wrong.** Mitigation: the drawer reuses the hook already tested in spec 013, and each way of closing has its own test.
- **The page and sidebar compete for width.** Mitigation: the container query, a table that already scrolls inside its own box (spec 012), and a manual check at phone width.
- **Safari doesn't focus a button on click.** Mitigation: focus is sent to the menu button explicitly, not read from what was focused before.

## New dependencies

None. `lucide-react` is already used (spec 011).
