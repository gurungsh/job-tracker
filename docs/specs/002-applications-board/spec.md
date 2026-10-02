# 002: Applications board

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                            |
| Branch  | `feature/applications-board`                           |
| Created | 2026-10-01                                             |
| Updated | 2026-10-01                                             |
| Depends | [000: Project foundation](../000-project-foundation/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The app runs but tracks nothing yet. This is the first slice that makes it useful: I can record the jobs I'm interested in or have applied to, see at a glance what stage each one is at, and see what I need to do next and by when. The board replaces the spreadsheet or memory I'd otherwise rely on.

## Goals

- Add, view, edit, and delete applications, each with a company, a job title, a stage, and a next step with a due date.
- See every application on a board with one column per stage.
- Change an application's stage from its form, with the applied, closed, and stage-changed dates kept automatically.
- Keep companies as names that are reused across applications, without managing them separately.

## Non-goals (out of scope)

- The job details: link, location, work mode, employment type and contract length, salary, source, and description (spec 003).
- Drag and drop on the board, or reordering cards by hand (spec 005).
- The activity timeline, including stage-change history entries (spec 006). This spec keeps only the current stage-changed date.
- Contacts (spec 007) and requirements (spec 008).
- A company screen, or renaming, merging, or deleting companies.
- Archiving, search, filtering, or a "what's next" view.
- Currencies other than USD.

## User stories

- **US-1:** As a job seeker, I want to add an application with just a company and a job title, so that capturing a lead takes seconds.
- **US-2:** As a job seeker, I want what I enter to be saved exactly and checked for mistakes, so that I can trust what the board shows.
- **US-3:** As a job seeker, I want to see all my applications on a board grouped by stage, so that I know where everything stands.
- **US-4:** As a job seeker, I want each card to show the next step and its due date, with overdue ones highlighted, so that I know what to do next.
- **US-5:** As a job seeker, I want to change an application's stage and have the important dates recorded for me, so that I know when I applied, when it closed, and how long it has been in its current stage.
- **US-6:** As a job seeker, I want to edit or delete an application, so that the board stays accurate.
- **US-7:** As a job seeker, I want company names suggested as I type, so that the same company isn't entered twice under different spellings.

## Acceptance criteria

### Board

- **AC-1** (US-3)
  - **Given** I open the app
  - **When** the board loads
  - **Then** I see eight columns in this order: Wishlist, Applied, Screening, Interviewing, Offer, Accepted, Rejected, and Withdrawn. Accepted, Rejected, and Withdrawn are narrower than the others. Each column header shows its count of applications.
- **AC-2** (US-3)
  - **Given** there are no applications
  - **When** the board loads
  - **Then** the columns are empty, and the board shows a message inviting me to add my first application.
- **AC-3** (US-4)
  - **Given** an application has a company, a job title, a next step, and a next step due date
  - **When** I look at its card
  - **Then** the card shows the company, the job title, the next step, and the due date. If the due date is before today, it's highlighted as overdue.
- **AC-4** (US-3)
  - **Given** a column has several applications
  - **When** the board loads
  - **Then** the cards are ordered by next step due date, soonest first. Cards with no due date come after them, most recently added first.
- **AC-5** (US-3)
  - **Given** the server can't be reached or returns an error
  - **When** the board loads
  - **Then** the board shows an error message with a way to try again, instead of an empty board.

### Adding

- **AC-6** (US-1)
  - **Given** I'm on the board
  - **When** I choose to add an application, enter only a company and a job title, and save
  - **Then** the side panel closes, and a new card appears in the Wishlist column.
- **AC-7** (US-1)
  - **Given** the add form is open
  - **When** I try to save without a company or without a job title (blank or only spaces)
  - **Then** the application isn't saved, and the form says which field is missing.
- **AC-8** (US-2)
  - **Given** the add form is open
  - **When** I fill in every field (company, job title, stage, next step, and next step due date) and save
  - **Then** opening the application again shows every value exactly as I entered it, including after reloading the page.

### Viewing and editing

- **AC-9** (US-6)
  - **Given** an application exists
  - **When** I click its card
  - **Then** a side panel opens over the board, showing all its fields in an editable form, plus its applied, closed, and stage-changed dates.
- **AC-22** (US-5)
  - **Given** an application entered its current stage on a past or present date
  - **When** I open its side panel
  - **Then** the panel shows how long it has been in that stage, counted in whole calendar days: "In Screening since today", "In Screening for 1 day", or "In Screening for 12 days".
- **AC-10** (US-6)
  - **Given** the side panel is open for an application
  - **When** I change fields and save
  - **Then** the card updates on the board, and the changes are still there after reloading the page.
- **AC-11** (US-6)
  - **Given** I've changed fields in the side panel without saving
  - **When** I close the panel
  - **Then** I'm asked to confirm before the changes are thrown away.

### Stages and dates

- **AC-12** (US-5)
  - **Given** an application is in one stage
  - **When** I change its stage in the side panel and save
  - **Then** the card moves to the new column, and the stage-changed date is set to now.
- **AC-13** (US-5)
  - **Given** an application has no applied date
  - **When** it is saved in Applied or any later stage (Screening through Withdrawn), including when it's first added
  - **Then** its applied date is set to today. Once set, the applied date isn't changed by later stage changes, including a move back to Wishlist, but I can edit it.
- **AC-14** (US-5)
  - **Given** an application is open (Wishlist through Offer)
  - **When** it is saved in Accepted, Rejected, or Withdrawn
  - **Then** its closed date is set to today. If it later moves back to an open stage, the closed date is cleared.
- **AC-15** (US-5)
  - **Given** I save an application without changing its stage
  - **When** the save completes
  - **Then** the stage-changed, applied, and closed dates are unchanged (unless I edited the applied date myself).

### Deleting

- **AC-16** (US-6)
  - **Given** the side panel is open for an application
  - **When** I choose to delete it
  - **Then** I'm asked to confirm, in a dialog naming the company and job title. Confirming removes the card permanently, and canceling changes nothing.

### Companies

- **AC-17** (US-7)
  - **Given** a company named "Acme Corp" exists
  - **When** I type "acm" in the company field
  - **Then** "Acme Corp" is suggested, and picking it fills in the field.
- **AC-18** (US-7)
  - **Given** a company named "Acme Corp" exists
  - **When** I save an application with the company "acme corp" or " Acme Corp "
  - **Then** the application is linked to the existing "Acme Corp", and no new company is created.
- **AC-19** (US-7)
  - **Given** no company named "Globex" exists
  - **When** I save an application with the company "Globex"
  - **Then** the company is created and linked, and it's suggested the next time I type it.

### Validation

- **AC-20** (US-2)
  - **Given** the add or edit form is open
  - **When** I enter values that break the rules in "Data and rules" (for example, a job title longer than 200 characters, or a next step longer than 500)
  - **Then** the application isn't saved, and the form explains what to fix next to the field.
- **AC-21** (US-2)
  - **Given** a request reaches the server directly, without going through the form
  - **When** it breaks any rule in "Data and rules"
  - **Then** the server rejects it with an error that names the invalid fields, and nothing is saved.

## Data and rules

**Company**
- Has a name, required, 1–200 characters after trimming spaces at both ends. Names are unique, ignoring case. The name is kept as first entered.
- A company that no longer has any applications is kept, so it's still suggested.

**Application**

| Field | Required | Rules |
| ----- | -------- | ----- |
| Company | Yes | A company name, matched or created as in AC-18 and AC-19. |
| Job title | Yes | 1–200 characters after trimming. |
| Stage | Yes | One of the eight stages. Defaults to Wishlist. |
| Next step | No | Up to 500 characters. |
| Next step due date | No | A calendar date (no time). It can be set without a next step. |
| Applied date | Automatic | Set as in AC-13. Editable, and can be cleared. |
| Closed date | Automatic | Set and cleared as in AC-14. Not editable. |
| Stage-changed date and time | Automatic | Set when the application is added and when its stage changes (AC-12). Not editable. |
| Added and updated date and time | Automatic | Kept for ordering (AC-4) and for later specs. |

- "Today" and "overdue" use the local date on my computer.
- Text fields are trimmed at both ends, and an empty optional field is stored as empty, not as a blank string.
- Open stages are Wishlist, Applied, Screening, Interviewing, and Offer. Closed stages are Accepted, Rejected, and Withdrawn.

## Edge cases

- A very long job title, company name, or next step: the card shows it shortened with an ellipsis, and the full text is in the side panel.
- Two applications at the same company with the same job title are allowed. They are separate applications, for example a reapplication.
- Saving fails because the server can't be reached: the panel stays open with my input intact, and shows an error.
- A due date of today isn't overdue. A due date of yesterday is.
- An application is changed straight from Wishlist to Rejected: the applied date and closed date are both set to today.
- An application moves from Applied back to Wishlist: it keeps its applied date, and the stage-changed date is reset.
- The board is narrower than the eight columns: it scrolls sideways, and the columns keep a usable width.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should the side panel show how long the application has been in its current stage? **Yes.** Added AC-22.
- [x] Should moving back to Wishlist clear the applied date? **No.** Added to AC-13 and the edge cases.
- [x] Are the limits in "Data and rules" sensible? **Yes,** as written.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved open questions: show days in the current stage (AC-22), keep the applied date when moving back to Wishlist, and keep the limits as drafted.
- 2026-10-01: Split the job details (link, location, work mode, employment type and contract length, salary, source, and description) into spec 003 to keep this spec smaller. US-2, AC-8, and AC-20 are reworded to match, and the later specs are renumbered.
- 2026-10-01: Approved.
- 2026-10-01: Implementation started.
- 2026-10-01: Implemented and reviewed by the owner.
- 2026-10-02: Spec 011 added to the board cards: a company badge, a line with location, work mode, and employment type, the pay, a stage badge, and the time in stage. Where this spec says cards show only the earlier content, spec 011's content is now expected too. Nothing else about the cards changed.
- 2026-10-02: Spec 012 adds a table view beside the board, with a Kanban/Table switch. The board is still what opens first, and the side panel opens over either view. Where this spec says the board is the only view, the table is now there too. Nothing else about the board changed.
- 2026-10-02: Spec 013 replaced the side panel. A card now opens the application's own page, where the stage, Edit, and Delete are, and adding or editing uses a dialog with the same fields, rules, and messages. Where this spec says the side panel, read the page or the dialog. AC-11 (asking before closing a changed form) applies to the dialog. Nothing else changed.
