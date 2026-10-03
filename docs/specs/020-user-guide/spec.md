# 020: User guide

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented |
| Branch  | `feature/user-guide`                                   |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [014](../014-app-shell-sidebar/spec.md), [016](../016-detail-page-redesign/spec.md), [017](../017-archive-website-entry-times/spec.md), [019](../019-drag-preview/spec.md) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The app now has a board, a table, a sidebar, a detail page with several sections, archiving, and themes. Nothing in the app explains how these fit together, so I have to remember what each screen does and where to find it. The roadmap has held a User Guide button for the header since spec 016.

## Goals

- Open a built-in guide from the header on every screen.
- Explain every screen and what I can do on it, in plain language.

## Non-goals (out of scope)

- Screenshots or images. The guide is text only, so it can't go stale and reads the same in both themes.
- A guided tour that highlights parts of the real screens.
- Search inside the guide.
- Saving anything. The guide has no stored data, and it doesn't remember where I stopped reading.
- Documenting keyboard shortcuts, since the app has none beyond standard browser behavior.

## User stories

- **US-1:** As a job seeker, I want a User Guide button in the header, so that I can open help from any screen.
- **US-2:** As a job seeker, I want the guide organized by screen, so that I can jump to what I'm using.
- **US-3:** As a job seeker, I want to return to where I was after reading, so that I don't lose my place.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** I'm on any screen of the app
  - **When** I look at the header
  - **Then** I see a "User Guide" button with a book icon, next to the theme switch. On a narrow screen it shows only the icon, and keeps an accessible name of "User Guide".
- **AC-2** (US-1)
  - **Given** I'm on any screen
  - **When** I click the User Guide button
  - **Then** the guide opens on its own page with its own address, so it can be reloaded or bookmarked.
- **AC-3** (US-2)
  - **Given** the guide is open
  - **When** I read it
  - **Then** it has a contents list at the top and one section for each of: the board, the table, the sidebar, adding and editing an application, an application's page (details, requirements, timeline, and contacts), archiving, and the light and dark themes.
- **AC-4** (US-2)
  - **Given** the guide is open
  - **When** I choose an entry in the contents list
  - **Then** the page scrolls to that section.
- **AC-5** (US-2)
  - **Given** the guide is open
  - **When** I read each section
  - **Then** it describes what the screen is for and the actions available on it, including dragging a card, moving a card from its menu, choosing which stages the board shows, filtering and sorting the table, the eight stages and which three close an application, and restoring an archived application.
- **AC-6** (US-3)
  - **Given** I opened the guide from another screen
  - **When** I choose the guide's back link
  - **Then** I return to the screen I came from, with its filters as they were. If that is unknown, I go to the board.
- **AC-7** (US-1)
  - **Given** I'm on the guide
  - **When** I look at the header and sidebar
  - **Then** they stay as on every other screen, and the User Guide button shows as the current page.
- **AC-8** (US-2)
  - **Given** I use either theme
  - **When** I read the guide
  - **Then** the text and headings are readable in both.

## Data and rules

The guide is fixed text that ships with the app. It stores nothing and calls no server endpoint. Its content must match how the app behaves, so a later spec that changes a screen should update the matching section of the guide in the same branch.

## Edge cases

- Opening the guide address directly, or reloading it, shows the guide, and its back link goes to the board.
- A contents entry whose section is missing must not exist. Every entry points to a real section.
- On a narrow screen the contents list stays usable and the text doesn't scroll sideways.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Where does it live? Its own page.
- [x] How is it organized? One section per screen, with a contents list.
- [x] Images? None, text only.
- [x] Button label? "User Guide" with a book icon.

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved and implemented.
