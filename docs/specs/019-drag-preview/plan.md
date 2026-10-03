# 019: Drag preview (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented              |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

The board keeps its native HTML5 drag and drop from spec 006. Two additions, both client-only:

1. **Pointer copy.** When a drag starts, the card clones its own element, styles the clone, and hands it to the browser with `setDragImage`. The clone is removed right after the browser has taken its snapshot.
2. **Placeholder.** While a card is over a valid column, the column renders a dashed, empty slot at the index where the card would sort. The index comes from a small comparator that mirrors the server's board order.

`Board` already tracks `dragging` and `overStage`, so the placeholder is derived from that state. No new state is needed.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Drag copy | Clone the card's DOM node and pass it to `setDragImage` | Same content as the card with no duplicated markup (AC-1) | Render a hidden `<Card>` in React: more code and more state. A drag library: a new dependency for a small gain. |
| Copy styling | A `card-drag-image` class: full opacity, slight tilt, shadow, fixed width of the card | Reads as "lifted" in both themes using existing color variables | Browser default image (the problem) |
| Placeholder position | Count the column's cards that sort before the dragged one, using the client's existing `sortForBoard` (the server's order) | AC-2 and AC-5 need the slot where the card will land, so the drop doesn't jump | Always at the end of the column: wrong for the due-date order. Ask the server: needless for a hover. |
| Placeholder look | Empty dashed slot, as tall as the dragged card, measured from its element | Owner's choice. Matches the existing dashed drop highlight | Faded copy of the card (rejected in the spec's open questions) |
| Scrolling | None | Owner's choice | Scroll the column to the slot |
| Where the order lives | `boardIndex` in `apps/client/src/lib/applicationInput.ts`, next to the existing `sortForBoard` | The client already has the board-order comparator, so the index reuses it | A new `boardOrder.ts`: would duplicate the comparator |

## Data model

No change.

## API

No change.

## UI

- `Card.tsx`: in `onDragStart`, after the existing data setup, build the drag image (`event.currentTarget.cloneNode(true)`, class `card-drag-image`, width set to the card's width, placed off screen on `document.body`), call `event.dataTransfer.setDragImage` with the pointer's offset inside the card, and remove the clone in a `setTimeout(0)`. The call is skipped when `setDragImage` doesn't exist, as in jsdom. The card also reports its height to `onDragStart` so the board can size the slot.
- `lib/applicationInput.ts`: `boardIndex(cards, moved)` returns the index at which `moved` would sit among `cards` (the column's cards without it), using `sortForBoard`.
- `Board.tsx`: when `overStage === stage`, render the cards with a `<div className="card-placeholder" aria-hidden="true" style={{ height }}>` spliced in at `boardIndex`. The slot is a drop target through the column, so it needs no handlers of its own. The dragged card is not in another column's list, so a column never shows both the card and a slot for it. `endDrag` already clears `dragging` and `overStage`, which removes the slot on drop, Escape, and release outside a column (AC-3, AC-6).
- After a drop, `moveApplication` puts the card in the column immediately in the same order, so the card replaces the slot at the same index (AC-5). A failed save puts the card back (AC-7).
- `Board.css` and `Card.css`: `.card-placeholder` (dashed border in `--accent`, `--radius`, transparent background) and `.card-drag-image` (shadow and tilt from existing variables). Both are checked in light and dark themes.
- No visual change in the card's own column (AC-4), and the card menu and click behavior are untouched (AC-8).

## Shared types

None.

## Test strategy

| AC   | Test level | What it checks |
| ---- | ---------- | -------------- |
| AC-1 | UI (Card) | Drag start calls `setDragImage` with a clone that has the card's text and the `card-drag-image` class, and removes it afterward. The original card has the dragging class. |
| AC-2 | UI (Board) | Dragging over another column shows one `.card-placeholder` at the index its due date implies. An empty column shows it as the only item. |
| AC-3 | UI (Board) | Moving over a second column removes the first slot and shows one in the second. Leaving the column removes it. Never two at once. |
| AC-4 | UI (Board) | Over the card's own column, no slot shows and nothing is saved. |
| AC-5 | UI (Board) | After the drop the slot is gone, the card sits at the slot's index, and one save is sent. |
| AC-6 | UI (Board) | Drag end without a drop, and a drop outside a column, remove the slot and save nothing. |
| AC-7 | UI (Board) | A failed save puts the card back and shows the message, with no slot left. |
| AC-8 | UI (existing) | The specs 006 and 018 board and card menu tests keep passing unchanged. |
| Order | Unit (`boardIndex`) | Due date ascending with none last, then newest created first, then highest id, matching the server's list. |

Component tests are the main proof. After the last task, one short browser smoke run on the production build in one theme checks the main path and the look of the copy and slot.

## Risks and mitigations

- **The copy looks wrong in a browser:** the drag image is a browser snapshot, which jsdom can't judge. The smoke run and one screenshot of the layout cover it.
- **The client order drifts from the server's:** the unit test pins the rules, and the existing drop test (spec 006, AC-1) checks that the dropped card lands in the right place.
- **Slot flicker as the pointer crosses the slot or cards:** the existing `dragleave` check ignores moves between a column's children, and the slot is inside the column.
- **Safari and Firefox quirks with `setDragImage` on a clone:** the clone is attached to the page before the call, and a missing `setDragImage` is skipped, so the worst case is the browser's default image.

## New dependencies

None.

## Tasks

- [x] **T1:** Add `boardIndex` beside `sortForBoard` and its unit tests (AC-2, AC-5)
- [x] **T2:** Build the styled drag copy in `Card` with `setDragImage`, and report the card's height on drag start, with tests (AC-1)
- [x] **T3:** Show the dashed placeholder in the hovered column at the right index, with its styles and tests (AC-2, AC-3, AC-4)
- [x] **T4:** Test drop, cancel, outside-release, and failed-save with the placeholder, and confirm the spec 006 and 018 tests still pass (AC-5, AC-6, AC-7, AC-8)
- [x] **T5:** Check contrast and look of the copy and slot in both themes, then run one smoke script on the production build in one theme (AC-1, AC-2)
- [x] **T6:** Finish: lint and type fixes, mark the spec Implemented, update the spec index, the roadmap line, and the 006 changelog if its drag text is no longer true (all ACs)

## Verification notes

- `npm test` (1041 tests), `npm run lint`, and `npm run typecheck` pass, run one after another.
- The smoke check ran at the HTTP level against the production build with a throwaway database, because no browser tool was used. It confirmed the built page is served, the bundle holds the placeholder and drag-copy classes, the built CSS has the dashed slot and the off-screen copy styles, and the API accepts an application. **How the drag copy and slot look in a real browser is not verified.** It rests on the component tests, which check the slot's position and the `setDragImage` call, and on the slot reusing the existing drop highlight's `--accent` dashed border, which works in both themes.

## Differences from the plan

- `boardIndex` lives in `lib/applicationInput.ts` next to `sortForBoard`, which already held the board-order comparator, instead of a new `boardOrder.ts`. The plan was updated.
- The drag-preview component tests are in a new file, `Board.dragpreview.test.tsx`.
