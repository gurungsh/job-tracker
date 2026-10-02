# 007: Activity timeline (tasks)

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

- [x] **T1:** Add the shared activity types, labels, input schema, and automatic-text helper; export the shared date schema (AC-4, AC-5)
- [x] **T2:** Confirm foreign keys are on in `db.ts`, and add migration `0003_create_activities.sql` with a migration test (AC-10, AC-11)
- [x] **T3:** Add the activities store: list in timeline order, create, update, delete (AC-2, AC-3, AC-8, AC-9)
- [x] **T4:** Write the automatic entries inside `createApplication` and `updateApplication`, and test cascade on delete (AC-6, AC-7, AC-11)
- [x] **T5:** Add the activities routes with validation and 404s, and mount them (AC-2, AC-4, AC-5, AC-8, AC-9)
- [x] **T6:** Add the client API calls and extend the fake server for activities (AC-2, AC-13)
- [x] **T7:** Build `Timeline.tsx` with loading, error, empty, and list states (AC-3, AC-10, AC-13)
- [x] **T8:** Add the entry form: add entry, validation errors, and failed-add handling (AC-2, AC-4, AC-13)
- [x] **T9:** Add edit and delete with confirmation (AC-8, AC-9)
- [x] **T10:** Add the Details/Timeline tabs to the panel, keeping the form mounted (AC-1, AC-14)
- [x] **T11:** Confirm existing board, panel, and drag and drop tests pass unchanged (AC-7, AC-12)
- [x] **T12:** Run the manual browser checks and record them below (AC-1 to AC-14)
- [x] **T13:** Set the spec status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

## Notes

- The entry date is validated with `z.iso.date` directly in `packages/shared/src/activities.ts`, so no existing date schema was exported (T1). The plan is updated to match.
- The two activity routers became one `activitiesRouter` mounted at `/api`, because nested `:id` params in a separately mounted router fought the type checker. The URLs are as planned.
- `foreign_keys` was already on in `db.ts`, so T2 only needed a test for the cascade.
- The panel header moved out of the form so the tab bar can sit between the header and either the form or the timeline. The Timeline can't live inside the form, because it has forms of its own.
- Tests: `Timeline.test.tsx` (UI), `activities/router.test.ts` (API, automatic entries), `schema.test.ts` (migration), `activities.test.ts` (shared). Drag and drop's automatic entry is covered by the server test for a stage change through `PUT`, which is what dragging calls.
Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
- Manual checks were run by the assistant on 2026-10-02 in a real headless Chromium (Playwright, installed outside the repo), against the production build with a throwaway database. All 18 checks passed on the final run:
  - Tabs: none when adding, Details and Timeline when editing (AC-1). Unsaved Details edits survive a tab switch, and closing still asks to discard (AC-14).
  - Add entries of several types, including a year-2099 date, with line breaks kept, newest first, still there after a reload (AC-2, AC-3). Empty text and a cleared date show errors (AC-4).
  - Edit changes type and text, and Cancel discards. An automatic entry can be edited and has no type choice (AC-8). Delete asks first (AC-9).
  - "Added to Applied" on creation (AC-6). "Moved from…" after a form change and after a real mouse drag, and none after a save with the same stage (AC-7).
  - Cards on the board are unchanged (AC-12), an application with no entries shows the empty message (AC-10), and deleting an application removes its timeline (AC-11).
  - With the browser offline, adding an entry shows an error and keeps the typed text (AC-13).
  - No uncaught browser errors.
- Not covered in the browser: the load-failure "Try again" and failed delete (AC-13), and direct server requests (AC-5). Automated tests cover them. The check script is not committed.
