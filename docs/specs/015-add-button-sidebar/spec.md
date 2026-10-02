# 015: Add button in the sidebar

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                                 |
| Branch  | `feature/add-button-sidebar`                           |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [014: App shell and sidebar](../014-app-shell-sidebar/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The Add application button sits in a toolbar that only the board has. From the table or from an application's page I can't add anything, and I have to go back to the board first. Now that a sidebar is on every screen, the button belongs at the top of it, where it is always in reach, and where the other navigation entries will join it later.

## Goals

- Show an Add application button at the top of the sidebar, above the stage list, on every screen.
- Open the same Add application form from it that the board's button opens today.
- Let me add from the table and from an application's page, which I couldn't before.
- Keep my place when I save: the screen and its address stay as they were, and the counts and the views update.
- Remove the button from the board's toolbar, so there is one Add button, not two.
- Show it at the top of the menu drawer on a narrow screen.

## Non-goals (out of scope)

- Any change to the Add form: its fields, rules, messages, or its starting stage, which is always Wishlist.
- Opening the new application's page after saving.
- An Add button in the header, or anywhere outside the sidebar and its drawer.
- A keyboard shortcut for adding.
- Other sidebar entries, such as a user guide link.
- Prefilling the form from the screen I'm on, such as the table's stage filter.

## User stories

- **US-1:** As a job seeker, I want an Add application button on every screen, so that I can add one wherever I am.
- **US-2:** As a job seeker, I want to keep my place when I save, so that my table filters and the page I was reading stay as they were.
- **US-3:** As a job seeker, I want the button in one fixed place, so that I always know where to find it.
- **US-4:** As a job seeker on a small screen, I want the button in the menu, so that it doesn't take room from the page.

## Acceptance criteria

- **AC-1** (US-1, US-3)
  - **Given** the board, the table, an application's page, or the page for an application that doesn't exist
  - **When** I look at the sidebar
  - **Then** an "Add application" button is at the top of it, above "All applications", with a plus icon, in the app's primary button style.
- **AC-2** (US-3)
  - **Given** the board and the table
  - **When** I look for another Add application button
  - **Then** there is none. The board's toolbar no longer has one, and the page has exactly one Add application button.
- **AC-3** (US-1)
  - **Given** any screen
  - **When** I choose Add application
  - **Then** the Add application form opens in a dialog, the same one as before: the same fields, rules, and messages (specs 002, 003, and 013), starting on the Wishlist stage.
- **AC-4** (US-2)
  - **Given** the form is open on any screen
  - **When** I save a valid new application
  - **Then** the dialog closes and I stay on the same screen at the same address: the table keeps its search, filters, and sort, and an application's page stays on that application. The sidebar's counts include the new application at once, and the board shows its card in its column. The table shows its row if it matches the table's search and filters, and doesn't if it doesn't.
- **AC-5** (US-1)
  - **Given** the form is open with something typed in it
  - **When** I close it, or press Escape
  - **Then** I'm asked before the changes are thrown away, as before (spec 002, AC-11). With nothing typed, it closes at once. Either way, focus goes back to the Add application button.
- **AC-6** (US-4)
  - **Given** a narrow screen with the menu drawer open
  - **When** I look at the drawer, and choose Add application
  - **Then** the button is at the top of the drawer, above "All applications". Choosing it closes the drawer and opens the form, and the header has no Add button of its own. When the form closes, focus goes to the menu button.
- **AC-7** (US-1)
  - **Given** I have no applications
  - **When** I look at the board or the table
  - **Then** each says there are none yet and points me to the Add application button in the sidebar, not to the board.
- **AC-8** (US-1)
  - **Given** I use only the keyboard
  - **When** I tab through the app
  - **Then** the Add application button comes before the sidebar's other entries and I can open the form with Enter or Space.
- **AC-9** (US-1)
  - **Given** the applications are still loading, or couldn't be loaded
  - **When** I choose Add application
  - **Then** the form still opens and works. Without the company suggestions it is still a plain text field. After I save, the applications load again.
- **AC-10** (US-1)
  - **Given** either theme
  - **When** I look at the button
  - **Then** it is readable in the light and the dark theme, with its text at a contrast ratio of at least 4.5 to 1 against its own background.
- **AC-11** (US-2)
  - **Given** the board, the table, and an application's page
  - **When** I use them
  - **Then** each does what it did before this spec. The board's columns sit where its toolbar was, with no empty gap, and nothing else on those screens changes.

## Data and rules

- Nothing new is stored. Adding an application works as before (specs 002 and 003).
- The form always starts on the Wishlist stage, whatever screen it opens from.
- There is one Add application button, in the sidebar, and the narrow screen's drawer shows the same sidebar.
- Saving doesn't change the address. It only updates what the screen shows, as a save from the board did.

## Edge cases

- Choosing the button twice quickly opens one form, not two.
- The button is out of reach while another dialog is open, since a dialog holds focus.
- Adding while the table is filtered so that the new application doesn't match: the dialog closes, the table shows no new row, and the counts show it. This is expected, not an error.
- Adding from the page for an application that doesn't exist still works.
- If saving fails, the form stays open with my input and says why, as before (spec 002).
- With a very long list of applications, the button stays at the top of the sidebar and doesn't scroll away with the page, as the rest of the sidebar's column stays in place.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Where do I land after saving? **I stay where I was**, and the screen updates.
- [x] Where is the button on a narrow screen? **Only at the top of the menu drawer.**
- [x] Does the form start on a stage chosen from where I am? **No, always Wishlist.**
- [x] Is there a keyboard shortcut? **No**, not in this spec.

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
