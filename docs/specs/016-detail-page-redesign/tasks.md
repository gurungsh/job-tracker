# 016: Detail page redesign (tasks)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Plan    | [plan.md](plan.md) |
| Status  | Implemented        |
| Updated | 2026-10-02         |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

- [x] **T1:** Add `requiredMetSummary(items)` to `packages/shared/src/requirements.ts` with tests: "0/2 required met", only required ones count, a preferred one never does, and an empty string with no required ones. Remove `requirementsSummary` and its tests, and use the new one in `Requirements.tsx` with its summary tests updated (AC-3)
- [x] **T2:** Add `payLine(min, max, period)` to `lib/salary.ts` and `formatDateTime(timestamp)` to `lib/dates.ts`, with tests: "$85,000 – $95,000/yr", "$85/hr", "From $85,000/yr", "Up to $95,000/yr", one amount alone, no period, nothing without an amount, and "Oct 1, 2026, 4:53 AM" (AC-10)
- [x] **T3:** Add `lib/activityIcons.ts`, one lucide icon for each of the five activity types, with a test that every type has one and that a stage change has the arrow (AC-8)
- [x] **T4:** Add the shared styles `.icon-button`, `.text-button`, `.pill`, and `.visually-hidden` to `styles/global.css`, and the `EntryActions` component with its styles and tests: an Edit text button and a ✕ icon button whose name is `Delete …` with the item's text cut at 40 characters, both working with Enter and Space (AC-1, AC-4)
- [x] **T5:** Add `SectionCard` with its styles and tests (a region named by its small uppercase heading, with an optional action beside it), and move the page's `Section` onto it for all five boxes. The look of the cards and their headings change, and nothing else (AC-1)
- [x] **T6:** Rebuild the Requirements box: it renders its own `SectionCard` (the page stops wrapping it), the "x/y required met" line, rows with a checkbox, the text, a "Nice to have" pill on a preferred one, and `EntryActions`. Several rows can be edited at once. "+ Add" in the heading opens the inline form with Save and Cancel, is hidden while the form is open, closes on saving, and keeps the last kind chosen. The empty text becomes "No requirements yet. Use + Add to list the items from the posting." Update the box's tests for the new names (AC-3, AC-4, AC-5, AC-6, AC-13)
- [x] **T7:** Rebuild the Timeline box: it renders its own `SectionCard`, the form shows Type, With, and Date in a row (stacking when narrow) above "What happened" and a button named "Log note", "Log email", "Log call", or "Log interview". Entries hang on a vertical line with a round type icon (with the type's name as hidden text), the text, "date · with Name", and `EntryActions`. Several entries can be edited at once. Update the box's tests for the new names (AC-4, AC-5, AC-7, AC-8, AC-13)
- [x] **T8:** Rebuild the Contacts box: it renders its own `SectionCard` titled "Contacts" with "+ Add" (named "Add contact"), and the "People at …" heading goes. Each person shows name, role, an email `mailto:` link, and phone and notes when set, with `EntryActions` at the top right. The empty text becomes "Nobody recorded yet — add the recruiter or hiring manager you're talking to." Several people can be edited at once, and every change still reloads the timeline's contact choices. Update the box's tests for the new names (AC-4, AC-5, AC-6, AC-9, AC-13)
- [x] **T9:** Rebuild the Details box and the Job description box: the rows are Pay (with `payLine`), Location, Source, Posting, Next step with its due date and "Overdue", Applied, "In stage since" (with `formatDateTime`), and Closed when set, with "–" for a missing value. The Stage and Time in stage rows go. Update the page tests that read them (AC-10)
- [x] **T10:** Rebuild the page header: the link back, the avatar and company name, the title, a pill for each of the work mode and employment type that is set, and the stage menu, Edit, and Delete on the right. Make an entry's text wrap and its controls stay at the top right at any width (AC-2, AC-12)
- [x] **T11:** Restyle the app header: a briefcase logo tile beside the name link, and the theme switch as a sun and a moon in a pill with the current theme marked. It keeps its names "Dark theme" and "Light theme", and spec 010's tests pass unchanged (AC-11)
- [x] **T12:** Add the new styles to `contrast.test.ts`: the files use only color tokens and set text only in colors whose contrast is checked, the ✕'s hover and focus colors are checked pairs, and an entry's text wraps while its controls don't shrink (AC-1, AC-4, AC-12)
- [x] **T13:** Note the redesign in the changelogs of specs 007, 008, 009, 010, and 013, where their criteria describe the always-open add forms, the text Edit and Delete buttons, the box headings, the summary wording, the theme button, or the stage row in Details (Risks in the plan)
- [x] **T14:** Run the browser checks in both themes against the production build, at wide and phone widths, with screenshots of a full page and of an entry's Edit and ✕ and the confirmation, and a Docker image copy, and record them below (AC-1 to AC-13)
- [x] **T15:** Set the spec and plan status to Implemented, and update the specs index and roadmap

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.
- The timeline form's two renamed labels are "With" (the contact, which the earlier specs call Contact) and "What happened" (the text, which they call Text), as spec 016's AC-7 says. The date keeps its label, "Date", since the time of day is spec 017. Several earlier tests changed to the new names, and spec 007's changelog records them.
- `Contacts` no longer takes a `companyName`, since its heading and empty text don't name the company any more.
- The theme button's visible text became text only screen readers see, so its name is unchanged (spec 010, AC-1) and its tests pass as they were.
- `formatDateTime` swaps the narrow no-break space that newer systems put before AM and PM for a plain space, so "Oct 1, 2026, 4:53 AM" reads and matches the same everywhere.
- The ✕ is 2rem square. The app's root font size is 15 pixels, so that is 30 pixels, and the browser checks hold it to at least that.
- The work mode label is "Onsite" in this app, so its pill reads "Onsite", not the screenshot's "On-site".
- The stage menu in the page header got the same border and corners as the other fields, after a screenshot showed it as a plain native select beside them.
- Browser checks were run by the assistant on 2026-10-02 in headless Chromium (Playwright, outside the repo), against the production build on a temporary database, in the light and the dark theme. All 70 checks for this spec passed in each theme (140 in all), and the same 140 passed against a separate copy of the Docker image on port 8099 with its own empty database. The test container and image were removed afterward, and the check scripts are not committed. The scripts for specs 013 (63 checks), 014 (78), and 015 (47) were updated for the new names and run again in both themes, on the build and on the Docker copy, and passed:
  - Each of Requirements, Timeline, Details, Contacts, and Job description is a bordered card with one small, uppercase, muted heading, and text measured at least 4.5 to 1 against its real background in both themes (AC-1).
  - The header showed the avatar, company name, title, a pill for each of the work mode and employment type, and the stage menu, Edit, and a red Delete, in that order. An application with neither set had no pills (AC-2).
  - Requirements showed "0/2 required met", then "1/2" after ticking one. Only the preferred one had "Nice to have", and each row had one Edit and one ✕, with no section-level Edit and no reordering (AC-3).
  - In all three boxes the Edit and ✕ sat at the top right of each entry, the ✕ was 30 pixels square with a gap from Edit, Tab went from Edit to its ✕, and each ✕'s name said what it deletes (AC-4).
  - Each ✕ asked first with the wording from before. Cancel and Escape deleted nothing, and confirming deleted the requirement, the person, and the entry and updated the box (AC-5).
  - "+ Add" sat in the Requirements and Contacts headings, no form showed until asked, it was hidden while the form was open, Cancel closed the form and put focus back on "+ Add", and Save added and closed (AC-6).
  - The timeline form had Type, With, and Date in one row, the placeholder, and a button named Log note, Log email, or Log call. Logging worked (AC-7).
  - Each entry had a round icon with its type's name, a line joined the marks, a stage change had Edit and ✕ too, and the date line read "Oct 1, 2026 · with Priya Shah" (AC-8).
  - A person showed name, role, a mail link, and phone. The box had one heading, "Contacts", and its empty text was the new one (AC-9).
  - Details listed Pay as "$85,000 – $95,000/yr", then Location, Source, Posting, Next step, Applied, and In stage since with a date and time, with "–" for a missing value (AC-10).
  - The header had a logo tile beside the name and a sun and moon with one on a filled disc. The button's name said which theme it would switch to, and Enter and Space switched it (AC-11).
  - At 390 pixels wide, with very long text in a requirement, an entry, and a person, nothing scrolled sideways, every Edit and ✕ stayed on screen and clear of the text, and Details came first in one column (AC-12).
  - Editing a requirement inline worked, two edit forms stayed open at once with the first one's typing kept, and saving updated the requirement (AC-13).
  - No uncaught browser errors and no request left the app.
- The first runs of the new script failed on its own mistakes, not the app's: a heading's text read through its uppercase style, a controlled checkbox that Playwright expects to change at once, an entry read before it appeared, and contacts left over from an earlier run. The app needed no fix from them.
- Not covered in the browser: opening the app on a real phone. The 390 pixel window stands in for it.
- After review, two changes were made on this branch: the page header keeps the stage menu, Edit, and Delete on the title's line until the page is narrower than 34rem, and the Requirements form shows the text and the kind on one line with no visible labels. The text box is one line tall and Enter saves it, as in the owner's screenshot, and the controls keep the names "Text" and "Kind" for screen readers. Spec 016's AC-2 and AC-6 say so.
- A second look at the Requirements form gave the kind menu a width of its own, 11rem with roomy padding, and left the text box the rest of the line, so a long text no longer squeezes the menu. The text box grows to fit its text with a few lines of code, since Firefox doesn't support the CSS that does it.
- After a second review, each entry's Edit became a pencil icon beside the ✕, with a one-word label that shows on hover and on keyboard focus, from a small CSS tooltip. The ✕'s label lines up with its right edge, so the card never cuts it off. Both buttons are named for what they act on, such as "Edit requirement: …", so the per-entry Edit lookups in the tests and browser scripts match `/^Edit /`. The page header's Edit and Delete stay as text, and `+ Add` in a box's heading too.
