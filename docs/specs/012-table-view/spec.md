# 012: Table view

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                            |
| Branch  | `feature/table-view`                                   |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [011: Stage colors and richer cards](../011-stage-colors-cards/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The board is good for seeing where each application is, but it can't answer questions like "which remote jobs am I still waiting on?" or "which application has been in its stage the longest?". Finding one application means scanning eight columns. A table I can search, filter, and sort answers those questions at a glance, and a filtered view I can bookmark saves me from rebuilding it each time.

## Goals

- See every application as one row in a table, with its key facts in columns.
- Search by company or job title.
- Filter by stage, work mode, and employment type.
- Sort by any column.
- Keep the search, filters, and sort in the page address, so a view survives a reload and can be bookmarked.
- Switch between the Kanban board and the table with a Kanban/Table switch.

## Non-goals (out of scope)

- Adding an application from the table. The Add button is being moved in a later spec, so the table has none for now.
- Changing the stage, editing, or deleting from a row, other than through the side panel that a row opens.
- Dragging, reordering, or grouping rows.
- Choosing which columns to show, resizing or reordering columns, or saving named views.
- Paging. All matching rows show on one page.
- Remembering the last view used. The board is where the app opens.
- The application detail page (spec 013), the sidebar (spec 014), and a stage filter on the board (spec 018).

## User stories

- **US-1:** As a job seeker, I want to see all my applications in a table, so that I can compare them side by side.
- **US-2:** As a job seeker, I want to search by company or job title, so that I can find one quickly.
- **US-3:** As a job seeker, I want to filter by stage, work mode, and employment type, so that I can narrow the list to what I care about.
- **US-4:** As a job seeker, I want to sort by any column, so that I can see the oldest, the best paid, or the next due first.
- **US-5:** As a job seeker, I want my search, filters, and sort kept in the page address, so that I can reload or bookmark a view.
- **US-6:** As a job seeker, I want to switch between the board and the table, so that I can use whichever fits the moment.
- **US-7:** As a job seeker, I want to open an application from a row, so that I can read or edit it as I do from a card.

## Acceptance criteria

- **AC-1** (US-6)
  - **Given** the app
  - **When** I open it at its main address
  - **Then** I see the Kanban board, and a Kanban/Table switch shows Kanban as the selected view.
- **AC-2** (US-6)
  - **Given** either view
  - **When** I click the other side of the switch
  - **Then** that view opens, the switch shows it as selected, and the browser's Back button returns me to the previous view.
- **AC-3** (US-1)
  - **Given** the table view with no search or filters
  - **When** I look at it
  - **Then** every application is one row, with these columns in this order: Company, Job title, Stage, Location, Work mode, Employment type, Pay, Next step, Time in stage.
- **AC-4** (US-1)
  - **Given** a row
  - **When** I read its cells
  - **Then** the stage shows its icon and name in the stage's color, as on the board. Pay and time in stage are written as on a card (spec 011). Employment type shows a contract's length in months, such as "Contract · 6 mo". The next step shows its due date, and a due date in the past is marked "Overdue", as on a card. An empty value shows "–".
- **AC-5** (US-1)
  - **Given** the table view with no sort chosen
  - **When** I look at the rows
  - **Then** they are in stage order, Wishlist to Withdrawn, with closed stages included. Applications in the same stage keep the same order they have on the board.
- **AC-6** (US-2)
  - **Given** the table view
  - **When** I type in the search box
  - **Then** only rows whose company name or job title contains what I typed show, ignoring capitals and extra spaces at either end. With nothing typed, search filters nothing.
- **AC-7** (US-3)
  - **Given** the table view
  - **When** I check one or more stages in the stage dropdown
  - **Then** only rows in any of the chosen stages show. With none chosen, all stages show.
- **AC-8** (US-3)
  - **Given** the table view
  - **When** I check one or more values in the work mode dropdown, or in the employment type dropdown
  - **Then** only rows with any of the chosen values show. With none chosen, that filter removes nothing.
- **AC-9** (US-2, US-3)
  - **Given** a search and several filters
  - **When** they are all set
  - **Then** a row shows only if it matches the search and every filter that has a choice.
- **AC-10** (US-3)
  - **Given** the table with a search or any filter set
  - **When** I look at it
  - **Then** I see how many rows match out of how many applications there are, such as "3 of 12", and a way to clear the search and all filters at once.
- **AC-11** (US-4)
  - **Given** the table view
  - **When** I click a column heading
  - **Then** the rows sort by that column, ascending. Clicking it again sorts descending, and a third click goes back to the default order. The heading shows which column is sorted and in which direction, and only one column is sorted at a time.
- **AC-12** (US-4)
  - **Given** a sort
  - **When** the rows are ordered
  - **Then** these rules apply:
    - Company, Job title, and Location sort alphabetically, ignoring capitals.
    - Stage sorts in board order.
    - Work mode and Employment type sort alphabetically by their names.
    - Pay sorts by the lowest amount, hourly and annual amounts compared as yearly pay (an hour is 2,080 per year).
    - Time in stage sorts by days.
    - Next step sorts rows with a due date first, by date, then rows with only text, alphabetically.
    - Rows with an empty value in the sorted column always come last, in either direction.
- **AC-13** (US-5)
  - **Given** a search, filters, and a sort
  - **When** I look at the page address
  - **Then** it holds all of them, and reloading the page, or opening that address in another tab, shows the same view with the same rows.
- **AC-14** (US-5)
  - **Given** the page address holds a value that is not valid, such as an unknown stage or sort column
  - **When** the page loads
  - **Then** that value is ignored, the rest still applies, and nothing breaks.
- **AC-15** (US-5, US-6)
  - **Given** a table view with a search or filters
  - **When** I switch to the board and back
  - **Then** the search, filters, and sort I had are back.
- **AC-16** (US-7)
  - **Given** the table view
  - **When** I click a row
  - **Then** the side panel opens for that application, as when I click a card, and the search, filters, and sort stay as they were when I close it.
- **AC-17** (US-7)
  - **Given** the side panel is open on a row
  - **When** I change its stage or other fields, or delete it
  - **Then** the panel closes, as it does on the board, and the table updates: the row shows its new values, or is gone, and the filters and sort still apply to it. If the changed application no longer matches the filters, its row leaves the table.
- **AC-18** (US-1)
  - **Given** I have no applications
  - **When** I open the table
  - **Then** I see a message saying there are none yet, and no column headings are sorted.
- **AC-19** (US-3)
  - **Given** applications exist but none match
  - **When** I look at the table
  - **Then** I see a message saying nothing matches, with the way to clear the search and filters.
- **AC-20** (US-1)
  - **Given** either theme
  - **When** I look at the table
  - **Then** it is readable in the light and the dark theme, with each text at a contrast ratio of at least 4.5 to 1.
- **AC-21** (US-1)
  - **Given** a very long company name, job title, location, or next step
  - **When** I look at its row
  - **Then** the cell is cut off with "…" and the other columns keep their place.
- **AC-22** (US-4, US-6)
  - **Given** I use only the keyboard
  - **When** I tab through the table view
  - **Then** I can reach the search box, each filter, the column headings, the clear button, the rows, and the Kanban/Table switch, and use each with Enter or Space.

## Data and rules

- Nothing new is stored. The table is worked out from the applications that already exist.
- The search, filters, and sort are part of the page address, not the database. The stage, work mode, and employment type values are those already defined for applications.
- Search and filtering happen in the browser on the full list of applications.
- "Time in stage" counts whole calendar days as on the board (spec 011).
- A row in the table is the same application as a card on the board, so a change on one shows on the other.

## Edge cases

- An empty search, or only spaces, filters nothing.
- A search with special characters, such as "C++" or "(", matches them as plain text.
- A filter that matches nothing shows the "nothing matches" message, not a blank page.
- An application with no work mode or employment type is hidden whenever that filter has a choice, since it matches no value.
- Two rows that tie in the sorted column keep their default order.
- Applications that are added, edited, or deleted while the table is open show up without reloading the page.
- An address with the same value twice, such as the same stage twice, counts it once.
- Opening an address for a view that doesn't exist shows the board.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Does the search box match as I type, or only after I press Enter? **As I type.**
- [x] Are the filter choices always-visible chips or dropdowns? **Dropdowns**, one each for stage, work mode, and employment type, with a checkbox per value.
- [x] Does Pay sort by the lowest or the highest amount? **The lowest**, as in AC-12.
- [x] When I save a change that makes a row stop matching the filters, does the panel stay open? **No.** The panel closes on save, as it does today, and the row leaves the table (changed from the first answer once the plan showed that saving already closes the panel).

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Resolved the open questions: search as I type, dropdown filters, Pay sorts by the lowest amount, and the panel stays open on a row that stops matching.
- 2026-10-02: Approved.
- 2026-10-02: AC-17 now says the panel closes on save, as it does today, and the row leaves the table if it stops matching. AC-12 lists Next step only under its due-date sort.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
- 2026-10-02: Spec 013 replaced the side panel. Clicking a row opens the application's page, with a link back to the table as it was left, so AC-16 and AC-17 now describe the page: an edit or delete made there shows in the table when I go back, and a row that no longer matches the filters is gone.
- 2026-10-02: Spec 014 added a sidebar whose entries open this table filtered to one stage, with the search, other filters, and sort cleared, or unfiltered from "All applications". The table's own address, filters, and switch work as before, and the table still has no Add button, which moves with the later navigation bar.
- 2026-10-02: The stage filter on the board is now spec 016, because the Add button in the sidebar became spec 015. Nothing else changed.
- 2026-10-02: Spec 015 put the Add application button at the top of the sidebar, so adding now works from the table too. The non-goal that says the table has no Add button no longer applies. Saving from the table keeps its search, filters, and sort, and shows the new row only if it matches them.
- 2026-10-02: The stage filter on the board is now spec 018, because specs 016 and 017 were added before it. Nothing else changed.
