# 003: Job details (tasks)

| Field   | Value                                  |
| ------- | -------------------------------------- |
| Spec    | [spec.md](spec.md)                     |
| Plan    | [plan.md](plan.md)                     |
| Status  | Approved                               |
| Updated | 2026-10-01                             |

> Each task should be small enough for one commit and should state which AC it serves.
> Where practical, write the test first, watch it fail, and then make it pass.
> Check off a task only when it's committed and its tests pass.

## Tasks

### Shared

- [x] **T1:** Add `jobDetails.ts` with `WORK_MODES`, `EMPLOYMENT_TYPES`, and `SALARY_PERIODS`, their labels, and `parseDollars()`. Write unit tests for every accepted and rejected form in AC-13, including the edge cases. (AC-13)
- [x] **T2:** Add `normalizeJobLink()` to `jobDetails.ts`. Write unit tests for no scheme, `www.`, `HTTPS://` in capitals, `localhost:3000`, `mailto:`, `ftp://`, and spaces. (AC-4, AC-12)
- [x] **T3:** Extend `applicationInputSchema` and `Application` with the ten fields. This covers preprocessing amounts and the contract length, transforming the job link, and the `superRefine` rules for minimum and maximum, amount and period, and contract length and type. Write unit tests for each rule and message, and check that spec 002's inputs still parse. (AC-7, AC-8, AC-12, AC-13)

### Server

- [x] **T4:** Add migration `0002_add_job_details.sql`. Extend the schema test to check the new columns and their `CHECK` constraints, including running it on a database that already has spec 002 rows. (AC-9)
- [x] **T5:** Read and write the new columns in `store.ts`. Update spec 002's exact-object expectations. Write store and API tests for saving and returning every detail, clearing with `PUT`, an application created before the migration, and 400s for the rules that connect fields. (AC-2, AC-3, AC-8, AC-9)

### Client

- [x] **T6:** Add `salary.ts` with `formatDollars()` and `salarySummary()`. Write unit tests for every phrase in AC-5 and for amounts with no period. (AC-5)
- [x] **T7:** Add the "Job details" section to the side panel: the fields in order, contract length shown only for Contract and cleared when the type changes, saved amounts shown with commas, and the description box. Update the fake test server to keep the details. Write UI tests. (AC-1, AC-2, AC-6, AC-10, AC-13)
- [x] **T8:** Add "Open posting" (normalized link, new tab, hidden when the link is invalid) and the live salary summary. Write UI tests for the link attributes and the summary updating as you type. Write a test that a card with every detail still shows only its spec 002 content. (AC-4, AC-5, AC-11, AC-12)
- [x] **T9:** Write UI tests for validation messages next to the job detail fields (minimum above maximum, missing period, `ftp://` link, and an unreadable amount), with nothing sent. (AC-7)

### Docs

- [x] **T10:** Update the README's "What it does" section and the API field notes, and update the roadmap's 003 row once it's implemented. Check that the Docker image applies migration 0002 to the existing Docker database, and that the sample data survives. (AC-9)

## Verification

- [x] `npm test` passes
- [x] `npm run lint` passes
- [x] `npm run typecheck` passes
- [x] Manual checks from the spec are done and their results noted below

### Manual checks

| Check | AC | Result |
| ----- | -- | ------ |
| In the browser, fill in every job detail with "140k" and "jobs.acme.com/123", save, reload, and reopen. The values are kept, the amounts show as "140,000", and the link has `https://`. | AC-2, AC-12, AC-13 | Pass, 2026-10-01, checked by the owner in the browser. |
| "Open posting" opens the posting in a new tab, and the panel stays as it was | AC-4 | Pass, 2026-10-01, checked by the owner in the browser. |
| The salary summary updates as you type, and a long description scrolls inside its box | AC-5, edge case | Pass, 2026-10-01, checked by the owner in the browser. |
| The existing sample applications open with empty details and save without changes to their dates | AC-9 | Pass, 2026-10-01, checked by the owner in the browser. |

## Notes

Record anything discovered during implementation that changed the plan, and update `plan.md` or `spec.md` to match.

- **T1:** The "k" form also accepts commas, such as "1,500k" and "10,000.5k", so the spec's "10,000.5k" edge case is read as $10,000,500 and then rejected by the limit, as the spec says. `plan.md`'s description of the pattern is updated to match.
- **T2:** Added `isValidJobLink()` next to `normalizeJobLink()`, so the schema and the "Open posting" link use the same check. The shared package's TypeScript settings now include the DOM library for the `URL` type, which exists in both browsers and Node.
- **T3:** The new fields on the `Application` type moved to T5, along with the store change that fills them, so every commit keeps the typecheck passing. The schema's length messages now use commas for large numbers, such as "50,000 characters". Spec 002's messages, all under 1,000, are unchanged.
- **T7:** The form now sends the schema's normalized result, such as `140000` and `"https://jobs.acme.com/123"`, instead of the typed text. The server still accepts typed text and checks everything again, so API callers can use either. The test fake server now normalizes with the real schema too.
- **T10:** Migration 0002 was applied to both databases holding the 11 sample applications. The dev server picked it up when it restarted on a code change. In Docker, every spec 002 field and date was identical before and after, and every job detail was empty. The roadmap's 003 row is marked Implemented at merge time, along with the spec status.
