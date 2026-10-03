# 019: Drag preview

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                                  |
| Branch  | `feature/drag-preview`                                 |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [006](../006-board-drag-drop/spec.md), [018](../018-board-stage-filter-card-menu/spec.md) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

While I drag a card, the browser shows only a faint default image, and the target column just gets a highlight. I can't see what the board will look like after the drop, so I have to guess where the card will land.

## Goals

- Show a clear copy of the card under the pointer while dragging.
- Show where the card will land in the column it is over, before I release.

## Non-goals (out of scope)

- Keyboard dragging. The card menu from spec 018 stays the way to move a card without a mouse. This changes the roadmap's earlier plan for 019.
- Reordering cards within a column. Cards stay in board order.
- Dragging on touch screens.
- Changing what a move saves. A drop is the same change as in spec 006.

## User stories

- **US-1:** As a job seeker, I want a clear copy of the card to follow my pointer, so that I can see what I'm moving.
- **US-2:** As a job seeker, I want to see where the card will land in the column I'm over, so that I know the result before I release.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** I start dragging a card
  - **When** I move the pointer
  - **Then** a styled copy of the card, showing the same content as the card, follows the pointer instead of the browser's default image. The original card stays in place, dimmed, as in spec 006.
- **AC-2** (US-2)
  - **Given** I'm dragging a card
  - **When** I'm over a column other than the card's own
  - **Then** that column shows a placeholder at the spot where the card would land, in board order with the column's other cards. The column keeps its highlight from spec 006.
- **AC-3** (US-2)
  - **Given** a placeholder is showing in a column
  - **When** I move to another column, or leave the board
  - **Then** the placeholder leaves the first column, and appears in the new one if it is a valid target.
- **AC-4** (US-2)
  - **Given** I'm dragging a card
  - **When** I'm over its own column
  - **Then** no placeholder shows and nothing changes, as in spec 006 (AC-4).
- **AC-5** (US-2)
  - **Given** a placeholder is showing
  - **When** I release over the column
  - **Then** the card takes the placeholder's place with no jump, and the move is saved as in spec 006.
- **AC-6** (US-2)
  - **Given** a placeholder is showing
  - **When** I cancel with Escape or release outside any column
  - **Then** the placeholder and the preview copy go away, and nothing changes or is saved.
- **AC-7** (US-1)
  - **Given** a move fails
  - **When** the server returns an error
  - **Then** the card goes back and a message shows, as in spec 006 (AC-5).
- **AC-8**
  - **Given** the board
  - **When** I click a card, use its menu, or drag it as before
  - **Then** it works as in specs 006 and 018. The card menu still moves cards, and a drop still moves them.

## Data and rules

- Nothing is stored. The preview and placeholder are only shown during a drag.
- The placeholder sits where the moved card would be listed, using the same board order the server uses (spec 002, AC-4).

## Edge cases

- A column with no cards shows the placeholder as its only item.
- Moving quickly across columns must not leave two placeholders showing.
- A card with a save in flight can't be dragged, as in spec 006.
- The preview copy must look right in both themes.
- A long column does not scroll to the placeholder. It shows only in the column.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Placeholder look? **A dashed empty slot the size of the card.**
- [x] Scroll a long column to the placeholder? **No.**

## Changelog

- 2026-10-02: Draft created. Owner decided: no keyboard dragging, and the drag shows both a copy under the pointer and a placeholder in the hovered column. The branch and spec were renamed from "Keyboard drag and drag preview" to "Drag preview".
- 2026-10-02: Open questions resolved (dashed slot, no scrolling). Approved.
- 2026-10-02: Implemented.
