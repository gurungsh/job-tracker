# 003: Job details (plan)

| Field   | Value                    |
| ------- | ------------------------ |
| Spec    | [spec.md](spec.md)       |
| Status  | Approved                 |
| Updated | 2026-10-01               |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

This spec extends spec 002's patterns. It adds no new ones:

- **Database:** one migration adds nullable columns to `applications`. Existing rows get `NULL` details, so they open empty and save as before (AC-9).
- **Shared:** the shared Zod schema gains the ten fields and the rules that connect them. Two small parsing helpers move into `packages/shared`, so the form, the live salary summary, and the server all read input the same way:
  - `parseDollars`, which reads "140k" and "$140,000" (AC-13)
  - `normalizeJobLink`, which adds `https://` when there's no scheme (AC-12)
- **Server:** the store reads and writes the new columns. The router and the date rules don't change.
- **Client:** the side panel gains a "Job details" section, an "Open posting" link, and a live salary summary. Cards don't change (AC-11).

```
apps/server/migrations/0002_add_job_details.sql
packages/shared/src/
  jobDetails.ts        WORK_MODES, EMPLOYMENT_TYPES, SALARY_PERIODS and their labels,
                       parseDollars(), and normalizeJobLink()
  applications.ts      the schema and the Application type gain the job detail fields
apps/server/src/applications/store.ts   adds the new columns to SELECT, INSERT, and UPDATE
apps/client/src/
  salary.ts            formatDollars() and salarySummary() (AC-5)
  ApplicationPanel.tsx  the "Job details" section, "Open posting", the summary, and clearing the contract length
  styles.css            styles for the section, the summary, and the description box
```

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Where input is normalized | In the shared schema, with `z.preprocess` for salary amounts and a transform for the job link | The form and the server accept the same inputs (AC-7, AC-8, AC-12, AC-13), and the API also takes plain numbers, so it's easy to call with curl. | Normalizing only in the form, which would make the API stricter than the form for no reason |
| Salary parsing | `parseDollars(text)`: trim, then match an optional `$`, a whole number written as plain digits or with commas every three digits, and then either nothing (dollars) or up to three decimal places and a `k` in either case (thousands). The math uses integers. Anything else returns `undefined`. | It covers exactly the forms in AC-13 and avoids floating-point surprises ("92.5k" becomes 92500). | Stripping every non-digit character, which would turn "140.5" into 1405 |
| Detecting a scheme on a link | A link has a scheme when it matches `^[a-z][a-z0-9+.-]*:` and the colon isn't followed by a digit. `https://` is added only when there's no scheme. | "mailto:x" and "ftp://x" keep their schemes and are rejected. "localhost:3000/x" and "jobs.acme.com/1" get `https://`. | Prefixing every link that doesn't start with `http`, which would turn "mailto:x" into "https://mailto:x" |
| Link validation | `new URL()` must accept it, its protocol must be `http:` or `https:`, and it's at most 2,000 characters. The **typed** link (with the scheme added) is stored, not `URL.href`. | It's the standard parser. Storing the typed string keeps "exactly as I entered" (AC-2), because `URL.href` changes it, for example by adding a trailing `/`. | A regular expression for URLs |
| Rules that connect fields | A `superRefine` on the object adds these errors to the field that needs fixing (AC-7, AC-8): <br>• the minimum is above the maximum (`salaryMin`) <br>• an amount without a period, or a period without an amount (`salaryPeriod`) <br>• a contract length when the type isn't Contract (`contractLengthMonths`) | The existing `fieldErrors()` puts them next to the right field without changes. | A separate validation step outside the schema |
| Stored values | `work_mode`, `employment_type`, and `salary_period` are lowercase ids (`full_time`) checked by `CHECK` constraints. Amounts and the contract length are `INTEGER`. | The same approach as `stage` in spec 002. | |
| Contract length when the type changes | The form hides the field and sets its value to `""` when the employment type changes away from Contract (AC-6). The server rejects a contract length that comes without Contract. | It satisfies AC-6 in the form and AC-8 on the server. | Having the server silently drop it, which would hide a mistake from someone calling the API |
| Showing saved amounts | When the panel opens, it formats saved amounts with commas ("140,000"), which `parseDollars` reads back the same way. | AC-13 "Reopening shows the amount with commas". The unsaved-changes check still works, because an unchanged form compares equal to its starting values. | Showing raw digits |
| Salary summary | `salarySummary(min, max, period)` returns the text from AC-5. Without a period, it shows just the amounts ("$140,000–$170,000"), and with no valid amount it shows nothing. It's computed from the typed text on every render. | Live feedback while typing (AC-5), using the same parser as saving. | Showing the summary only after saving |
| "Open posting" | An `<a target="_blank" rel="noopener noreferrer">` to `normalizeJobLink(typed)`, shown only when that link is valid (AC-4, AC-12) | The browser opens a new tab, and the panel stays as it was. `noopener` keeps the posting page from controlling this tab. | `window.open` |
| Description box | A `<textarea rows={8}>` that can grow up to 24rem and then scrolls | The description edge case. Long text doesn't push the Save button out of reach, because the panel body already scrolls. | A text box that grows without limit |

