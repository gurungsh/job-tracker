# 018: Board stage filter and card menu

| Field   | Value                                          |
| ------- | ---------------------------------------------- |
| Status  | Implemented                                    |
| Branch  | `feature/board-stage-filter-card-menu`         |
| Created | 2026-10-02                                     |
| Updated | 2026-10-02                                     |
| Depends | [011](../011-stage-colors-cards/spec.md), [006](../006-board-drag-drop/spec.md) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The board always shows all eight stages, so the closed ones (Accepted, Rejected, Withdrawn) take up room that the active stages need. Changing a card's stage also takes a drag or a trip through the edit form, which is slow when the target column is far away or off screen.

## Goals

- Choose which stages the board shows, with the closed stages hidden to start.
- Move a card to another stage from a menu on the card.

## Non-goals (out of scope)

- Keyboard dragging and a live drag preview (spec 019).
- Filtering the table view or the sidebar's counts. Only the board changes.
- Other card menu actions, such as Open, Archive, and Delete.
- Reordering cards within a column.
- Storing the choice in the database or in the page address.

## User stories

- **US-1:** As a job seeker, I want to hide the stages I don't need on the board, so that the active stages have room.
- **US-2:** As a job seeker, I want my stage choice to stick between visits, so that I don't set it again each time.
- **US-3:** As a job seeker, I want to move a card to another stage from its menu, so that I don't have to drag it across the board.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** I open the board for the first time in this browser
  - **When** it loads
  - **Then** it shows the columns for Wishlist, Applied, Screening, Interviewing, and Offer, and hides Accepted, Rejected, and Withdrawn.
- **AC-2** (US-1)
  - **Given** the board is showing
  - **When** I open the stage filter in the board's toolbar
  - **Then** I see all eight stages with a checkbox each, checked for the stages the board shows.
- **AC-3** (US-1)
  - **Given** the stage filter is open
  - **When** I check or uncheck a stage
  - **Then** that stage's column appears or disappears right away, and the other columns keep their order.
- **AC-4** (US-1)
  - **Given** I have unchecked every stage but one
  - **When** I try to uncheck that last stage
  - **Then** it stays checked, so the board always shows at least one column.
- **AC-5** (US-2)
  - **Given** I changed which stages the board shows
  - **When** I reload the page or come back later in the same browser
  - **Then** the board shows the stages I chose.
- **AC-6** (US-2)
  - **Given** the saved choice is missing or unreadable
  - **When** the board loads
  - **Then** it falls back to the starting choice in AC-1 and does not show an error.
- **AC-7** (US-3)
  - **Given** a card on the board
  - **When** I open its menu
  - **Then** I see a "Move to" list of the other seven stages, each with its stage color and icon.
- **AC-8** (US-3)
  - **Given** a card's menu is open
  - **When** I pick a stage
  - **Then** the card moves to that stage, the stage change is recorded in its timeline, and the sidebar's counts update, all as when I drag it or use the edit form.
- **AC-9** (US-3)
  - **Given** I pick a stage the board is hiding
  - **When** the move succeeds
  - **Then** the card leaves the board and a short message names the stage it moved to.
- **AC-10** (US-3)
  - **Given** a card's menu is open
  - **When** I press Escape, click outside it, or pick a stage
  - **Then** the menu closes.
- **AC-11** (US-3)
  - **Given** a card
  - **When** I use the menu button
  - **Then** the card does not open the application's page, and dragging the card still works.
- **AC-12** (US-3)
  - **Given** I use only the keyboard
  - **When** I tab to a card's menu button
  - **Then** I can open the menu, move through the stages with the arrow keys, and pick one with Enter.
- **AC-13** (US-3)
  - **Given** a move fails
  - **When** the server returns an error
  - **Then** the card stays where it was and I see an error message.

## Data and rules

- The eight stages and their order are unchanged. The last three (Accepted, Rejected, Withdrawn) are the closed stages.
- The stage choice is a per-browser preference. It is not part of an application and is not stored in the database.
- Hiding a stage only hides its column. The applications in it still exist and still count in the sidebar and the table.
- Moving a card from the menu is the same change as dragging it or editing its stage, so the same rules and the same timeline entry apply.

## Edge cases

- A card moved to a hidden stage leaves the board, and the message is the only sign of where it went. It is still found in the table, the sidebar, and its own page.
- Browser storage can be unavailable or hold old or damaged data, so the board must still load with the starting choice.
- A hidden stage that holds applications is not a problem: showing it again lists them.
- A card's menu on a narrow screen must be reachable with a tap and not run off the screen.
- Menu buttons must not take over drag starts: a drag that begins on the card still moves the card.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should the stage filter also offer a "Reset"? No.
- [x] Should the board note how many cards are hidden? No.

## Changelog

- 2026-10-02: Draft created. Owner decided: the choice is remembered in the browser, the closed stages are hidden to start, the card menu only moves a card, and a card moved to a hidden stage leaves the board.
- 2026-10-02: Open questions resolved (no Reset, no hidden-count note). Approved.
- 2026-10-02: Implemented.
