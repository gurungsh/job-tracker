# 021: UI tweaks

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | In Progress                                                  |
| Branch  | `feature/ui-tweaks`                                    |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [012](../012-table-view/spec.md), [014](../014-app-shell-sidebar/spec.md), [018](../018-board-stage-filter-card-menu/spec.md), [020](../020-user-guide/spec.md) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

A few screens are harder to use than they need to be. Stage colors in the sidebar and table add noise. The Kanban and Table buttons are terse. Filter dropdowns make me tick every option one by one. The User Guide needs a separate back link to leave. Kanban columns are only as tall as their cards, so there is little room to drop a card.

## Goals

- Calmer sidebar and table, with no per-stage colors.
- Clearer view buttons.
- Faster filtering, with Select All and Deselect All.
- A User Guide button that opens and closes the guide.
- Kanban columns that fill the page height and accept drops anywhere inside.

## Non-goals (out of scope)

- Changing stage colors on the board columns, cards, or stage badges. They stay as they are.
- Removing the stage icons.
- Any new stored data, filters, or stages.

## User stories

- **US-1:** As a job seeker, I want the sidebar and table to use one neutral text color, so that they look calm.
- **US-2:** As a job seeker, I want clearly named view buttons, so that I know what each one shows.
- **US-3:** As a job seeker, I want to select or clear every option in a filter at once, so that I don't tick them one at a time.
- **US-4:** As a job seeker, I want the User Guide button to toggle the guide, so that I can return to where I was without a back link.
- **US-5:** As a job seeker, I want each Kanban column to fill the page height, so that I can drop a card anywhere in it.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** I'm on any screen with the sidebar
  - **When** I look at the stage entries
  - **Then** each shows its stage icon, name, and count in the normal text color, with no per-stage color.
- **AC-2** (US-1)
  - **Given** I'm on the table view
  - **When** I look at the Stage column
  - **Then** each cell shows the stage icon and name in the normal text color.
- **AC-3** (US-1)
  - **Given** I'm on the board
  - **When** I look at the column headers, cards, and stage badges
  - **Then** they keep their stage colors.
- **AC-4** (US-2)
  - **Given** I'm on the board or the table
  - **When** I look at the view buttons
  - **Then** they read "Kanban View" and "Table View", each with an icon, and the current one is highlighted. Choosing one opens that view as before.
- **AC-5** (US-3)
  - **Given** I open a table filter dropdown (Stage, Work mode, or Employment type)
  - **When** I look at the top of the list
  - **Then** I see one button. It reads "Select All" when something is unselected, and "Deselect All" when every option is selected.
- **AC-6** (US-3)
  - **Given** a table filter dropdown is open
  - **When** I choose Select All
  - **Then** every option in it is selected. **When** I choose Deselect All, **Then** every option is cleared, and that filter no longer narrows the table.
- **AC-7** (US-3)
  - **Given** I open the board's Stages dropdown
  - **When** I choose Select All
  - **Then** every stage is shown. **When** I choose Deselect All, **Then** the stages reset to the default (every stage except the three that close an application), so the board is never empty.
- **AC-8** (US-4)
  - **Given** I'm on the User Guide page
  - **When** I look at the header
  - **Then** the User Guide button is highlighted, and the page has no back link.
- **AC-9** (US-4)
  - **Given** I opened the guide from another screen
  - **When** I choose the highlighted User Guide button
  - **Then** I return to that screen, and the button is no longer highlighted. If the guide was opened directly (a bookmark or reload), I go to the board.
- **AC-10** (US-5)
  - **Given** I'm on the board
  - **When** I look at the columns
  - **Then** each has a visible border and fills the height of the page below the filters, even when it has few or no cards.
- **AC-11** (US-5)
  - **Given** a column has more cards than fit
  - **When** I scroll in that column
  - **Then** its cards scroll inside the column and the column keeps its height.
- **AC-12** (US-5)
  - **Given** I'm dragging a card
  - **When** I drop it anywhere inside another column, including its empty space
  - **Then** the card moves to that stage, as it does today. The column shows the existing drop highlight while I hover over it.
- **AC-13** (US-4)
  - **Given** the User Guide describes the board, the table, and the guide's back link
  - **When** I read it
  - **Then** the text matches these changes: Select All and Deselect All, the view button names, and no back link.

## Data and rules

- Nothing new is stored. The board's stage choice and the table's filters are kept as they are today.
- An empty table filter means "no filter". An empty board stage selection is never allowed.

## Edge cases

- Select All on a filter that already has everything selected shows as Deselect All.
- On a narrow screen the view buttons may shorten to icon only, keeping their names as accessible labels.
- The guide's board and table sections mention filters and the back link, so they need to be updated.

## Open questions

- [x] On a narrow screen, should the view buttons keep their text or show only icons? Default: keep the text unless it doesn't fit.

## Changelog

- 2026-10-02: Draft created.
