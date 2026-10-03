# 020: User guide (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Client-only. A new `/guide` route renders a `UserGuidePage` inside the existing app shell, so the header and sidebar stay as on every other screen. The header gets a "User Guide" link with a book icon, placed before the theme switch. The guide's text is written as JSX in the page component, one section per screen, with the contents list built from the same list of sections, so an entry can't point to a missing section.

The back link reuses the router-state idea from spec 013: the header link passes the address I'm on as `from`, and the guide reads it back.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Route | `guide`, inside `AppShell`, outside `ApplicationsPage` | Own address that can be reloaded (AC-2), shell stays (AC-7) | A dialog: rejected in the spec |
| Header control | A `UserGuideLink` component using `NavLink` to `/guide` | `NavLink` sets `aria-current="page"` on its own (AC-7) | A button with `navigate`: needs hand-made current state |
| Narrow screens | `AppShell` already knows `narrow`, so it passes `compact`, and the link drops its text but keeps `aria-label="User Guide"` | AC-1, with no new media query | CSS-only hiding: the text would still be read twice |
| Back link source | The link passes `state={{ from: path + search }}`. On the guide itself it passes the state it already has, so clicking it again keeps the way back | AC-6 and the reload edge case | Browser history `navigate(-1)`: breaks after a reload or a direct open |
| Back link reader | `readGuideOrigin(state)` in `lib/viewOrigin.ts`: accepts the board, the table with its query, or an application's page (`/applications/<digits>`), and anything else goes to the board with label "Back to board" | `readOrigin` only knows board and table, and the guide can be opened from an application's page | Widening `readOrigin`: would change the detail page's back link |
| Back link label | "Back to board", "Back to table", or "Back to application" | Says where it goes, like spec 013 | A plain "Back" |
| Content | JSX in `UserGuidePage.tsx`, as a `SECTIONS` array of `{ id, title, body }` | Contents list and sections come from one list (AC-3, edge case). No markdown dependency | A markdown file with a parser: a new dependency for fixed text |
| Contents navigation | Anchor links with `href="#id"`, and a click handler that calls `scrollIntoView` on the section | AC-4 without making the router handle hashes | Router hash links: scroll behavior depends on router setup |
| Styling | `UserGuidePage.css` beside the component, using the existing color variables | Both themes read well without per-theme rules (AC-8) | Per-theme overrides |

## Data model

No change.

## API

No change. The guide calls no endpoint.

## UI

- `App.tsx`: add `<Route path="guide" element={<UserGuidePage />} />`.
- `AppShell.tsx`: render `<UserGuideLink compact={narrow} />` in the header, before `ThemeToggle`, inside a small group so the two sit together on the right (AC-1).
- `components/UserGuideLink.tsx` and `.css`: a `NavLink` to `/guide` with a `BookOpen` icon and the text "User Guide". When `compact`, only the icon shows, with `aria-label="User Guide"`. Styled like the theme switch's pill height so the header stays level.
- `components/UserGuidePage.tsx` and `.css`: a back link at the top (from `readGuideOrigin(useLocation().state)`), the heading "User Guide", a contents `nav` with an entry per section, then the sections. Each is a `<section id aria-labelledby>` with an `h2`. Text wraps, so a narrow screen never scrolls sideways.
- Sections, in order, covering AC-3 and AC-5:
  1. **The board:** one column per stage, dragging a card, the card menu, the stage filter and its closed-stages default, opening a card.
  2. **The table:** search, stage, work mode, and employment filters, sorting by column, filters kept in the address.
  3. **The sidebar:** All applications, the eight stages with counts (and which three close an application), Archived, the Add button, the menu button on a narrow screen.
  4. **Adding and editing an application:** the form's fields, the company website, the Wishlist start.
  5. **An application's page:** details, requirements, timeline with date and time, contacts, changing the stage, Edit and Delete.
  6. **Archiving:** archive, where archived ones appear, restore.
  7. **Themes:** the sun/moon switch, starting from the device's setting.
- Loading and error states: none, since the page is static.

## Shared types

None.

## Test strategy

| AC   | Test level | What it checks |
| ---- | ---------- | -------------- |
| AC-1 | UI (`UserGuideLink`, `AppShell`) | The header has a link named "User Guide" with the book icon and text before the theme switch. Narrow: icon only, still named "User Guide". |
| AC-2 | UI (`App`) | Clicking the link from the board shows the guide at `/guide`, and opening `/guide` directly renders it. |
| AC-3 | UI (`UserGuidePage`) | The contents list has seven entries, and each is a link to a section whose heading has that title. Every `href` matches an `id`. |
| AC-4 | UI | Choosing an entry calls `scrollIntoView` on that section (stubbed in jsdom). |
| AC-5 | UI | Each section contains its key terms: dragging, card menu, stage filter, search, sort, the three closing stages, Restore. |
| AC-6 | UI and unit (`readGuideOrigin`) | From the table with a query, the back link goes to that exact address. From an application's page, to it. Unknown state, no state, or an outside address goes to the board. Clicking the header link on the guide keeps the way back. |
| AC-7 | UI | On `/guide`, the sidebar and header show, and the User Guide link has `aria-current="page"`. |
| AC-8 | Smoke | Look at the page in one theme. The page uses only the existing color variables, so the other theme follows. |
| Edge | UI | Reloading at `/guide` shows the guide with a board back link. |

Existing shell, sidebar, and detail page tests must keep passing unchanged. The header test that counts links is checked for the new link.

Component tests are the main proof. After the last task, one short smoke run on the production build, in one theme, opens the guide from the board and the table and uses the back link.

## Risks and mitigations

- **The guide drifts from the app:** the spec's data rules ask later specs to update the matching section. Tests check key terms, so a renamed feature shows up.
- **Header crowding on a narrow screen:** the link is icon only there, and a smoke screenshot checks the layout.
- **A bad `from` value in router state:** `readGuideOrigin` accepts only a fixed set of address shapes, so it can't send me to another site.

## New dependencies

None. `BookOpen` comes from `lucide-react`, which the app already uses.

## Tasks

- [x] **T1:** Add `readGuideOrigin` to `lib/viewOrigin.ts`, with unit tests (AC-6)
- [x] **T2:** Add `UserGuidePage` with the contents list and the seven sections, its styles, and the `guide` route, with tests (AC-2, AC-3, AC-4, AC-5, AC-8)
- [x] **T3:** Add the back link to the guide, with tests for each origin and the reload case (AC-6)
- [x] **T4:** Add `UserGuideLink` and place it in the header, including the narrow form and the current-page state, with tests (AC-1, AC-6, AC-7)
- [x] **T5:** Look at the page and header in one theme, then run one smoke script on the production build (AC-1, AC-2, AC-6, AC-8)
- [x] **T6:** Finish: lint and type fixes, mark the spec Implemented, update the spec index and the roadmap line (all ACs)

## Verification notes

- `npm test` (1065 tests), `npm run lint`, and `npm run typecheck` pass, run one after another.
- The smoke check ran at the HTTP level against the production build with a throwaway database, because no browser tool was used. It confirmed `/guide` is served and the built bundle and CSS hold the guide page and the header link. **How the page and the header link look in a real browser, in either theme and on a narrow screen, is not verified.** It rests on the component tests and on the styles using only the existing color variables.

## Differences from the plan

- None.
