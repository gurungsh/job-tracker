# 016: Detail page redesign (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Implemented              |
| Updated | 2026-10-02               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

This is a client-only change. Three shared pieces carry most of it:

- **`SectionCard`**, a card with a small uppercase heading and an optional action in the heading, which replaces the page's private `Section`.
- **`EntryActions`**, the pencil that edits and the ✕ that deletes, which every requirement, timeline entry, and person gets.
- **A `.pill` style** for the header's pills and the "Nice to have" mark.

Then each box is rebuilt on those: Requirements, Timeline, and Contacts render their own `SectionCard`, so their "+ Add" can sit in the heading. The Details box, the page header, and the app header (logo and theme switch) are restyled.

The delete confirmations, the inline edit forms, the saving logic, and the API calls are reused unchanged. Nothing is stored differently.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Who draws a box | `Requirements`, `Timeline`, and `Contacts` each render a `SectionCard`, and so do Details and Job description on the page | "+ Add" lives in the heading but its open or closed state belongs to the box (AC-6). Rendering the card inside each box keeps that state in one place. | Lifting the "add form is open" state up to the page for two boxes: more props for no gain. |
| `SectionCard` | New `components/SectionCard.tsx`, a `section` labelled by its `h3` (so it is still a region), with an `action` slot at the right of the heading | The page's tests and screen readers find boxes as regions by name (AC-1). | Keeping `Section` in the page file: the boxes couldn't use it. |
| The per-entry controls | `EntryActions({ what, text, onEdit, onDelete })` in `components/EntryActions.tsx`. Edit is a pencil icon button and delete is a ✕ icon button, each named `Edit …: <text cut at 40 characters>` or `Delete …: …`, and each showing a one-word label (`data-tip`) on hover and on keyboard focus from a CSS-only tooltip in `global.css`. | One component keeps the three boxes identical (AC-4). Neither button has text, so each has to say what it acts on. The label shows on focus as well as hover, so keyboard use isn't left with a bare icon, and the ✕'s opens toward the left so the card's edge never cuts it off. (First built with a text Edit, then changed after the owner's review.) | A text Edit beside the ✕: it looked uneven. The browser's own `title`: it waits about a second and never shows on focus. |
| Button styles | `.icon-button` and `.text-button` in `styles/global.css`, built on existing tokens: muted text, `--text` on hover, `--danger` on hover for the ✕, the existing focus ring, a 2rem square target for the ✕ | They are used by three boxes, so they are app-wide styles (constitution §3). The pairings are already in the contrast test (AC-1, AC-4). | Per-box styles: three copies. |
| Deleting | Each box keeps its `ConfirmDialog` and its message, now opened by the ✕ | The wording and the flow are unchanged (AC-5). | New wording: not asked for. |
| Several forms open at once | Each box tracks the ids being edited as a set, not one id | Choosing Edit on a second entry must not throw away what I typed in the first (spec edge case). Today one `editingId` closes the first form. | Disabling Edit while a form is open: blocks the user for no reason. |
| "+ Add" in Requirements and Contacts | A `useState` flag per box. The button reads "+ Add" and is named "Add requirement" or "Add contact". It is hidden while the form is open. The form's buttons are Save and Cancel. Saving closes the form. The last kind chosen for a requirement is remembered for the next time. | AC-6. Hiding the button while the form is open avoids two buttons with one name. Remembering the kind keeps what spec 009 gave for adding several of one kind in a row. | Leaving the form always open, as today: it isn't what the screenshots show. |
| Required-met line | New `requiredMetSummary(items)` in `packages/shared/src/requirements.ts`, giving "0/2 required met" and an empty string when no requirement is of the required kind. `requirementsSummary` is removed, since only `Requirements.tsx` uses it. | AC-3, and the shared package is where the old function and its tests live. | Computing it in the component: no test of its own. |
| Pay line | New `payLine(min, max, period)` in `lib/salary.ts`: "$85,000 – $95,000/yr", "$85/hr", "From $85,000/yr", "Up to $95,000/yr". The form's own summary (`salarySummary`) and the cards' (`compactSalary`) stay as they are. | Neither existing wording matches the screenshot (AC-10), and each of those has its own spec and tests. | Changing `salarySummary`: it would change the form's live summary (spec 003). |
| In stage since | `stageChangedAt` formatted in the browser's time zone with `Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })`, a new `formatDateTime` in `lib/dates.ts` | AC-10. It uses what is already recorded. The Stage and Time in stage rows go, since the stage is in the header's menu and the screenshots show neither. | Keeping both rows: the owner chose to match the screenshots. |
| Timeline icons | New `lib/activityIcons.ts` mapping each activity type to a lucide icon (a note, an email, a call, an interview, and an arrow for a stage change). The icon carries the type's name for screen readers in a visually hidden label. | AC-8. A map in one place, like `stageIcons.ts`. The hidden label keeps the type available as text. | Emoji, as in the screenshot: they render differently on each system and don't follow the theme. |
| Log button | The button is named from the chosen type: "Log note", "Log email", "Log call", "Log interview". The form keeps its landmark name "Add entry". When editing, it is "Save". | AC-7. | A fixed "Add entry": not what the screenshot shows. |
| Visually hidden text | A `.visually-hidden` class in `styles/global.css` | There is none yet, and the icon labels need one. | Using `aria-label` only: the type would no longer be found as text. |
| The Contacts box | `Contacts` renders a `SectionCard` titled "Contacts", and the company-named "People at …" heading goes. Each person shows name, then role, then the email as a `mailto:` link, then phone and notes when set. The empty text is "Nobody recorded yet — add the recruiter or hiring manager you're talking to." | AC-9. The region keeps its name, "Contacts", as the owner asked, so the tests and scripts that find it by that name still work. | Renaming it "People" as in the screenshots: the owner chose to keep "Contacts". |
| Header pills | A `.pill` span for each of the work mode and the employment type, in place of the one "Hybrid • Full-time" line. A pill is left out when its value isn't set. | AC-2. | One pill with both words: not the screenshot. |
| Logo tile | A `Briefcase` icon from lucide on an accent-colored rounded square, hidden from screen readers, beside the app name link | AC-11. | An image file: a binary to keep in step with the themes. |
| Theme switch | The same single button, with the same name ("Dark theme" while light, "Light theme" while dark), now showing a sun and a moon in a pill, the current one highlighted | The name and the behavior are spec 010's, and its tests keep passing (AC-11). The highlight shows the current theme without relying on color alone, since the current icon sits on a filled disc. | Two buttons for two themes: changes how it is used. |
| The stage menu | Styled like the other fields, with their border and corners | Found in a screenshot: a plain native select looked out of place beside the pills and buttons (AC-2). | Leaving it native: it didn't match the reference. |
| Layout of an entry | A header row of flex: the text on the left with `min-width: 0` and wrapping, `EntryActions` on the right and not shrinking | AC-12: a long text wraps and the controls stay at the top right. | Absolute positioning: it overlaps long text. |

