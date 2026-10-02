# 011: Stage colors and richer cards (tasks)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Plan    | [plan.md](plan.md) |
| Status  | Implemented      |
| Updated | 2026-10-02         |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

- [x] **T1:** Add the pure helpers with tests: `companyInitials`, `companyHue`, `compactSalary`, and the short time-in-stage text (AC-4, AC-5, AC-7, AC-9)
- [x] **T2:** Add the `[data-stage]` color tokens, and extend the contrast test to the stage colors and the initials badge in all 12 hues (AC-1, AC-5, AC-11)
- [x] **T3:** Install `lucide-react` in `apps/client`, and add `lib/stageIcons.ts` with a test that all eight icons differ (AC-1)
- [x] **T4:** Add `StageBadge` and `CompanyAvatar` with their styles and tests (AC-2, AC-3, AC-5)
- [x] **T5:** Give each board column its stage color and icon in the header (AC-1)
- [x] **T6:** Rebuild the card: avatar and company, details line, compact pay, next step, and footer with badge and time in stage (AC-3, AC-6, AC-7, AC-8, AC-9, AC-13)
- [x] **T7:** Update the existing card and board tests for the new content, and confirm drag, click, and panel tests pass (AC-8, AC-10)
- [x] **T8:** Note the card change in the changelogs of specs 003, 007, 008, and 009, where their criteria say cards are unchanged (AC-8)
- [x] **T9:** Run the browser checks in both themes against the production build and a Docker image copy, and record them below (AC-1 to AC-13)
- [x] **T10:** Set the spec status to Implemented, and update the specs index and roadmap
- [x] **T11:** After review, remove the stage badge from board cards, and amend the spec, plan, tests, and browser checks to match (AC-2, AC-9, AC-10)

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Browser checks from the spec are done and their results noted below

## Notes

- Two stage colors were slightly too pale in the light theme once the contrast test covered them: Offer and Withdrawn were darkened. Everything else in the palette passed as first chosen. A yellow badge hue needed darker initials in the light theme for the same reason.
- The `[data-stage]` rules use `light-dark()`, which works because spec 010 sets `color-scheme` per theme. No separate dark rules were needed.
- The first-pass wording for the initials fallback said "?" for a name with no letters or digits, which contradicted the emoji edge case. The spec now says "?" only when there is nothing to take an initial from.
- The built script grew from about 331 kB to about 352 kB (the nine icons, the card pieces, and the theme code from spec 010). `lucide-react` is imported by name, so unused icons aren't included.
- The older specs' changelogs (002, 003, 006, 007, 008, 009) now note that spec 011 adds to the cards. The one test that pinned the old card text (`JobDetails.test.tsx`, spec 003's AC-11) now checks the new summary line and pay, and still checks that the link, source, and description never appear on a card.
- Browser checks were run by the assistant on 2026-10-02 in a real headless Chromium (Playwright, outside the repo), against the production build and a separate test copy of the Docker image on port 8099, each in the light and the dark theme. All 12 checks passed for each of the four runs:
  - Eight columns each show their own icon, name, count, and color, with one neutral column background (AC-1).
  - A card's stage badge matches its column's color, on a tint (AC-2).
  - The initials badge comes first, with "BA", "HD", and "M" for the test companies (AC-3, AC-4), and "Acme Corp" and "ACME CORP" get the same color, also after a reload (AC-5).
  - The details line, the short pay forms ("$140k–$170k/yr", "$85–$95/hr", "From $92,500/yr"), and their absence for a card with nothing to show (AC-6, AC-7). Next step, due date, and the overdue marker are unchanged (AC-8).
  - The footer's stage badge, clock, "Today", and its "Time in this stage" tooltip (AC-9).
  - Every stage title, count, badge, and badge initials measured at least 4.5 to 1 against its real background in both themes (AC-11).
  - No request left the app (AC-12), and a card with very long text stayed inside its column with the company and title cut by an ellipsis (AC-13).
  - A real mouse drag and a stage change in the panel both moved the card, and the badge and its color followed (AC-10). No uncaught browser errors.
  - The earlier browser checks still pass: 18 for the timeline, 12 for requirements, and 9 for themes. For contacts, 16 of 17 pass, and the 17th expects exactly three tabs, which spec 009 changed.
- Not covered in the browser: "5 days" and "1 day" in the footer, because the server sets the stage date to now. Unit and component tests cover them. The check script is not committed.
Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

### Amendment: stage badge removed from board cards (2026-10-02)

- After review, the stage badge on every card was dropped: every card in a column repeated that column's stage. AC-2, AC-9, and AC-10 in the spec, and the matching parts of the plan, were reworded. The notes and browser results above describe the first version, with the badge, and are kept as history.
- The card's footer now holds only the clock and the time in stage. `StageBadge` and its test stay for the table view (spec 012). Nothing else used the badge or the footer.
- Browser checks were rerun by the assistant against the production build and a test copy of the Docker image, in both themes. All 12 checks passed on each of the four runs, with the changed ones now checking that:
  - no card shows a stage badge, and none of a card's parts (apart from its job title) repeats its column's stage name (AC-2);
  - the footer holds one thing, the clock and "Today" with its tooltip (AC-9);
  - a card dragged to another column, or moved with the stage field in the panel, lands in the new column, shows "Today", and has no badge (AC-10).
- The earlier browser checks still pass: 18 for the timeline, 12 for requirements, and 9 for themes. For contacts, 16 of 17 pass, and the 17th expects exactly three tabs, which spec 009 changed.
