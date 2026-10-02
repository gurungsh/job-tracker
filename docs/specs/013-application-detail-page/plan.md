# 013: Application detail page (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented              |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Add a route `/applications/:id` that renders a new `ApplicationDetailPage`. It loads one application from a new `GET /api/applications/:id`, so a reload or a pasted address works on its own. It lays out the existing `Requirements`, `Timeline`, and `Contacts` components beside new read-only sections for the details and the job description.

The side panel goes away. (While the page is being built, a thin `ApplicationPanel` around the form stays for editing, and is deleted in the last code task.) Its form is kept as `ApplicationForm` and shown in a new `ApplicationDialog`, for both Add (opened from `ApplicationsPage`) and Edit (opened from the detail page). Its tabs, header, and stage info are dropped, because the page now shows them.

The page learns which view I came from through router navigation state. Cards and rows navigate with `state: { from: "<path and search of the current view>" }`. The back link, the delete redirect, and the "Back to board" or "Back to table" label read it, and fall back to the board when it's missing or invalid.

Nothing is stored differently, so there is no migration.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Loading one application | New `GET /api/applications/:id` | The page must work from a pasted address (AC-10, AC-11), and a 404 is the natural way to tell "doesn't exist" apart from "server down" (AC-11). | Find it in the list endpoint's result: a 404 can't be told apart from a stale list, and the page would load every application to show one. |
| Where the route lives | Beside `ApplicationsPage`, not inside it | The page doesn't need the view switch or the shared list. Going back to the board or table remounts `ApplicationsPage`, which loads fresh data, so an edit or delete shows there (AC-8). | Nest it in `ApplicationsPage` and keep one list: the list would have to be patched by hand after every change on the page. |
| Remembering where I came from | Router navigation state holding the view's path and search | It's lost only when the address is opened directly, which AC-10 says goes to the board. The table's filters already live in its address (spec 012), so the path and search restore them (AC-8). | A query parameter on the detail address: it would end up in bookmarks. Session storage: it would outlive the tab's history. |
| Reading the state | Accept it only if it's the board (`/`) or the table (`/table`, with an optional search starting with `?`) | The state could hold anything after a manual history edit. Anything else means the board (AC-10). | Trust the state: a bad value could send me somewhere that isn't a view. |
| Stage change from the page | Fetch the latest application, then save it with only the stage changed, using `applicationToInput` (spec 006) | There's no version column, so saving the page's copy could overwrite an edit made in another tab. Fetching first keeps the edge case in the spec ("uses the latest saved version") for one extra request. | Save the page's copy directly: simpler, but it can write stale values. |
| Showing the new stage | Show it at once, and put the saved stage back if saving fails | Matches how the board's drag and drop behaves (spec 006). A counter ignores results of earlier changes, so two quick changes end on the last one (spec edge case). | Wait for the server before updating the menu: feels slow. |
| Timeline after a stage change, an edit, or a contact change | Give `Timeline` an optional `reloadKey` prop that loads its entries and contacts again in place | The server adds the stage-change entry, and `Timeline` loads its own list. Reloading in place keeps a half-typed entry, which a remount would clear (AC-5, AC-12). A reload that fails keeps what is showing. | Remount with a changing `key`: simpler, but it wipes the entry form (found in the browser checks). Lift the list into the page: a larger change to a component that works. |
| Dialogs | A small `useDialogFocus` hook, used by the new `ApplicationDialog` and by the existing `ConfirmDialog` | Native `<dialog>` and `showModal()` aren't implemented in the jsdom version the tests use, and the existing dialogs are already plain elements. The hook keeps Tab inside the dialog, and returns focus to what opened it when it closes (AC-16). | Native `<dialog>`: better in the browser, but untestable here. A focus-trap library: a new dependency for about 25 lines. |
| Nested dialogs | Each dialog traps Tab on its own element and stops the event there | The discard and delete confirmations open over the form dialog, and each must keep focus inside itself (AC-16). Escape keeps working as in `ConfirmDialog` today, where the topmost one handles it first. | One global trap: it can't tell which dialog is on top. |
| The details section | A description list (`dl`) | It's what the content is: labels and values (AC-3). | A table: implies rows and columns that aren't there. |
| Layout | A CSS grid with two columns (main, then side) that becomes one column below a width breakpoint, with Details first | AC-15. The order changes with CSS only, so on a narrow screen the keyboard order still follows the wide layout. Details has only one link, so this is minor. | Reordering in React with a media query hook: needs JavaScript to lay out the page. |
| Section headings | Each section is a `<section>` with an `<h2>` | `Timeline` and `Requirements` have no heading of their own, and `Contacts` has an `<h3>`, so the page supplies the `h2`s for a clean outline (AC-2, AC-16). | Add headings inside each component: touches components that already pass their tests. |
| Formatting values | Reuse `formatDate`, `isOverdue`, `salarySummary`, `timeInStage`, `employmentLabel`, `StageBadge`, and `isValidJobLink` from `@job-tracker/shared` | The page must write pay, time in stage, and the overdue mark as the card does (AC-3). | New formatters: two spellings of the same value. |