## Data model

No change. No migration.

## API

No change.

## UI

**`SectionCard`** (new). Props: `title`, `action?`, `children`, and `className?`. It renders `section[aria-labelledby]` with a header holding the `h3` (small, uppercase, muted, with letter spacing) and the action, then the children.

**`EntryActions`** (new). The pencil (Edit) and the ✕ (delete), side by side, each an icon button with a label on hover and focus. Both are `type="button"`. The ✕'s svg is hidden from screen readers.

**`Requirements`** (changed).
- Renders `SectionCard title="Requirements"` with "+ Add" in the heading.
- A line "x/y required met" under it, when there are required ones.
- Rows are a checkbox, the text, a "Nice to have" pill for a preferred one, and `EntryActions` on the right.
- Edit swaps a row for its inline form. Several can be open.
- The add form opens inline above the rows, with Save and Cancel.
- The loading, error, and empty states keep their places, and the empty text becomes "No requirements yet. Use + Add to list the items from the posting."

**`Timeline`** (changed).
- Renders `SectionCard title="Timeline"`.
- The form shows Type, With, and Date in a row (stacking on a narrow page), then "What happened" and the "Log …" button.
- Entries sit on a vertical line. Each has a round icon, its text, a muted line "date · with Name", and `EntryActions`.
- Edit swaps an entry for its inline form, which hides the type for a stage change as today.

**`Contacts`** (changed). Renders `SectionCard title="Contacts"` with "+ Add". Each person shows as in the decisions, with `EntryActions` at the top right. Every change still calls `onChange`, so the timeline reloads its contact choices.

**`ApplicationDetailPage`** (changed).
- Header: back link, avatar and company name, title, pills, and the stage menu, Edit, and Delete.
- Details: the rows are Pay, Location, Source, Posting, Next step (with its due date and "Overdue"), Applied, In stage since, and Closed when set. A missing value shows "–".
- Job description: a `SectionCard`.
- Its `Section` and its private `.detail-section` styles move into `SectionCard`.

