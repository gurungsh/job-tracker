# 013: Application detail page

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                                 |
| Branch  | `feature/application-detail-page`                      |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [011: Stage colors and richer cards](../011-stage-colors-cards/), [012: Table view](../012-table-view/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

An application's information is split across four tabs in a narrow side panel: details, timeline, contacts, and requirements. I can only see one at a time, the job description is a text box inside a form, and the panel hides the board or table behind it. A page of its own can show everything about one application together, read at a glance, and have an address I can bookmark or share with myself.

## Goals

- Open an application on its own page by clicking a card on the board or a row in the table.
- Show its job details, requirements, timeline, contacts, and job description together on that page, as text to read rather than a form to edit.
- Change the stage, edit the application, or delete it from the page.
- Go back to the board or table I came from, with the table's search, filters, and sort as I left them.
- Remove the side panel. Adding and editing use a dialog instead.

## Non-goals (out of scope)

- Archiving or restoring applications. That stays under "Later, maybe" in the roadmap.
- Editing company details, such as a website. A company is still only a name.
- New fields, or changes to how timeline entries, contacts, or requirements work. They behave as in specs 007, 008, and 009, and only move onto the page.
- Moving the Add button. It stays where it is until the sidebar spec (014).
- Previous and next links between applications.
- Printing or exporting the page.

## User stories

- **US-1:** As a job seeker, I want to click a card or a row and see everything about that application on one page, so that I don't have to switch between tabs.
- **US-2:** As a job seeker, I want to change the stage, edit, or delete the application from its page, so that I can act on it where I'm reading it.
- **US-3:** As a job seeker, I want to go back to the view I came from exactly as I left it, so that I don't lose my place.
- **US-4:** As a job seeker, I want each application to have its own address, so that I can reload or bookmark it.
- **US-5:** As a job seeker, I want to keep adding applications and logging timeline entries, contacts, and requirements, so that nothing I could do before is lost.

## Acceptance criteria

- **AC-1** (US-1, US-4)
  - **Given** the board or the table
  - **When** I click a card or a row
  - **Then** the application's page opens at its own address, and no side panel opens. The page header shows the company name, the job title, and the work mode and employment type, written as on a card.
- **AC-2** (US-1)
  - **Given** an application's page
  - **When** I read it
  - **Then** I see these sections together, with no tabs: Requirements, Timeline, Job description, Details, and Contacts.
- **AC-3** (US-1)
  - **Given** an application's page
  - **When** I read its Details section
  - **Then** it lists the pay, location, source, job link, next step with its due date, applied date, and time in stage. Pay and time in stage are written as on a card (spec 011), and a due date in the past is marked "Overdue". The job link opens the posting in a new tab. A value I never entered shows "–".
- **AC-4** (US-1)
  - **Given** an application with no job description
  - **When** I read its Job description section
  - **Then** it says no description is saved. With a description, it shows the text with its line breaks kept.
- **AC-5** (US-2)
  - **Given** an application's page
  - **When** I choose another stage in the stage menu
  - **Then** the stage changes right away and is saved, the page shows the new stage and time in stage, and the timeline gets the automatic stage-change entry, as when changing the stage in the edit form (spec 007). If saving fails, the page says so and the stage menu shows the saved stage again.
- **AC-6** (US-2)
  - **Given** an application's page
  - **When** I choose Edit
  - **Then** the application form opens in a dialog, filled with its current values, with the same fields, rules, and messages as before (specs 002 and 003). Saving closes the dialog and the page shows the new values. Closing a changed form asks me to confirm first, as before (spec 002, AC-11).
- **AC-7** (US-2, US-3)
  - **Given** an application's page
  - **When** I choose Delete and confirm
  - **Then** the application is deleted with its requirements, timeline entries, and the links from timeline entries to contacts, and I return to the view I came from. Cancelling the confirmation deletes nothing.
- **AC-8** (US-3)
  - **Given** I opened the page from the table with a search, filters, and a sort
  - **When** I choose the link back, press the browser's Back button, or delete the application
  - **Then** I return to the table with the same search, filters, and sort, and an edited application shows its new values there.
- **AC-9** (US-3)
  - **Given** I opened the page from the board
  - **When** I choose the link back, or delete the application
  - **Then** I return to the board. The link reads "Back to board", or "Back to table" when I came from the table.
- **AC-10** (US-4)
  - **Given** I open an application's address directly, in a new tab or after a reload
  - **When** the page loads
  - **Then** I see that application's page, and the link back goes to the board.
- **AC-11** (US-4)
  - **Given** an address for an application that doesn't exist, or whose number isn't valid
  - **When** the page loads
  - **Then** I see a message that the application doesn't exist and a link back to the board, and nothing breaks.
- **AC-12** (US-5)
  - **Given** an application's page
  - **When** I add, edit, or delete timeline entries, contacts, or requirements
  - **Then** each works as it did in the panel's tabs (specs 007, 008, and 009) and saves right away. The counts and lists on the page update without a reload.
- **AC-13** (US-5)
  - **Given** the board or the table
  - **When** I choose Add application
  - **Then** the application form opens in a dialog with the same fields, rules, and messages as before. Saving closes it, and the new application shows on the board and in the table. There is no side panel anywhere in the app.
- **AC-14** (US-1)
  - **Given** either theme
  - **When** I look at the page
  - **Then** it is readable in the light and the dark theme, with each text at a contrast ratio of at least 4.5 to 1, and the stage shows its icon, name, and color as elsewhere (spec 011).
- **AC-15** (US-1)
  - **Given** a narrow screen, such as a phone
  - **When** I look at the page
  - **Then** the sections stack in one column with Details first, and nothing needs sideways scrolling. A very long company name, title, location, or next step wraps rather than running off the screen.
- **AC-16** (US-2)
  - **Given** I use only the keyboard
  - **When** I tab through the page and the dialogs
  - **Then** I can reach the link back, the stage menu, Edit, Delete, and every control in the sections, and use each with Enter or Space. A dialog keeps focus inside it while open, closes with Escape (asking first if the form changed), and returns focus to what opened it.

## Data and rules

- Nothing new is stored. The page shows the application, timeline, contacts, and requirements that already exist.
- Each application's page has its own address, which includes the application's number.
- The page knows which view I came from (the board or the table, with its search, filters, and sort). If it doesn't know, as when I open the address directly, it goes back to the board.
- The stage menu lists the eight stages in board order.
- Deleting an application removes everything that belongs to it, as before. Contacts belong to the company and stay.

## Edge cases

- An application deleted in another tab shows the "doesn't exist" message when its page reloads.
- Changing the stage of an application that was changed elsewhere uses the latest saved version, and the page ends up showing the saved stage.
- Two quick stage changes in a row end with the last one chosen.
- An application with nothing but a company and a job title still shows every section, each saying that it's empty.
- A job link that isn't a valid web address shows as plain text, not a link.
- Pressing the browser's Back button while a dialog is open closes the page's dialog or leaves the page, but never loses what is already saved.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] How does Edit work? **A dialog** with the existing form.
- [x] Where do the back link and delete take me? **The view I came from**, and the board if that's unknown.
- [x] What happens to the side panel? **It is removed entirely.** Adding also uses a dialog.
- [x] Does the page keep logging timeline entries? **Yes**, as the Timeline tab does today.
- [x] Can contacts and requirements still be added, edited, and deleted on the page, as in the tabs today? **Yes** (AC-12).

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Resolved the last open question: contacts and requirements stay editable on the page.
- 2026-10-02: Approved.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