## Data model

No change. No migration.

## API

| Method | Path | Request | Response | Errors | ACs |
| ------ | ---- | ------- | -------- | ------ | --- |
| GET | `/api/applications/:id` | none | `Application` (the same shape the list returns) | 404 `{ error: "Not found" }` for an id that isn't digits only or doesn't exist | AC-1, AC-10, AC-11 |

The existing routes are unchanged. The page uses `PUT` and `DELETE /api/applications/:id`, and the activity, contact, and requirement routes, as the panel does now.

The server adds `getApplication(db, id)` to `applications/store.ts`, built from the same query and row mapping as `listApplications`, and uses the router's existing `parseId` and `notFound`.

## UI

**Routes** (`App.tsx`):

- `/` and `/table` stay under `ApplicationsPage`.
- `/applications/:id` renders `ApplicationDetailPage`.
- Anything else still redirects to `/`.

**`ApplicationsPage`** (changed). It still loads the list and the companies once and shows the view switch. It no longer owns a panel. It keeps one piece of state, whether the Add dialog is open, and renders `ApplicationDialog` for a new application. Its outlet context becomes `{ applications, replaceApplication, openAdd }`. `panelApplicationId`, `openPanel`, and `closePanel` are removed.

**`Board`, `TableView`, `Card`** (changed). Opening a card or a row calls `useNavigate()` with `/applications/${id}` and `state: { from: location.pathname + location.search }`. Board's drag handler no longer closes a panel. The Add button calls `openAdd`.

**`ApplicationDetailPage`** (new), in `components/`. It reads `:id` from the address. An id that isn't digits only, or a 404, gives the "doesn't exist" message with a link to the board (AC-11).

| State | What shows |
| ----- | ---------- |
| Loading | "Loading…" |
| Not found | "This application doesn't exist." and a link "Back to board" |
| Error | The message from the server, a "Try again" button, and the back link |
| Ready | Everything below |

When ready, the page shows:

- **Back link:** "Back to board" or "Back to table", to the saved path and search (AC-8, AC-9).
- **Header:** the company avatar and name, the job title as an `h2` under the app's own `h1`, and the work mode and employment type as on a card (AC-1). On the right: the stage menu, Edit, and Delete (AC-5, AC-6, AC-7).
- **Main column:** Requirements (the existing component), Timeline (the existing component, keyed as above), and Job description (AC-2, AC-4).
- **Side column:** Details and Contacts (AC-2, AC-3).
- **Messages:** a `role="alert"` line for a failed stage change or delete.

**Details** shows: Stage (the `StageBadge` and time in stage), Pay (`salarySummary`), Location, Source, Job link (an "Open posting ↗" link in a new tab when `isValidJobLink`, else plain text), Next step (text, then its due date, with "Overdue" when past), and Applied date. An empty value shows "–" (AC-3).

