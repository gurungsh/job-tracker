# 006: Board drag and drop (tasks)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Plan    | [plan.md](plan.md) |
| Status  | Implemented      |
| Updated | 2026-10-01         |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

- [x] **T1:** Add `applicationToInput` and `sortForBoard` helpers in the client `lib/`, with unit tests (AC-1, AC-2)
- [x] **T2:** Make cards draggable, with the dimmed dragging style (AC-3, AC-7)
- [x] **T3:** Make columns drop targets with the highlight; same-column and foreign drops do nothing (AC-3, AC-4)
- [x] **T4:** Save a drop with the existing update call, move the card optimistically, and apply the server's response (AC-1, AC-2, AC-6)
- [x] **T5:** Roll back a failed move and show a dismissible error; block dragging while a card is saving (AC-5)
- [x] **T6:** Close the side panel when its own application is moved (AC-8)
- [x] **T7:** Confirm existing board and panel tests still pass unchanged (AC-7)
- [x] **T8:** Run the manual browser checks from the plan and record them below (AC-1 to AC-6)
- [x] **T9:** Set the spec status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

## Notes

- Added `Board.dragdrop.test.tsx` rather than growing `Board.test.tsx`, and one server router test for AC-2. The component and helpers are as planned.
- jsdom can't perform a real drag, so the owner did the browser check with `npm run dev` on 2026-10-01:
  - Dragged cards between columns and reloaded the page: every application was in the right column (AC-1, AC-2).
  - Stopped the server and dragged a card: the board showed an error (AC-5).
  - Not checked by hand: dropping on the card's own column (AC-4) and the panel closing (AC-8). Automated tests cover both.

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
