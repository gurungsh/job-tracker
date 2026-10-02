# 008: Contacts

| Field   | Value                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| Status  | Implemented                                                                          |
| Branch  | `feature/contacts`                                                                     |
| Created | 2026-10-02                                                                             |
| Updated | 2026-10-02                                                                             |
| Depends | [002: Applications board](../002-applications-board/), [007: Activity timeline](../007-activity-timeline/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

Applications involve people: the recruiter who reached out, the hiring manager, the engineer who interviewed me. Today their names live inside timeline text, and I have to hunt for an email address or remember who said what. This spec keeps the people at each company in one place, and lets a timeline entry say which person it involved.

## Goals

- Keep contacts for a company: name, role, email, phone, and notes.
- See and manage them from any application at that company, so a recruiter is entered once and reused.
- Link a timeline entry to the contact it involved, and see that link on the entry.
- Keep the board and the other tabs as they are.

## Non-goals (out of scope)

- A separate screen listing all contacts across companies.
- Showing contacts on board cards, or searching or filtering by contact.
- Linking one contact to several companies, or moving a contact to another company.
- Several people on one timeline entry.
- Sending email or placing calls from the app. Email and phone are plain text.
- Importing contacts, or editing company details such as a website.

## User stories

- **US-1:** As a job seeker, I want to keep the people I deal with at a company, so that I can find their details quickly.
- **US-2:** As a job seeker, I want the same contacts on every application at that company, so that I don't enter a recruiter twice.
- **US-3:** As a job seeker, I want to say which contact a timeline entry involved, so that I remember who said what.
- **US-4:** As a job seeker, I want to edit and delete contacts, so that the list stays correct.
- **US-5:** As a job seeker, I want mistakes in a contact caught, so that the details stay trustworthy.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** I open an existing application in the side panel
  - **When** I look at the tabs
  - **Then** I see "Details", "Timeline", and "Contacts". When I'm adding a new application, there are still no tabs.
- **AC-2** (US-1)
  - **Given** the Contacts tab is open
  - **When** I look at it
  - **Then** I see the application's company name and its contacts in alphabetical order, ignoring case. Each shows its name, and its role, email, phone, and notes when they are filled in, with line breaks in the notes kept. When there are none, it says there are no contacts yet.
- **AC-3** (US-1, US-2)
  - **Given** the Contacts tab is open
  - **When** I fill in a name (and any other details) and choose "Add contact"
  - **Then** the contact appears in the list and the form clears. After reloading the page it is still there. Opening another application at the same company shows the same contact, and an application at a different company doesn't.
- **AC-4** (US-5)
  - **Given** I'm adding or editing a contact
  - **When** I try to save with no name, an email that isn't a valid address, or any value outside the limits in "Data and rules"
  - **Then** the contact isn't saved, and the form explains what to fix next to the field.
- **AC-5** (US-5)
  - **Given** a request reaches the server directly, without going through the form
  - **When** it breaks any rule in "Data and rules", or names a company, contact, or application that doesn't exist
  - **Then** the server rejects it with an error that names the invalid fields, or says it wasn't found, and nothing is saved.
- **AC-6** (US-4)
  - **Given** a contact in the list
  - **When** I choose "Edit", change any detail, and save
  - **Then** the change is kept after a reload, "Cancel" discards it, and timeline entries linked to the contact show the new name.
- **AC-7** (US-4)
  - **Given** a contact in the list
  - **When** I choose "Delete"
  - **Then** I'm asked to confirm. The question says how many timeline entries mention the contact, when there are any. If I confirm, the contact is removed, also after a reload, and those entries stay but no longer name anyone. If I don't confirm, nothing changes.
- **AC-8** (US-3)
  - **Given** I'm adding or editing a timeline entry
  - **When** I look at the form
  - **Then** I see an optional "Contact" choice, listing "None" and the application's company's contacts. When I choose one and save, the entry shows "with" and the contact's name, also after a reload. Choosing "None" removes the link.
- **AC-9** (US-3)
  - **Given** an automatic entry, such as "Moved from Applied to Screening"
  - **When** I edit it
  - **Then** I can choose a contact for it too, like any other entry.
- **AC-10** (US-5)
  - **Given** a request reaches the server directly
  - **When** it links a timeline entry to a contact from a different company, or to one that doesn't exist
  - **Then** the server rejects it with an error that names the contact field, and nothing is saved.
- **AC-11** (US-5)
  - **Given** an application whose timeline entries name contacts
  - **When** I save it with a different company
  - **Then** its entries no longer name any contact, because those people work somewhere else. Nothing else about the entries changes. Saving without changing the company leaves the links as they were.
- **AC-12**
  - **Given** an application created before this spec, or an entry created before it
  - **When** I open its Timeline or Contacts tab
  - **Then** the entries name no contact, and the contacts list is empty unless I add some. The board cards show only what they showed before: company, job title, next step, and due date.
- **AC-13** (US-1)
  - **Given** the Contacts tab is open
  - **When** loading, adding, editing, or deleting a contact fails
  - **Then** a message explains what failed and why. A failed load offers "Try again". After a failed add or edit, what I typed is still in the form, and a failed delete keeps the contact.
- **AC-14**
  - **Given** I've changed the form on the Details tab without saving
  - **When** I switch to the Contacts tab and back
  - **Then** my changes are still there, as with the Timeline tab in spec 007 (AC-14). Adding, editing, or deleting contacts saves right away and doesn't depend on the form's "Save" button.

## Data and rules

| Field | Rules |
| ----- | ----- |
| Name | Required. Free text, up to 200 characters. Two contacts at a company may share a name. |
| Role | Optional. Free text, up to 200 characters. For example, "Recruiter". |
| Email | Optional. A valid email address, up to 254 characters. |
| Phone | Optional. Free text, up to 50 characters, so any format works. |
| Notes | Optional. Free text, up to 5,000 characters. Line breaks are kept. |

- Text fields are trimmed at both ends, and an empty field is stored as empty, as in spec 002.
- A contact belongs to one company, the company of the application whose tab I'm using. The company can't be changed.
- A timeline entry names at most one contact, who must belong to the same company as the entry's application.
- Contacts are never removed when an application is deleted, because other applications at the company may use them.

## Edge cases

- Two applications at the same company share one contacts list. Renaming a contact is seen from both.
- Deleting a contact removes the link from entries in every application at that company.
- A company name typed differently ("acme" vs "Acme") is the same company (spec 002, AC-18), so it shares contacts.
- A contact whose entries were all unlinked stays deletable at any time.
- Moving an application to a company with no contacts leaves its entries with no contact choice beyond "None".
- Closing the panel with an unadded contact in the form discards it without asking, as with timeline entries.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Where are contacts managed? **A Contacts tab in the side panel.**
- [x] Which details? **Name, role, email, phone, notes.**
- [x] What happens to entries when a contact is deleted? **They stay, the link is removed.**
- [x] How is a contact linked to an entry? **An optional choice on the entry form, including automatic entries.**
- [x] AC-11: clear the links when an application changes company, or block the change? **Clear them** (the draft's behavior, approved).

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved. Changing company clears the entries' contact links.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
