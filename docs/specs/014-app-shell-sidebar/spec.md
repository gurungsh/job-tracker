# 014: App shell and sidebar

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                                 |
| Branch  | `feature/app-shell-sidebar`                            |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [012: Table view](../012-table-view/), [013: Application detail page](../013-application-detail-page/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

To see how many applications are at a stage, or to look at just one stage, I have to open the table and set a filter, or scan eight board columns. Nothing on screen tells me the shape of my search at a glance. A sidebar that always shows each stage with its count, and opens the table for that stage in one click, answers "where do things stand?" from any screen. It also gives the app a lasting frame, a header and a left column, that later features can add to.

## Goals

- Show a left sidebar on every screen, listing every stage with a live count of its applications.
- Open the table filtered to a stage from its sidebar entry, and to all applications from an "All applications" entry.
- Keep the counts right as applications are added, moved, edited, and deleted, without reloading.
- Show which entry matches the table I'm looking at.
- Make the header carry the app name, as a link to the board.
- Fold the sidebar behind a menu button on narrow screens.
- Make the left column a frame that a later navigation bar, including the Add application button, can join.

## Non-goals (out of scope)

- Moving the Add application button. It stays in the board's toolbar. A later spec moves it into the left navigation bar, which shares this column.
- Other sidebar entries, such as a link to a user guide or to settings. Spec 017 adds the guide link to the header.
- Collapsing or resizing the sidebar on a wide screen, or remembering whether it was open.
- Dragging a card onto a sidebar entry to change its stage.
- Counts that follow the table's search or other filters. The counts are always totals for the stage.
- A stage filter on the board (spec 015).
- New fields, new stages, or any change to what the board, table, or detail page show or do, other than the frame around them.

## User stories

- **US-1:** As a job seeker, I want to see how many applications are at each stage on every screen, so that I know where things stand at a glance.
- **US-2:** As a job seeker, I want to click a stage to see just those applications in the table, so that I can get to them in one step.
- **US-3:** As a job seeker, I want the counts to stay right when I change things, so that I can trust them.
- **US-4:** As a job seeker, I want to see which stage I'm looking at, so that I don't lose my place.
- **US-5:** As a job seeker, I want the app name to take me home, so that I can always get back to the board.
- **US-6:** As a job seeker on a small screen, I want the sidebar out of the way until I need it, so that the page has room.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** the board, the table, or an application's page
  - **When** I look at the app
  - **Then** a sidebar is on the left with an "All applications" entry first, then one entry for each of the eight stages in board order: Wishlist, Applied, Screening, Interviewing, Offer, Accepted, Rejected, Withdrawn. Each stage entry shows its icon and name in the stage's color, as elsewhere (spec 011), and its count.
- **AC-2** (US-1)
  - **Given** applications in several stages, including closed ones
  - **When** I read the counts
  - **Then** each stage's count is the number of applications in that stage, "All applications" shows the total, and a stage with none shows 0. Closed stages are counted too.
- **AC-3** (US-3)
  - **Given** any screen
  - **When** I add an application, change one's stage (by dragging, in the edit form, or from the stage menu on its page), or delete one
  - **Then** the counts change at once, without reloading the page, and are right on every screen I move to afterward.
- **AC-4** (US-2)
  - **Given** any screen, with or without a search or filters in the table's address
  - **When** I click a stage's entry
  - **Then** the table opens showing only applications in that stage. Its search, work mode filter, employment type filter, and sort are cleared. Clicking "All applications" opens the table with no search, filters, or sort.
- **AC-5** (US-4)
  - **Given** the table
  - **When** its stage filter has exactly one stage
  - **Then** that stage's entry looks selected and is marked as the current page for screen readers, whatever the search or other filters are.
  - **And** "All applications" looks selected when the table's stage filter has no stage chosen. With two or more stages chosen, no entry is selected. On the board and on an application's page, no entry is selected.
- **AC-6** (US-5)
  - **Given** any screen
  - **When** I look at the header
  - **Then** it shows the app name "Job Tracker", which opens the board when I click it, and the theme toggle, as before.
- **AC-7** (US-1)
  - **Given** the applications haven't loaded yet, or couldn't be loaded
  - **When** I look at the sidebar
  - **Then** the entries are there and work, and show no counts rather than wrong ones. When they load, the counts appear.
- **AC-8** (US-6)
  - **Given** a narrow screen, such as a phone
  - **When** I look at the app
  - **Then** the sidebar is hidden, and the header has a menu button that opens it over the page. The button says whether the menu is open, and a wide screen shows no menu button.
- **AC-9** (US-6)
  - **Given** the sidebar is open on a narrow screen
  - **When** I choose an entry, press Escape, choose the menu button again, or click outside the sidebar
  - **Then** the sidebar closes, and focus goes back to the menu button, unless I chose an entry, in which case focus goes to the page I opened. Choosing an entry also opens its table.
- **AC-10** (US-1)
  - **Given** I use only the keyboard
  - **When** I tab through the app
  - **Then** I can reach the app name, the theme toggle, the menu button on a narrow screen, and every sidebar entry, and use each with Enter. On a narrow screen with the sidebar closed, its entries are not reachable, and with it open, focus stays inside it.
- **AC-11** (US-1)
  - **Given** either theme
  - **When** I look at the header and the sidebar
  - **Then** they are readable in the light and the dark theme, with each text at a contrast ratio of at least 4.5 to 1, and the selected entry stands out in both.
- **AC-12** (US-1)
  - **Given** the board, the table, and an application's page
  - **When** I use them
  - **Then** each does what it did before this spec, including the Add application button in the board's toolbar, and the page content sits beside the sidebar without being cut off or scrolling sideways, including at the width of a phone.

## Data and rules

- Nothing new is stored. Counts are worked out from the applications that already exist.
- A stage's count is the number of applications whose stage it is. The total is the number of all applications. They don't depend on the table's search or filters.
- A stage entry opens the table's address with only that stage as its filter (spec 012). "All applications" opens the table's address with nothing set. The board opens from the app name.
- An entry is selected only on the table, from the stage filter in its address, and only by its stage filter (spec 012, AC-13).
- "Narrow" is a screen too small for the sidebar and the page side by side. The plan chooses the width.

## Edge cases

- With no applications, every entry shows 0 and "All applications" shows 0.
- A count in the thousands still fits on its entry without breaking the layout.
- Two applications changing at once, such as two quick stage changes, end with the counts of the last result.
- An application deleted or changed in another tab shows in the counts the next time the app loads or any of its views loads again, not at once.
- An address for a stage the table doesn't know is ignored by the table (spec 012, AC-14), so no entry is selected.
- Opening the app at an application's address, or at an address that doesn't exist, still shows the sidebar and header.
- Resizing the window across the narrow width opens or closes the menu button without losing the page I'm on.
- A long stage name or a count with many digits never pushes the page content out of view.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Does the left column also hold the later navigation bar? **Yes.** The Add application button moves there in a later spec, and 014 builds the column.
- [x] Does the sidebar start with an "All applications" entry? **Yes**, with the total.
- [x] What happens on a narrow screen? **The sidebar folds behind a menu button** in the header.
- [x] When does an entry look selected? **When the table's stage filter is exactly that stage**, and "All applications" for no stage filter.
- [x] What happens to the table's other filters when I click a stage? **They are cleared**, so the list is exactly that stage.
- [x] Is the app name a link? **Yes**, to the board.

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