**`ApplicationDialog`** (new, from the panel's shell). A modal with a title ("Add application" or "Edit application"), a close button, `ApplicationForm` inside, and the discard confirmation for a changed form (spec 002, AC-11). It uses `useDialogFocus`. Closing with Escape or the close button goes through the same discard check as the panel did. It reads whether the form changed from a ref at the moment of the key press, so a press right after typing is never missed. The dialog caps its height at the viewport and the form body scrolls, so Save stays on screen.

**`ApplicationForm`** (renamed from `ApplicationPanel`, reduced). The form fields, validation, and save logic are unchanged. These parts are removed:

- the tab bar and the Timeline, Contacts, and Requirements tabs
- `StageInfo`, because the page shows it now
- the delete button and its confirmation, because delete moves to the page

**`ConfirmDialog`** (changed). It uses `useDialogFocus`, and the page uses it for the delete confirmation and for the discard confirmation.

**`useDialogFocus`** (new, in `lib/`). It moves focus into the dialog on open, keeps Tab and Shift+Tab inside it, and gives focus back to the element that was focused before it opened when it closes.

**Styles.** `ApplicationPanel.css` becomes `ApplicationDialog.css`, with the side-panel positioning replaced by a centered modal. `ApplicationDetailPage.css` is new and sits beside the component. All colors use the existing tokens, so both themes work and the contrast test (spec 010) can cover the new text (AC-14).

## Shared types

No new types. `Application` is the response of the new route. Nothing is added to `packages/shared`.

## Test strategy

Server tests go in `apps/server/tests/applications/`, and client tests in `apps/client/tests/`, mirroring `src/`. UI tests use the fake server, which gains a `GET /api/applications/:id` route that mirrors the real one.

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI | Clicking a card, and clicking a table row, open `/applications/:id` with the company, title, and badges, and no `dialog` is shown. |
| AC-2 | UI | The page has headings for Requirements, Timeline, Job description, Details, and Contacts, and no `tab` role. |
| AC-3 | UI | Details shows pay, location, source, the job link opening in a new tab, next step with an "Overdue" mark, applied date, and time in stage. An empty value shows "–", and a job link that isn't valid is plain text. |
| AC-4 | UI | With and without a description: the empty message, and line breaks kept. |
| AC-5 | UI | Choosing a stage sends one `GET` then one `PUT` with only the stage changed, shows the new stage, and the timeline shows the stage-change entry. A failing `PUT` puts the saved stage back and shows an alert. Two quick changes end on the last. |
| AC-6 | UI | Edit opens the form with the current values. Saving closes it and the page shows the new values. Closing a changed form asks first. |
| AC-7 | UI | Delete asks first. Cancel deletes nothing. Confirm sends `DELETE` and goes to the saved view. |
| AC-8 | UI | Opening from `/table?stage=applied&sort=pay` and using the link back, the browser's Back, or delete returns to that address. An edited row shows its new values in the table. |
| AC-9 | UI | From the board the link reads "Back to board", from the table "Back to table". A bad `from` value goes to the board. |
| AC-10 | UI | Starting at `/applications/:id` with no state shows the page, and the link goes to `/`. |
| AC-11 | API, UI | The server returns 404 for an unknown id and for `abc`, `1.5`, and `-1`. The page shows the "doesn't exist" message and a link to the board. |
| AC-12 | UI | The existing `Timeline`, `Contacts`, and `Requirements` tests keep passing as they are. One page-level test adds an entry, a contact, and a requirement and sees each on the page. |
| AC-13 | UI | Add application opens the dialog. Saving closes it and the new application shows on the board and in the table. No `aside` or panel is rendered anywhere. |
| AC-14 | UI | `contrast.test.ts` gains the page's new text and background tokens, in both themes. The stage badge is the one already covered. |
| AC-15 | Manual | In the browser at a narrow width: one column, Details first, no sideways scrolling, and long text wrapping. Recorded in `tasks.md`. jsdom doesn't lay out CSS. |
| AC-16 | UI | Tab order reaches the link back, the stage menu, Edit, Delete, and the sections. In a dialog Tab and Shift+Tab stay inside it, Escape closes it (after the discard check when changed), and focus returns to the control that opened it. A confirmation over the form dialog traps focus on its own. |

Tests that exist for the panel move with it. `ApplicationPanel.test.tsx` and `ApplicationPanel.edit.test.tsx` become `ApplicationDialog` tests with the same checks of form behavior, minus the tab and delete ones, which move to the detail page's tests. Tests in `Board.test.tsx` and `TableView.test.tsx` that expect a panel to open now expect navigation.

## Risks and mitigations

- **Many tests assume the side panel.** Changing the open behavior touches the board, table, and form tests. Mitigation: change the form into a dialog first and keep its tests green, then switch cards and rows to navigation.
- **The page and the list can disagree briefly.** The detail page loads its own copy, so a change made in another tab isn't seen until a reload. This is the same as the panel today, and the board and table reload when I return to them (AC-8).
- **Focus handling is easy to get subtly wrong.** The hook is small and tested on its own, and the nested-dialog case has its own test (AC-16).
- **A stale `from` after the table's filters change.** The state holds the address as it was when I opened the page, which is what AC-8 asks for.

## New dependencies

None.