**`AppShell` and `ThemeToggle`** (changed). The logo tile beside the link, and the sun/moon pill.

**Styles.** New: `SectionCard.css`, `EntryActions.css`, pill rules, and the timeline's line and icon styles in `Timeline.css`. Changed: `Requirements.css`, `Contacts.css`, `ApplicationDetailPage.css`, `AppShell.css`, `ThemeToggle.css`, and `global.css` (`.icon-button`, `.text-button`, `.visually-hidden`). Only color tokens are used, so both themes work.

## Shared types

No new types. `packages/shared/src/requirements.ts` gains `requiredMetSummary` and loses `requirementsSummary`.

## Test strategy

Tests go in each package's `tests/` folder, mirroring `src/`.

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI, unit | Each of Requirements, Timeline, Details, Contacts, and Job description is a region named by an uppercase-styled heading. `contrast.test.ts` lists the new CSS among the token-only files and checks the text colors they set. A browser check measures rendered contrast in both themes. |
| AC-2 | UI | The header shows the link back, the avatar and name, the title, one pill for each of the work mode and employment type that is set, and none when neither is, plus the stage menu, Edit, and a red Delete. |
| AC-3 | Unit, UI | `requiredMetSummary` counts only required ones and is empty with none. The box shows "0/2 required met", a pill on the preferred one, a checkbox that saves as before, and no section-level Edit and no reordering. |
| AC-4 | UI | In each of the three boxes every entry has an Edit and a ✕, the ✕'s name says what it deletes (with long text cut), both work with Enter and Space, and Tab reaches both. |
| AC-5 | UI | Each ✕ opens the confirmation with today's wording, including the person's mention count. Cancel and Escape delete nothing, and confirming deletes and updates the box. |
| AC-6 | UI | "+ Add" opens the inline form in Requirements and in Contacts and is hidden while it is open. Saving adds and closes, Cancel closes, and neither box shows the form until asked. The last requirement kind is kept. |
| AC-7 | UI | The form shows Type, With, and Date, and the button is named "Log note", "Log email", "Log call", or "Log interview" as the type changes. Rules, messages, and limits are unchanged. |
| AC-8 | UI, unit | Each entry has an icon for its type with the type's name as hidden text, its text, and "date · with Name". A stage change has the arrow and keeps Edit and ✕. The order is unchanged. The icon map has one entry per type. |
| AC-9 | UI | A person shows name, role, an email `mailto:` link, and phone and notes when set. With none, the box shows the new empty text. There is one heading, "Contacts". |
| AC-10 | Unit, UI | `payLine` gives "$85,000 – $95,000/yr", "$85/hr", "From …", "Up to …", and nothing without an amount. `formatDateTime` writes "Oct 1, 2026, 4:53 AM". The Details rows are as listed, with Closed only when set and "–" for a missing value. |
| AC-11 | UI | The header has the logo tile and the name link to the board. The theme switch keeps the names "Dark theme" and "Light theme", still switches with Enter and Space, and marks the current theme. Spec 010's tests pass unchanged. |
| AC-12 | UI, manual | CSS checks that an entry's text wraps and its controls don't shrink. A browser check at 390 pixels wide in both themes: no sideways scroll, no overlap of the controls and a long text, and Details first. |
| AC-13 | UI | The existing behavior tests for the three boxes still pass, with their queries updated for the new names: adding, editing, deleting, ticking, choosing a contact, the loading, empty, and error messages with "Try again", and the timeline reloading after a contact change. |

Tests that change because of the new names: the per-item "Delete" queries (now the ✕'s longer name), the heading "People at …" (now just "Contacts"), the "Add entry", "Add requirement", and "Add contact" button names, and the empty-state texts. They are listed in `tasks.md` as each box is done.

## Risks and mitigations

- **Many existing tests change names.** Mitigation: the shared pieces go in first with their own tests, then one box at a time, each leaving the suite green.
- **Removing the Stage and Time in stage rows from Details.** The stage is still shown, in the menu at the top right of the header, as in the screenshots, but as plain text without its icon and color. Spec 013's AC-14 described the colored icon and name in Details, so its changelog notes the change. Mitigation: the owner chose to match the screenshots.
- **Small ✕ targets on a phone.** Mitigation: a 2rem square target, a gap from Edit, and a browser check at 390 pixels.
- **The theme switch's two icons.** Mitigation: the accessible name stays the same, and the current theme is marked by a filled disc as well as the icon.

## New dependencies

None. `X`, `Briefcase`, `Sun`, `Moon`, and the activity icons all come from `lucide-react`, which is already used.