## Data model

`apps/server/migrations/0002_add_job_details.sql`:

```sql
ALTER TABLE applications ADD COLUMN job_link TEXT;
ALTER TABLE applications ADD COLUMN location TEXT;
ALTER TABLE applications ADD COLUMN work_mode TEXT CHECK (work_mode IN ('onsite', 'hybrid', 'remote'));
ALTER TABLE applications ADD COLUMN employment_type TEXT CHECK (employment_type IN ('full_time', 'contract', 'part_time'));
ALTER TABLE applications ADD COLUMN contract_length_months INTEGER CHECK (contract_length_months BETWEEN 1 AND 120);
ALTER TABLE applications ADD COLUMN salary_min INTEGER CHECK (salary_min BETWEEN 0 AND 10000000);
ALTER TABLE applications ADD COLUMN salary_max INTEGER CHECK (salary_max BETWEEN 0 AND 10000000);
ALTER TABLE applications ADD COLUMN salary_period TEXT CHECK (salary_period IN ('annual', 'hourly'));
ALTER TABLE applications ADD COLUMN source TEXT;
ALTER TABLE applications ADD COLUMN job_description TEXT;
```

Every column is nullable, so existing rows are valid unchanged (AC-9). Rules that connect fields, such as the minimum not exceeding the maximum, are enforced by the shared schema, as length limits are in spec 002.

## API

No new endpoints. `POST /api/applications` and `PUT /api/applications/:id` accept the new fields, and `GET /api/applications` returns them. Invalid details produce the same `400` with `fields` as spec 002 (AC-8).

| Field (JSON) | Accepted input | Stored and returned as |
| ------------ | -------------- | ---------------------- |
| `jobLink` | A string or `null`. `https://` is added if the scheme is missing. | A string or `null` |
| `location`, `source`, `jobDescription` | A string or `null`, trimmed | A string or `null` |
| `workMode` | `"onsite"`, `"hybrid"`, `"remote"`, `""`, or `null` | One of those, or `null` |
| `employmentType` | `"full_time"`, `"contract"`, `"part_time"`, `""`, or `null` | One of those, or `null` |
| `contractLengthMonths` | An integer, a string of digits, `""`, or `null` | A number or `null` |
| `salaryMin`, `salaryMax` | A number, a string in any form from AC-13, `""`, or `null` | A number (whole dollars) or `null` |
| `salaryPeriod` | `"annual"`, `"hourly"`, `""`, or `null` | One of those, or `null` |

Every field is optional in the request, so existing clients and spec 002's tests keep working.

## UI

The side panel adds a "Job details" `<fieldset>` with a `<legend>`, below the applied date and above the save error (AC-1):

