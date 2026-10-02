# 016: Detail page redesign

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                                 |
| Branch  | `feature/detail-page-redesign`                         |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [013: Application detail page](../013-application-detail-page/), [014: App shell and sidebar](../014-app-shell-sidebar/), [015: Add button in the sidebar](../015-add-button-sidebar/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The detail page does everything it should, but it reads like a form: plain boxes, small text links for Edit and Delete, a timeline that looks like a list of paragraphs, and two headings in the Contacts box. I want a page that is quick to scan and consistent: clean cards with clear headings, a header with the job's facts as small pills, and the same two controls on every entry in a box, an Edit and a ✕, with a confirmation before anything is deleted.

## Goals

- Restyle the detail page's cards, header, and details to match the screenshots the owner supplied.
- Give every requirement, timeline entry, and person its own **Edit** and **✕**, and ask before deleting.
- Make each entry's controls look and work the same in all three boxes.
- Give the app header a logo and a sun/moon theme switch.
- Change nothing that is stored, and nothing about how the page's data works.

## Non-goals (out of scope)

- Archiving, the Archived sidebar entry, and the Archive button. These are spec 017.
- A company website and the link on the company name. Spec 017. The company name is plain text here.
- Time of day on timeline entries. Spec 017. The timeline keeps the date only.
- A User Guide button in the header. It comes with the guide spec (020).
- A section-level Edit on Requirements, and up and down arrows to reorder requirements.
- An amber Delete. The page's Delete keeps the app's red.
- Changes to the board, the table, or the sidebar, other than the header's logo and theme switch.
- New fields, new rules for entries, contacts, or requirements, and changes to the API.

## User stories

- **US-1:** As a job seeker, I want the detail page to be easy to scan, so that I can find what I need at a glance.
- **US-2:** As a job seeker, I want every requirement, timeline entry, and person to have its own Edit and ✕, so that I change or remove one without hunting for the control.
- **US-3:** As a job seeker, I want to be asked before something is deleted, so that I don't lose it by mistake.
- **US-4:** As a job seeker, I want the header to look finished, so that the app feels like one product.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** an application's page
  - **When** I look at the Requirements, Timeline, Details, Contacts, and Job description boxes
  - **Then** each is a bordered card with a small, uppercase, muted heading at its top, and the page is readable in the light and the dark theme, with each text at a contrast ratio of at least 4.5 to 1.
- **AC-2** (US-1)
  - **Given** an application's page
  - **When** I look at its header
  - **Then** I see the link back, the company's avatar and name, the job title, and the work mode and employment type as small pills, one for each that is set. On the right are the stage menu, Edit, and a red Delete, on the same line as the title however long the title is, until the page is too narrow for both. There is no pill for a value I never entered.
- **AC-3** (US-1, US-2)
  - **Given** an application with requirements
  - **When** I look at the Requirements box
  - **Then** a line under the heading says how many required ones are met out of the required ones, such as "0/2 required met". Each requirement is a row with a checkbox, its text, and, for a preferred one, a "Nice to have" pill. Ticking the checkbox saves it, as before. The box has no section-level Edit and no reordering.
- **AC-4** (US-2)
  - **Given** the Requirements box, the Timeline box, or the Contacts box
  - **When** I look at an entry in it
  - **Then** the entry has an **Edit** button, shown as a pencil, and a **✕** button at its top right. Neither has text, so each shows a one-word label, "Edit" or "Delete", above it when I hover it and when I reach it with the keyboard. Edit swaps the entry for its form, filled in, with Save and Cancel, as before. Each has an accessible name that says what it acts on, such as "Edit requirement: 5+ years with Node.js" and "Delete requirement: 5+ years with Node.js". Both work with Enter and Space and are reachable with Tab.
- **AC-5** (US-2, US-3)
  - **Given** an entry's ✕
  - **When** I choose it
  - **Then** a confirmation asks before anything is deleted, with the same wording as today (for a person, including how many timeline entries mention them). Choosing Cancel or pressing Escape deletes nothing. Confirming deletes the entry, and the box updates without a reload.
- **AC-6** (US-1, US-2)
  - **Given** the Requirements box and the Contacts box
  - **When** I choose "+ Add" in the box's heading
  - **Then** the add form opens inline in that box, with the same fields, rules, and messages as before. Saving adds the entry and closes the form, and Cancel closes it. Neither box shows its add form until I ask for it. In Requirements, the form's text and kind sit on one line with no visible labels, as in the owner's screenshot, with Cancel and Save below them. The text and the kind keep accessible names, "Text" and "Kind", and the same form is used to edit a requirement.
- **AC-7** (US-1, US-2)
  - **Given** the Timeline box
  - **When** I look at its add form
  - **Then** I see Type, With (the contact), and Date in a row, then a "What happened" text box and a button named for the type I chose, such as "Log note" or "Log call". The form works as before: the same rules, messages, and limits.
- **AC-8** (US-1)
  - **Given** a timeline with entries
  - **When** I read it
  - **Then** the entries hang on a vertical line, each with a round icon for its type (a note, an email, a call, an interview, or an arrow for a stage change), its text, and a muted line with its date and, when it names one, "with" and the contact. The order is the same as before: newest date first, and the last one added first within a date. Every entry, including a stage change, has Edit and ✕.
- **AC-9** (US-1)
  - **Given** an application with people
  - **When** I look at the Contacts box
  - **Then** each person shows their name, their role, and their email as a link that opens my mail app, with Edit and ✕ at the top right. Their phone number and notes show when they are filled in. With none, the box says "Nobody recorded yet — add the recruiter or hiring manager you're talking to." The box has one heading, "Contacts", with no second heading naming the company.
- **AC-10** (US-1)
  - **Given** an application's page
  - **When** I read the Details box
  - **Then** it lists Pay written in full, such as "$85,000 – $95,000/yr", Location, Source, Posting (a link, as before), Next step with its due date and "Overdue" when late, Applied, and "In stage since" with the date and time the stage changed. The Closed date still shows when there is one. A value I never entered shows "–".
- **AC-11** (US-4)
  - **Given** any screen
  - **When** I look at the app's header
  - **Then** a logo tile sits beside the app name, which still links to the board, and the theme switch looks like a sun and a moon, with the current theme marked. The switch keeps its accessible name, which says which theme it will switch to (spec 010), and still works with Enter and Space.
- **AC-12** (US-1, US-2)
  - **Given** a narrow page, such as a phone
  - **When** I look at an application's page
  - **Then** the boxes stack with Details first as before, each entry's Edit and ✕ stay at its top right without overlapping its text, a long text wraps, and nothing scrolls sideways.
- **AC-13** (US-2)
  - **Given** the Requirements, Timeline, and Contacts boxes
  - **When** I use them
  - **Then** everything they did before still works: adding, editing, deleting, ticking a requirement, choosing a contact for an entry, and the loading, empty, and error messages with their "Try again". Nothing is stored differently.

## Data and rules

- Nothing new is stored, and no request changes.
- A requirement counts toward "required met" only if it is of the required kind. A preferred one never counts, and is marked "Nice to have". With no required requirements the line is left out.
- The "In stage since" date and time come from when the stage last changed, which the application already records.
- A timeline entry's icon is chosen by its type. A stage change is written by the server, and keeps its text, such as "Moved from Screening to Interviewing".
- Every delete asks first. The confirmation's wording for requirements, entries, and people stays as it is today.

## Edge cases

- An application with no requirements, entries, or people shows each box with its empty message and its add control, and nothing broken.
- A very long requirement, entry, name, or email wraps inside its box and doesn't push the Edit and ✕ out of view.
- Choosing Edit on one entry while another is being edited leaves the first form as it is, so I don't lose what I typed.
- Deleting the last entry in a box returns it to its empty message.
- A person without an email shows no mail link, and a requirement or entry with only one line shows no empty gap.
- Two quick ticks on a requirement end with the last one chosen, as before.
- The ✕ is a small target, so it keeps enough room to be hit on a phone without touching Edit.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Is the redesign one spec or two? **Two.** This one is the look and the per-entry controls. Archive, the company website, and time of day are spec 017.
- [x] Does Requirements keep a section-level Edit with reordering? **No.** Each requirement has its own Edit and ✕.
- [x] Is Delete amber, as in the screenshot? **No**, it keeps the app's red.
- [x] Does the header get the logo and the sun/moon switch? **Yes.**
- [x] Is there a User Guide button now? **No**, it waits for the guide spec.
- [x] Title Case for "Add Application" and "All Applications", as in the screenshots? **No.** The sentence case from specs 014 and 015 stays.
- [x] Should "In stage since" also show the days in the stage? **No.** It shows the date and time only, as in the screenshots.

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Resolved the last open questions: the sentence case of "Add application" and "All applications" stays, and "In stage since" shows only the date and time.
- 2026-10-02: Approved.
- 2026-10-02: The box stays named "Contacts", not "People" as in the screenshots, as the owner asked. The stage stays where it is in the header, in the stage menu at the top right.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
- 2026-10-02: After the owner's review: the stage menu, Edit, and Delete stay on the title's line however long the title is (AC-2), and the Requirements add and edit form puts the text and kind on one line without visible labels (AC-6).
- 2026-10-02: After the owner's review: each entry's Edit is a pencil icon beside the ✕, with a one-word label on hover and on keyboard focus, and both buttons are named for what they act on (AC-4). The page header's Edit and Delete stay as text.
