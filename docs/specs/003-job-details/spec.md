# 003: Job details

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                            |
| Branch  | `feature/job-details`                                  |
| Created | 2026-10-01                                             |
| Updated | 2026-10-01                                             |
| Depends | [002: Applications board](../002-applications-board/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

Spec 002 tracks where each application stands, but not what the job is. To compare offers, prepare for interviews, or remember why a job looked interesting, I still have to go back to the posting, which may have been taken down. This spec keeps the job's details with the application.

## Goals

- Record each application's job link, location, work mode, employment type and contract length, salary range, source, and job description.
- Open the posting from the side panel.
- Read the salary range at a glance as a formatted summary.
- Keep the board's cards exactly as they are.

## Non-goals (out of scope)

- Showing any job details on board cards, or filtering or sorting by them.
- Currencies other than USD, or salary converted between annual and hourly.
- Fetching details from a job link automatically.
- Formatted (rich text or Markdown) job descriptions. The description is plain text.
- Benefits, equity, bonuses, or other pay beyond the base salary range.

## User stories

- **US-1:** As a job seeker, I want to record a job's link, location, work mode, and where I found it, so that I have the key facts without going back to the posting.
- **US-2:** As a job seeker, I want to record the employment type, and the length of a contract, so that I can tell full-time roles from contracts.
- **US-3:** As a job seeker, I want to record the salary range and see it in a readable form, so that I can compare jobs.
- **US-4:** As a job seeker, I want to keep the job description, so that I still have it if the posting is taken down.
- **US-5:** As a job seeker, I want to open the posting from the application, so that I can check it quickly.
- **US-6:** As a job seeker, I want mistakes in these fields caught, so that the details stay trustworthy.

## Acceptance criteria

- **AC-1** (US-1 to US-4)
  - **Given** I open the side panel to add or edit an application
  - **When** I look below the fields from spec 002
  - **Then** I see a "Job details" section with: job link, location, work mode, employment type, contract length (only when the type is Contract), salary minimum, salary maximum, salary period, source, and job description, in that order. The description is a large text box at the end.
- **AC-2** (US-1 to US-4)
  - **Given** the side panel is open
  - **When** I fill in every job detail and save
  - **Then** opening the application again shows every value exactly as I entered it, including after reloading the page.
- **AC-3** (US-1 to US-4)
  - **Given** an application has job details
  - **When** I change or clear some of them and save
  - **Then** the changes are kept after reloading, and cleared fields stay empty.
- **AC-4** (US-5)
  - **Given** the job link field holds a valid web address
  - **When** I choose "Open posting"
  - **Then** the posting opens in a new browser tab, and the side panel stays as it was. When the field is empty or invalid, "Open posting" isn't shown.
- **AC-5** (US-3)
  - **Given** I enter a salary
  - **When** I look at the salary fields
  - **Then** a summary under them shows the range as I type:
    - Both amounts: "$140,000–$170,000 per year"
    - Minimum only: "From $140,000 per year"
    - Maximum only: "Up to $170,000 per year"
    - Hourly: "$85–$95 per hour"
    - Equal amounts: "$150,000 per year"
- **AC-6** (US-2)
  - **Given** the employment type is Contract and a contract length is entered
  - **When** I change the employment type to anything else, or clear it
  - **Then** the contract length field is hidden and its value is cleared, so it isn't saved.
- **AC-7** (US-6)
  - **Given** the side panel is open
  - **When** I try to save with any of these:
    - a minimum salary above the maximum
    - a salary amount without a period
    - a period without any salary amount
    - a job link that isn't a web address, or uses a scheme other than `http` or `https` (such as `ftp://` or `mailto:`)
    - a salary amount that can't be read as whole dollars (see AC-13)
    - any value outside the limits in "Data and rules"
  - **Then** the application isn't saved, and the form explains what to fix next to the field.
- **AC-8** (US-6)
  - **Given** a request reaches the server directly, without going through the form
  - **When** it breaks any rule in "Data and rules", including a contract length when the type isn't Contract
  - **Then** the server rejects it with an error that names the invalid fields, and nothing is saved.
- **AC-9** (US-1 to US-4)
  - **Given** applications that were created before this spec
  - **When** I open one
  - **Then** its job details are empty, and I can save it without filling them in. Its other fields, dates, and stage are unchanged.
- **AC-10** (US-6)
  - **Given** I've changed only job details in the side panel without saving
  - **When** I close the panel
  - **Then** I'm asked to confirm before the changes are thrown away, as in spec 002 (AC-11).
- **AC-11**
  - **Given** applications with job details
  - **When** I look at the board
  - **Then** the cards show only what they showed in spec 002: company, job title, next step, and due date.
- **AC-12** (US-5)
  - **Given** I enter a job link without a scheme, such as "jobs.acme.com/123" or "www.acme.com/careers/42"
  - **When** I save
  - **Then** it's saved as "https://jobs.acme.com/123", and reopening the application shows the link with `https://`. "Open posting" uses the same address, including while I'm still typing.
- **AC-13** (US-3)
  - **Given** I type a salary amount
  - **When** I save
  - **Then** it's read as whole US dollars, accepting these forms:
    - Plain digits: "140000" → 140,000
    - Commas: "140,000" → 140,000
    - A dollar sign: "$140,000" → 140,000
    - A "k" for thousands, in either case, with up to three decimal places: "140k" → 140,000, "92.5K" → 92,500

    Anything else, such as "140.5", "1.5m", or "about 140k", is an error. Reopening the application shows the amount with commas, such as "140,000". The summary in AC-5 reads the amounts the same way while I type.

## Data and rules

All job details are optional.

| Field | Rules |
| ----- | ----- |
| Job link | An `http` or `https` web address, up to 2,000 characters. A link with no scheme gets `https://` added (AC-12). |
| Location | Free text, up to 200 characters. For example, "Austin, TX" or "Remote (US)". |
| Work mode | Onsite, Hybrid, or Remote. |
| Employment type | Full-time, Contract, or Part-time. |
| Contract length | Whole months, 1–120. Allowed only when the employment type is Contract. |
| Salary minimum and maximum | Whole US dollars, 0–10,000,000, typed in any form from AC-13. Either can be given alone. When both are given, the minimum is no greater than the maximum. |
| Salary period | Annual or Hourly. Required when either salary amount is given, and not allowed otherwise. |
| Source | Where I found the job. Free text, up to 200 characters. For example, "LinkedIn" or "referral from Sam". |
| Job description | Free text, up to 50,000 characters. Line breaks are kept. |

- Text fields are trimmed at both ends, and an empty field is stored as empty, as in spec 002.
- Saving job details follows spec 002's rules for everything else. For example, editing details without changing the stage doesn't change the stage dates.

## Edge cases

- A long job description: the side panel scrolls, and the description box grows up to a set height and then scrolls on its own.
- A salary of $0 is allowed (for example, an unpaid trial) and shows as "$0 per year".
- A job link that is valid but leads nowhere still opens in a new tab. The app doesn't check that it works.
- Pasting a description with leading or trailing blank lines: they're trimmed, and line breaks in the middle are kept.
- A link that already starts with `HTTPS://` (in capitals) is kept as is, and no second scheme is added.
- A salary of "10,000.5k" works out to $10,000,500, which is above the limit, so it's an error.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should the salary boxes accept "140,000" and "140k"? **Yes.** Added AC-13.
- [x] Should a job link without `https://` have it added automatically? **Yes.** Added AC-12.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved open questions: salary amounts accept commas, a dollar sign, and "k" (AC-13), and links without a scheme get `https://` (AC-12).
- 2026-10-01: Approved.
- 2026-10-01: Implementation started.
- 2026-10-01: Implemented.
- 2026-10-02: Spec 011 added to the board cards: a company badge, a line with location, work mode, and employment type, the pay, a stage badge, and the time in stage. Where this spec says cards show only the earlier content, spec 011's content is now expected too. Nothing else about the cards changed.
- 2026-10-02: Spec 013 replaced the side panel. The job details are written as text on the application's page, and the same fields are edited in the add and edit dialog, with the same rules and messages. Where this spec says the side panel, read the dialog. Nothing else changed.
