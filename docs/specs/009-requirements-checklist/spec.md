# 009: Requirements checklist

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                          |
| Branch  | `feature/requirements-checklist`                       |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [002: Applications board](../002-applications-board/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

A job posting lists what the employer wants, and I judge whether to apply, and what to prepare for, by how many of those items I match. Today the posting's text sits in the job description, and the comparison happens in my head each time I look at it. This spec turns a posting's items into a checklist, so I can see at a glance how well I fit.

## Goals

- List the items from a posting on an application, marked required or preferred.
- Check off the items I meet, and see a count of how many I meet.
- Fix or remove any item.
- Keep the board and the other tabs as they are.

## Non-goals (out of scope)

- Pulling requirements out of the job description automatically, or pasting a whole list at once.
- Reordering items by hand.
- A notes field on an item, such as how I meet it.
- Showing the counts on board cards, or filtering or sorting by them.
- Reusing items across applications.
- Recording timeline entries when I add or check items.

## User stories

- **US-1:** As a job seeker, I want to list a posting's required and preferred items, so that I can see what the employer wants in one place.
- **US-2:** As a job seeker, I want to check off the items I meet, so that I can see where I'm strong and where I have gaps.
- **US-3:** As a job seeker, I want a count of how many items I meet, so that I can judge my fit quickly.
- **US-4:** As a job seeker, I want to edit and delete items, so that the list stays correct.
- **US-5:** As a job seeker, I want mistakes in an item caught, so that the list stays trustworthy.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** I open an existing application in the side panel
  - **When** I look at the tabs
  - **Then** I see "Details", "Timeline", "Contacts", and "Requirements", in that order. When I'm adding a new application, there are still no tabs.
- **AC-2** (US-1)
  - **Given** an application with no requirements
  - **When** I open the Requirements tab
  - **Then** it says there are no requirements yet, shows no counts, and offers the form to add one.
- **AC-3** (US-1)
  - **Given** the Requirements tab is open
  - **When** I write the text of an item, choose Required or Preferred, and choose "Add requirement"
  - **Then** the item appears in its group, not yet met, and the text box clears while the Required or Preferred choice stays as it was. After reloading the page the item is still there.
- **AC-4** (US-1)
  - **Given** an application with several items
  - **When** I look at the list
  - **Then** the required items come first and the preferred ones after, each group in the order the items were added.
- **AC-5** (US-2)
  - **Given** an item in the list
  - **When** I check its box, or uncheck it
  - **Then** the item shows as met, or not met, and stays that way after a reload. The item doesn't move in the list.
- **AC-6** (US-3)
  - **Given** an application with items
  - **When** I look at the top of the Requirements tab
  - **Then** I see how many I meet in each group, such as "Required: 3 of 5 met · Preferred: 1 of 2 met", and it updates as I check items. A group with no items is left out, and with no items at all there is no summary.
- **AC-7** (US-4)
  - **Given** an item in the list
  - **When** I choose "Edit", change its text or whether it's Required or Preferred, and save
  - **Then** the change is kept after a reload, and whether it's met is unchanged. An item changed to the other kind moves to that group. "Cancel" discards my changes.
- **AC-8** (US-4)
  - **Given** an item in the list
  - **When** I choose "Delete" and confirm
  - **Then** the item is removed, also after a reload, and the counts update. If I don't confirm, nothing is removed.
- **AC-9** (US-5)
  - **Given** I'm adding or editing an item
  - **When** I try to save with no text, or text over the limit in "Data and rules"
  - **Then** the item isn't saved, and the form explains what to fix next to the field.
- **AC-10** (US-5)
  - **Given** a request reaches the server directly, without going through the form
  - **When** it breaks any rule in "Data and rules", or names an application or item that doesn't exist
  - **Then** the server rejects it with an error that names the invalid fields, or says it wasn't found, and nothing is saved.
- **AC-11**
  - **Given** I delete an application
  - **When** it's gone
  - **Then** its requirements are gone too.
- **AC-12**
  - **Given** an application created before this spec
  - **When** I open its Requirements tab
  - **Then** the list is empty and I can add items. Its other fields, stage, timeline, and contacts are unchanged, and the board cards show only what they showed before: company, job title, next step, and due date.
- **AC-13** (US-2)
  - **Given** the Requirements tab is open
  - **When** loading the items, or adding, editing, checking, or deleting one, fails
  - **Then** a message explains what failed and why. A failed load offers "Try again". After a failed add or edit, what I typed is still in the form. A failed check or uncheck leaves the box as it was, and a failed delete keeps the item.
- **AC-14**
  - **Given** I've changed the form on the Details tab without saving
  - **When** I switch to the Requirements tab and back
  - **Then** my changes are still there, as with the other tabs. Adding, editing, checking, and deleting items saves right away and doesn't depend on the form's "Save" button.

## Data and rules

| Field | Rules |
| ----- | ----- |
| Text | Required. Plain text, up to 500 characters, trimmed at both ends. Two items may have the same text. |
| Kind | Required or Preferred. New items default to Required. |
| Met | Yes or no. New items start as no. |

- An item belongs to one application and is removed with it.
- Checking an item, or editing it, never changes the application's stage, dates, or timeline.

## Edge cases

- A long item: the text wraps, and the list scrolls inside the panel.
- Changing an item to the other kind keeps whether it's met, and puts it in its new group in the order it was added, like every other item (AC-4). An item added early lands near the top of its new group.
- Checking an item twice in quick succession ends with the box matching the last click, and the saved value matching it.
- Closing the panel with an unadded item in the form discards it without asking, as with the other tabs.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Where does the checklist live? **A Requirements tab in the side panel.**
- [x] Which details does an item have? **Text, required or preferred, met or not.**
- [x] How is the list ordered? **Required first, then preferred, each in the order added. No reordering.**
- [x] What summary is shown? **A count at the top of the tab, not on cards.**

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved.
- 2026-10-02: Implementation started.
- 2026-10-02: Corrected an edge case that contradicted AC-4: an item moved to the other kind takes its place by when it was added, not last.
- 2026-10-02: Implemented.
