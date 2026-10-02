# 006: Board drag and drop (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented      |
| Updated | 2026-10-01         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Make cards draggable with the browser's native HTML5 drag and drop, and make each column a drop target. A drop sends the existing `PUT /api/applications/:id` with the card's current values and the new stage, so the server's stage-date rules run unchanged. The board moves the card at once (optimistic) and puts it back if the save fails. No server, database, or API change.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Drag mechanism | Native HTML5 drag events | Mouse only is enough (owner decision), and it needs no new dependency | A drag library: adds touch and keyboard support we don't need |
| Saving a move | Reuse `PUT` with the full input | The server already applies stage dates in one place (AC-2) | A new stage-only endpoint: a second path to keep in sync |
| Building the input | New `applicationToInput(application)` in `apps/client/src/lib/applicationInput.ts` | Needed once now; the panel builds its own from form text, so it can't be reused | Reusing the panel's code: it works from strings |
| Move timing | Optimistic with rollback | The card should land under the pointer (AC-1, AC-5) | Wait for the server: the card would jump after a delay |
| Result of a move | Replace the saved application in state from the server response | Server dates and `updatedAt` are the truth; no full reload flicker | Reload the board |
| Card order after a move | Re-sort with the server's board order rule on the client | A moved card must sit in due-date order (AC-1) | Insert at the end: wrong until reload |
| Open panel on move | Close it (AC-8) | Avoids a form with a stale stage | Refresh it in place |

## Data model

No change.

## API

No change. Uses the existing `PUT /api/applications/:id` (spec 002). Errors come back as `ApiError` and are shown in the board's message (AC-5).

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| PUT | `/api/applications/:id` | Existing input, with the new `stage` | The updated application | 400, 404, network | AC-1, AC-2, AC-5, AC-6 |

## UI

- `Card.tsx`: `draggable`, `onDragStart` (stores the id in `dataTransfer`, sets `effectAllowed = "move"`), `onDragEnd`. A `card--dragging` class dims it (AC-3). Click still opens the panel (AC-7).
- `Board.tsx`: tracks `dragging` (id) and `overStage`. Each column handles `onDragOver` (calls `preventDefault` only when the card came from this board and the column differs), `onDragLeave`, and `onDrop`. A drop on its own column or with no board card does nothing (AC-4). A column gets `column--drop-target` while a card is over it (AC-3).
- A `moveError` message, shown with `role="alert"` above the board with a Dismiss button, cleared on dismiss or the next move (AC-5).
- Cards with a save in flight (`pendingIds`) are `draggable={false}` (edge case).
- If the open panel's application is the one moved, close the panel on drop (AC-8).
- Styles go in `Card.css` and `Board.css`.
- Escape cancels the drag natively, and `dragend` clears the highlight (edge case).

## Shared types

None. A client helper `sortForBoard` (same order as the server's query) is added next to the board code: due date ascending with none last, then newest created, then highest id.

## Test strategy

| AC   | Test level | What it checks |
| ---- | ---------- | -------------- |
| AC-1 | UI (`Board.test.tsx`) | Drop on another column moves the card there in due-date order, updates counts, and sends one `PUT` with the new stage |
| AC-2 | UI + API | The `PUT` body equals the card's values plus the new stage. Server dates are covered by the existing `dates.test.ts` and router tests; one router test confirms a stage-only change via the full input keeps other fields |
| AC-3 | UI | Drag over shows the highlight on the other column only, dimming on the card, and both clear on drop and dragend |
| AC-4 | UI | Drop on own column or a non-board payload sends no request |
| AC-5 | UI | With the fake server offline, the card returns and the alert shows. Dismiss and next move clear it |
| AC-6 | UI | Drop into each closed column saves with no dialog |
| AC-7 | UI | Existing card click and edit-form tests still pass; cards show the same fields |
| AC-8 | UI | Dropping the open application's card closes the panel |
| Manual | `npm run dev` | Real mouse drag in a browser: highlight, drop, reload, failure by stopping the server |

## Risks and mitigations

- jsdom has no real drag and drop: tests fire `dragStart`, `dragOver`, and `drop` events with a stub `dataTransfer`. The manual browser check covers the real behavior.
- Firefox needs data set in `dragstart` to start a drag: set `dataTransfer.setData("text/plain", id)`.
- A stale card state if a save and a reload overlap: the saved response replaces just that application, so the board stays consistent.

## New dependencies

None.