1. **Job link:** a text input. "Open posting ↗" appears beside its label when the link is valid (AC-4).
2. **Location:** a text input.
3. **Work mode:** a select with "—" for none, Onsite, Hybrid, and Remote.
4. **Employment type:** a select with "—" for none, Full-time, Contract, and Part-time. Changing it away from Contract clears the contract length (AC-6).
5. **Contract length (months):** a numeric text input, shown only for Contract.
6. **Salary minimum and maximum:** two text inputs side by side, using `inputMode="decimal"` so phones show a number keypad that still allows "k".
7. **Salary period:** a select with "—" for none, Annual, and Hourly.
8. **Salary summary:** a line with `aria-live="polite"`, so screen readers announce changes (AC-5).
9. **Source:** a text input.
10. **Job description:** a large `<textarea>`.

Errors use the existing `Field` component, so they show next to each field (AC-7).

## Shared types

- `jobDetails.ts`:
  - `WORK_MODES`, `EMPLOYMENT_TYPES`, and `SALARY_PERIODS`, with their label maps
  - the `WorkMode`, `EmploymentType`, and `SalaryPeriod` types
  - `parseDollars()` and `normalizeJobLink()`
- `Application` gains:
  - `jobLink`, `location`, `source`, and `jobDescription` (`string | null`)
  - `workMode`, `employmentType`, and `salaryPeriod` (their types, or `null`)
  - `contractLengthMonths`, `salaryMin`, and `salaryMax` (`number | null`)
- `ApplicationInput` gains the same fields, all optional, through the schema.

## Test strategy

| AC | Level | What it checks |
| -- | ----- | -------------- |
| AC-1 | UI | The "Job details" group has its fields in order. Contract length appears only for Contract. |
| AC-2, AC-3 | API and UI | API: every detail round-trips through `POST` and then `GET`, and clearing a field with `PUT` stores `null`. UI: filling in every detail sends them all, and reopening shows them. |
| AC-4, AC-12 | Unit and UI | Unit: `normalizeJobLink` cases ("jobs.acme.com/1", "HTTPS://x", "localhost:3000/x", "mailto:x", "ftp://x", and spaces). UI: "Open posting" has the normalized `href`, `target="_blank"`, and `rel="noopener noreferrer"`, and is hidden when the link is empty or invalid. |
| AC-5 | Unit and UI | Unit: `salarySummary` gives every phrase in AC-5, plus amounts with no period. UI: the summary updates as you type. |
| AC-6 | UI | Switching from Contract hides the contract length and doesn't send it. |
| AC-7 | Unit and UI | Unit: each schema rule and its message. UI: the messages appear next to the fields, and nothing is sent. |
| AC-8 | Unit and API | A contract length without Contract, a minimum above the maximum, mismatched amounts and period, `ftp://`, and over-limit values all return 400 with `fields`. |
| AC-9 | API | A row created before the migration (inserted with only spec 002's columns) is listed with `null` details and can be updated without them. |
| AC-10 | UI | Changing only a job detail and closing asks for confirmation. |
| AC-11 | UI | A card for an application with every detail still shows only company, title, next step, and due date. |
| AC-13 | Unit and UI | Unit: `parseDollars` accepts and rejects the examples in AC-13 and the edge cases. UI: "140k" is saved as 140000 and shown as "140,000" when reopened. |

The real migrations are run in the existing schema test, which is extended to check the new columns and `CHECK` constraints.

## Risks and mitigations

- **Spec 002's tests use exact objects.** Some API and store tests compare whole `Application` objects. Their expected values gain the new `null` fields, which is a mechanical change done in the same task as the store change.
- **`ALTER TABLE ... CHECK` on a STRICT table:** SQLite allows adding a column with a `CHECK` constraint as long as existing rows pass it, and they do, because they're `NULL`. This is checked against a database migrated with only spec 002's migration.
- **Panel length:** the panel nearly doubles in height. Its body already scrolls, and the Save button stays pinned in the footer.

## New dependencies

None.
