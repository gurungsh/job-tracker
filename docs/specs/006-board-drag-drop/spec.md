# 006: Board drag and drop

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                          |
| Branch  | `feature/board-drag-drop`                              |
| Created | 2026-10-01                                             |
| Updated | 2026-10-01                                             |
| Depends | [002: Applications board](../002-applications-board/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

Changing an application's stage means opening the side panel, picking a stage, and saving. That's slow for the most common action on a board, which is moving a card to the next stage. Dragging the card to its new column is quicker and matches how a board is expected to work.

## Goals

- Move a card to another stage by dragging it to that column with the mouse.
- Make the move behave exactly like changing the stage in the edit form.
- Keep the board's order, cards, and edit form as they are.

## Non-goals (out of scope)

- Reordering cards within a column. Cards stay in the due-date order from spec 002 (AC-4). A hand-kept order is moved to "Later, maybe" in the roadmap.
- Dragging on touch screens, or with the keyboard. The edit form stays the way to change the stage without a mouse.
- Asking for confirmation when a card is dropped into a closed stage.
- Undoing a move. Dragging the card back works as a manual undo.

## User stories

- **US-1:** As a job seeker, I want to drag a card to another column, so that I can change its stage quickly.
- **US-2:** As a job seeker, I want a move to have the same effects as changing the stage in the form, so that dates stay trustworthy.
- **US-3:** As a job seeker, I want to see where a card will land and be told if a move failed, so that I can trust what the board shows.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** the board shows a card in one column
  - **When** I drag it onto a different column and release
  - **Then** the card appears in that column, in due-date order with the others, and the column counts update. After reloading the page it is still there.
- **AC-2** (US-2)
  - **Given** I move a card to another stage by dragging
  - **When** I compare it with changing the same card's stage in the edit form
  - **Then** the result is the same, including applied date, closed date, and stage-changed time, and the card's other fields are unchanged.
- **AC-3** (US-3)
  - **Given** I'm dragging a card
  - **When** it is over a column other than its own
  - **Then** that column is highlighted, and the dragged card looks dimmed. The highlight and dimming go away when I release or cancel.
- **AC-4** (US-1)
  - **Given** I'm dragging a card
  - **When** I release it over its own column, or anywhere that isn't a column
  - **Then** nothing changes and nothing is saved.
- **AC-5** (US-3)
  - **Given** I drop a card on another column
  - **When** the save fails, such as when the server can't be reached
  - **Then** the card is back in its original column, and a message says the move failed and why. The message goes away when I dismiss it or move another card.
- **AC-6** (US-1)
  - **Given** I drop a card into Accepted, Rejected, or Withdrawn
  - **When** the move is saved
  - **Then** it happens without a confirmation, as in the edit form.
- **AC-7**
  - **Given** the board
  - **When** I click a card, or use the edit form to change a stage
  - **Then** it works exactly as in specs 002 and 003, and the cards show only what they showed before.
- **AC-8** (US-1)
  - **Given** the side panel is open on an application
  - **When** I drag that application's card to another column
  - **Then** the move is saved, and the panel closes, since its form would otherwise show an old stage.

## Data and rules

- A move changes only the stage. Dates follow the stage rules from spec 002, the same as the edit form.
- Dragging doesn't store any order, so there is no new data.

## Edge cases

- Dragging text or a link from outside the board onto a column does nothing.
- Dropping a second card before the first move has finished saving: both moves are saved, and each one that fails goes back on its own.
- A card with a stage change in flight can't be dragged again until it finishes.
- Pressing Escape while dragging cancels the move.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Reorder within a column? **No.** Cards stay in due-date order.
- [x] Touch and keyboard support? **No.** Mouse only.
- [x] Confirm before closing an application? **No.**
- [x] AC-8: close the panel or refresh it? **Close it.**

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Approved. The panel closes when its application is moved.
- 2026-10-01: Implementation started.
- 2026-10-01: Approved. The panel closes when its application is moved.
- 2026-10-01: Implementation started.
- 2026-10-01: Implemented.
- 2026-10-02: Spec 011 added to the board cards: a company badge, a line with location, work mode, and employment type, the pay, a stage badge, and the time in stage. Where this spec says cards show only the earlier content, spec 011's content is now expected too. Nothing else about the cards changed.
- 2026-10-02: Spec 013 replaced the side panel with a page, so AC-8 (the panel closes when its application is dragged to another column) no longer applies. Moving a card works as before.
