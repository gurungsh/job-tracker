# 007: Activity timeline

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                          |
| Branch  | `feature/activity-timeline`                            |
| Created | 2026-10-01                                             |
| Updated | 2026-10-01                                             |
| Depends | [002: Applications board](../002-applications-board/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The board shows where each application stands, but not what has happened along the way: the recruiter call, the follow-up email, the interview notes. Today that history lives in my head or in the single "next step" field, and it's lost as soon as the next step changes. This spec gives each application a timeline of what happened and when.

## Goals

- Log notes, emails, calls, and interviews on an application, each with a date.
- Record stage changes automatically, from the edit form and from dragging, and record when an application is added.
- Read the whole history of an application in one place, newest first.
- Fix or remove any entry.

## Non-goals (out of scope)

- Linking an entry to a contact (spec 008).
- Attachments, reminders, or times of day. Entries have a date only.
- Showing timeline entries or counts on board cards, or searching them.
- Filling in history for applications that already exist.
- Rich text. Entry text is plain text.
- Keeping the draft of an entry I haven't added when I close the panel.

## User stories

- **US-1:** As a job seeker, I want to log a note, email, call, or interview with a date, so that I remember what happened.
- **US-2:** As a job seeker, I want stage changes recorded for me, so that I can see how an application progressed without writing it down.
- **US-3:** As a job seeker, I want to see an application's history newest first, so that I can catch up before a call.
- **US-4:** As a job seeker, I want to edit or delete any entry, so that I can fix mistakes.
- **US-5:** As a job seeker, I want mistakes in an entry caught, so that the timeline stays trustworthy.

## Acceptance criteria

- **AC-1** (US-3)
  - **Given** I open an existing application in the side panel
  - **When** I look at the top of the panel
  - **Then** I see two tabs, "Details" and "Timeline", and Details is selected. When I'm adding a new application, there are no tabs and only the form shows.
- **AC-2** (US-1, US-3)
  - **Given** the Timeline tab is open
  - **When** I choose a type (Note, Email, Call, or Interview), keep or change the date, write some text, and choose "Add entry"
  - **Then** the entry appears in the timeline and the entry form clears, with the date back to today. After reloading the page it is still there.
- **AC-3** (US-3)
  - **Given** an application has entries
  - **When** I look at the timeline
  - **Then** entries are listed with the newest date first. Entries with the same date show the one added last first. Each shows its type, its date, and its text, with line breaks kept.
- **AC-4** (US-5)
  - **Given** I'm adding or editing an entry
  - **When** I try to save with no text, text over the limit, or a date that isn't a real date
  - **Then** the entry isn't saved, and the form explains what to fix next to the field.
- **AC-5** (US-5)
  - **Given** a request reaches the server directly, without going through the form
  - **When** it breaks any rule in "Data and rules", or names an application or entry that doesn't exist
  - **Then** the server rejects it with an error that names the invalid fields, or says it wasn't found, and nothing is saved.
- **AC-6** (US-2)
  - **Given** I add a new application
  - **When** it's saved
  - **Then** its timeline has one entry dated today, such as "Added to Wishlist", naming the stage it started in.
- **AC-7** (US-2)
  - **Given** an existing application
  - **When** its stage changes, whether from the edit form or by dragging its card
  - **Then** its timeline gets an entry dated today, such as "Moved from Applied to Interviewing". Saving without changing the stage adds no entry.
- **AC-8** (US-4)
  - **Given** an entry in the timeline
  - **When** I choose "Edit"
  - **Then** I can change its date and its text, and also its type if it's a Note, Email, Call, or Interview. "Save" keeps the changes after a reload, and "Cancel" discards them. The automatic entries keep their own type.
- **AC-9** (US-4)
  - **Given** an entry in the timeline
  - **When** I choose "Delete" and confirm
  - **Then** the entry is removed, also after a reload. If I don't confirm, nothing is removed.
- **AC-10** (US-3)
  - **Given** an application created before this spec
  - **When** I open its Timeline tab
  - **Then** it says there are no entries yet, and I can add some. Its other fields and stage are unchanged.
- **AC-11** (US-1)
  - **Given** I delete an application
  - **When** it's gone
  - **Then** its timeline entries are gone too.
- **AC-12**
  - **Given** applications with timeline entries
  - **When** I look at the board
  - **Then** the cards show only what they showed before: company, job title, next step, and due date.
- **AC-13** (US-3)
  - **Given** the Timeline tab is open
  - **When** loading the entries, or adding, editing, or deleting one, fails
  - **Then** a message explains what failed and why. A failed load offers "Try again". After a failed add or edit, what I typed is still in the form.
- **AC-14**
  - **Given** I've changed the form on the Details tab without saving
  - **When** I switch to the Timeline tab and back
  - **Then** my changes are still there, and closing the panel still asks me to confirm as in spec 002 (AC-11). Adding, editing, or deleting timeline entries saves right away and doesn't depend on the "Save" button of the form.

## Data and rules

| Field | Rules |
| ----- | ----- |
| Type | Note, Email, Call, or Interview, for entries I log. "Stage change" for automatic entries, which I can't choose. |
| Date | A real calendar date, shown like the other dates in the app. Defaults to today (my local date). It may be in the past or the future. |
| Text | Required. Plain text, up to 5,000 characters. Line breaks are kept. Trimmed at both ends. |

- Automatic entries have text like "Added to Wishlist" or "Moved from Applied to Interviewing", using the stage names from the board. I can edit or delete them like any other entry (owner decision).
- "Today" is my local date, the same as for the applied and closed dates in spec 002.
- Deleting or editing an entry never changes the application's stage or dates.

## Edge cases

- A long entry: the timeline scrolls inside the panel, and the text wraps.
- Moving a card back and forth records each move as its own entry.
- Changing the stage and other fields in one save records one stage entry.
- Deleting the automatic entry for a move doesn't undo the move.
- Two entries on the same date keep a stable order: the last one added is first.
- Closing the panel with an unadded entry in the form discards it without asking.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Where does the timeline appear? **A separate tab in the side panel.**
- [x] Can I edit or delete entries? **Yes, all of them, including automatic ones.**
- [x] Which stage changes are recorded? **Creation and every move, no backfill.**
- [x] Can an entry be dated in the past? **Yes. It defaults to today.**
- [x] Should future dates be allowed? **Yes.**

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Approved. Future dates are allowed.
- 2026-10-01: Implementation started.
- 2026-10-02: Implemented.
- 2026-10-02: Spec 011 added to the board cards: a company badge, a line with location, work mode, and employment type, the pay, a stage badge, and the time in stage. Where this spec says cards show only the earlier content, spec 011's content is now expected too. Nothing else about the cards changed.
- 2026-10-02: Spec 013 replaced the side panel and its tabs. The timeline is now a Timeline section on the application's page and works as before. AC-1 (tabs) and AC-14 (the form surviving a tab switch) no longer apply, since the page has no tabs and the form opens in its own dialog.
- 2026-10-02: Spec 016 restyled the timeline. The form shows Type, With (the contact, which this spec calls Contact), and Date in a row, then What happened (this spec's Text), and its button is named for the type, such as Log note, instead of Add entry. Entries sit on a vertical line with an icon for their type, and each has an Edit and a ✕ that asks before deleting. The add form is still always open. Rules, limits, messages, and order are unchanged.
