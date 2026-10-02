# 017: Archive, company website, and entry times

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented |
| Branch  | `feature/archive-website-entry-times`                  |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [016: Detail page redesign](../016-detail-page-redesign/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

Applications that are finished or stale stay on the board and in the table and counts forever. Rejected and Withdrawn are real outcomes I want to keep, but after a while they crowd out the live search, and deleting them loses the history. A company's website is something I look up often, and today I have to search for it. And a call or interview happens at a time, but a timeline entry records only the day.

## Goals

- Archive an application to hide it from the board, the table, and the stage counts, and find it again under an **Archived** entry in the sidebar.
- Restore an archived application to where it was.
- Give a company a website, set from the application's form, and show the company's name on the detail page as a link to it.
- Record an optional time of day on a timeline entry, shown beside its date.

## Non-goals (out of scope)

- Marking an entry as upcoming or scheduled, or reminding me of one. The timeline stays a log. Future dates were already allowed (spec 007).
- A time on the next step's due date, or on any date other than a timeline entry's.
- Archiving automatically, such as after a number of days in a closed stage.
- Archiving several applications at once.
- A separate company details screen. A company's website is edited in an application's form.
- Linking company names from cards, rows, or the sidebar. Only the detail page links.
- Fetching a company's website or logo from the internet.

## User stories

- **US-1:** As a job seeker, I want to archive an application, so that the board and table show only what I'm still working on.
- **US-2:** As a job seeker, I want to find and restore an archived application, so that archiving is never a one-way trip.
- **US-3:** As a job seeker, I want to keep a company's website, so that I can open it from the application.
- **US-4:** As a job seeker, I want to record the time of a call or interview, so that the timeline says when it happened or is set to happen.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** an application's page
  - **When** I choose **Archive**
  - **Then** the application is archived. I stay on its page, which now shows an "Archived" pill and a **Restore** button in place of Archive. The Archive button sits with Edit and Delete.
- **AC-2** (US-1)
  - **Given** a card on the board or a row in the table
  - **When** I choose its Archive action
  - **Then** that application is archived and disappears from the view without a reload. The action is reachable with the keyboard and has an accessible name that says which application it acts on.
- **AC-3** (US-1)
  - **Given** an archived application
  - **When** I look at the board, the table, and the sidebar's stage counts and "All applications" total
  - **Then** the application is in none of them, and the counts have dropped by one, without a reload.
- **AC-4** (US-2)
  - **Given** the sidebar
  - **When** I look at it
  - **Then** an **Archived** entry sits below the stage list with the number of archived applications. Choosing it shows the table of only archived applications, with the same search and sort as the table. With none, the table says nothing is archived. The entry is marked as the current one while I'm on that view.
- **AC-5** (US-2)
  - **Given** an archived application, on its page or as a row in the Archived table
  - **When** I choose **Restore**
  - **Then** it returns to the board, the table, and the counts, in the stage it had when I archived it, with everything else unchanged.
- **AC-6** (US-2)
  - **Given** an archived application
  - **When** I open its page
  - **Then** I can read everything on it. Its stage menu, Edit, its requirement checkboxes, and every add, Edit, and ✕ control for requirements, timeline entries, and contacts are unavailable until I restore it. **Delete** still works, and still asks first.
- **AC-7** (US-3)
  - **Given** an application's Add or Edit form
  - **When** I look at it
  - **Then** it has an optional **Website** field for the company. Saving it sets the company's website, so every application at that company shows it. Text without `http://` or `https://` gets `https://` added, as the job link does (spec 003). Text that isn't a usable web address is rejected with a message. Leaving it empty clears it. The field starts with the company's current website, and picking a different company in the form shows that company's website instead.
- **AC-8** (US-3)
  - **Given** an application whose company has a website
  - **When** I look at its page
  - **Then** the company name in the header is a link that opens the website in a new tab. A company with no website shows plain text, as today.
- **AC-9** (US-4)
  - **Given** the timeline's add form and an entry's edit form
  - **When** I look at them
  - **Then** there is an optional **Time** field beside Date. Leaving it empty keeps the entry date-only. A time I enter is a valid time of day, in my local time, and an invalid one is rejected with a message.
- **AC-10** (US-4)
  - **Given** a timeline entry that has a time
  - **When** I read the timeline
  - **Then** its muted line shows the date, then the time. An entry without a time shows only the date, as today. Entries made before this feature, and the entries the app writes when an application is added or its stage changes, have no time.
- **AC-11** (US-4)
  - **Given** entries on the same date
  - **When** I read the timeline
  - **Then** the order is newest date first, as before. Within a date, an entry with a later time comes before one with an earlier time, and entries without a time come after those with one, last added first.
- **AC-12** (US-1, US-2, US-3, US-4)
  - **Given** data saved before this feature
  - **When** the app starts after the update
  - **Then** every application is unarchived, every company has no website, and every timeline entry has no time. Nothing else changes.
- **AC-13** (US-1, US-2, US-3, US-4)
  - **Given** the light and dark themes and a narrow screen
  - **When** I use the new controls
  - **Then** they are readable at a contrast ratio of at least 4.5 to 1, reachable with the keyboard, and don't make anything scroll sideways.

## Data and rules

- An application is either archived or not. Archiving changes nothing else about it: its stage, dates, requirements, timeline, and contacts stay as they are. When it was archived is recorded.
- Archived applications are left out of the board, the table, and the sidebar's counts and total. They show only under Archived.
- An archived application can't be edited, moved, or added to until it is restored. It can be read, restored, or deleted.
- A company has an optional website, one per company, shared by its applications. It is a web address starting with `http://` or `https://`.
- A timeline entry's time is optional and is a time of day with no time zone, the wall-clock time I entered. Entries without one stay date-only.
- Company names are still unique and matched regardless of case. Archiving an application doesn't free or change its company.

## Edge cases

- Archiving the last application in a stage leaves that stage's count at zero.
- Archiving an application while it is open elsewhere, or restoring one that was deleted, shows a clear message and changes nothing.
- A company whose every application is archived keeps showing in company suggestions, with its website.
- Setting a website on one application's form changes it for the company's other applications, including archived ones.
- Entering a website for a company, then choosing another company before saving, saves the website to the company that is chosen when I save.
- A very long website address wraps or truncates inside the form and header without breaking the layout.
- Editing an entry's time to empty makes it date-only again.
- An automatic stage-change entry can be edited, and then gets a time only if I enter one.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Where is Archive offered? **On the detail page, and as a quick action on cards and table rows.**
- [x] What can I do with an archived application? **Read it, restore it, or delete it. Everything else waits for Restore.**
- [x] Is a timeline entry's time required? **No. It is optional, and older and automatic entries stay date-only.**
- [x] Can a future call or interview be marked as scheduled? **Not in this spec. The timeline stays a log. An upcoming view is a separate spec, designed with the "what's next" idea.**
- [x] How is the company website edited? **In the application's Add and Edit form. It sets the company's website, shared by its applications.**
- [x] Should archiving and restoring add an automatic timeline entry, as a stage change does? **No.** The timeline records what happened with the job, and archiving only tidies my view.
- [x] Within a date, should entries with a time sort ahead of those without, as AC-11 says? **Yes**, newest time first, so a timed interview isn't buried under untimed notes.
- [x] Should the Archived entry in the sidebar show its count? **Yes**, so it is clear when there is something to find.

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Resolved the last open questions: no automatic timeline entry for archive or restore, timed entries sort ahead of untimed ones within a date, and the Archived entry shows its count.
- 2026-10-02: Approved.
