# 010: Light and dark themes

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                          |
| Branch  | `feature/themes`                                       |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [000: Project foundation](../000-project-foundation/)  |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The app follows my device's light or dark setting, but I can't change it. Sometimes I want a dark app in a bright room, or a light one when my device is set to dark. The wrong theme can also flash for a moment when the page loads, which is jarring. This spec adds a switch I control and makes the page load in the right theme.

## Goals

- Switch between a light and a dark theme from the header.
- Start in the theme my device uses, until I choose one.
- Remember my choice in this browser.
- Load the page in the right theme, with no flash of the other one.
- Keep text and controls readable in both themes.

## Non-goals (out of scope)

- More than two themes, or custom colors.
- A third "follow the device" choice in the switch. The app follows the device only until I make a choice.
- Keeping the choice in sync between browsers or devices, or updating another open tab as soon as I switch.
- Redesigning any screen. Only colors change, and only through the existing color settings.

## User stories

- **US-1:** As a job seeker, I want to switch between a light and a dark theme, so that the app is comfortable in any lighting.
- **US-2:** As a job seeker, I want the app to start in my device's theme, so that I don't have to set it up.
- **US-3:** As a job seeker, I want my choice remembered, so that I only make it once.
- **US-4:** As a job seeker, I want the page to load in the right theme without a flash, so that opening the app isn't jarring.
- **US-5:** As a job seeker, I want everything readable in both themes, so that I can use either one all day.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** any screen of the app
  - **When** I look at the header
  - **Then** I see a theme button at its right end. It is named for what it will switch to, "Dark theme" while the app is light and "Light theme" while it is dark, and it can be reached and used with the keyboard.
- **AC-2** (US-2)
  - **Given** I open the app for the first time, with nothing remembered
  - **When** my device is set to light, or to dark
  - **Then** the app is light, or dark, to match.
- **AC-3** (US-1)
  - **Given** the app is showing
  - **When** I choose the theme button
  - **Then** the whole app changes theme at once, including the board, the side panel and all its tabs, and the confirmation dialogs, and the button's name changes to match.
- **AC-4** (US-3)
  - **Given** I have chosen a theme
  - **When** I reload the page, or open the app in a new tab in the same browser
  - **Then** it opens in the theme I chose, even if my device is set to the other one.
- **AC-5** (US-4)
  - **Given** I have chosen a theme, or my device uses one
  - **When** the page loads
  - **Then** the first thing drawn already has the right theme, with no flash of the other theme before the app appears.
- **AC-6** (US-2)
  - **Given** I haven't chosen a theme
  - **When** my device's setting changes while the app is open
  - **Then** the app changes to match. Once I have chosen a theme, a change to the device setting no longer affects it.
- **AC-7** (US-3)
  - **Given** the browser won't let the app store anything, or what is stored isn't a valid choice
  - **When** I use the app
  - **Then** it still works. It follows the device setting, and the button still switches the theme until I reload.
- **AC-8** (US-5)
  - **Given** either theme
  - **When** I look at text and buttons
  - **Then** every pairing of text and background the app uses has a contrast ratio of at least 4.5 to 1: normal and muted text on the page, panel, and column backgrounds, button text on the accent color, accent-colored text on the page and panel, and error and overdue text on their tinted backgrounds.
- **AC-9** (US-5)
  - **Given** either theme
  - **When** I use date pickers, drop-down lists, check boxes, and scroll bars
  - **Then** they are drawn in the same theme as the rest of the app.
- **AC-10**
  - **Given** the app running from the Docker image
  - **When** I use the theme button and reload
  - **Then** it behaves exactly as in AC-3 to AC-5.
- **AC-11**
  - **Given** the app in either theme
  - **When** I use any feature from specs 002 to 009
  - **Then** it works as before, and only colors differ.

## Data and rules

- The theme is one of two values: light or dark.
- My choice is kept in the browser, under one setting, and nothing is sent to the server.
- With no valid choice kept, the theme comes from the device. A valid choice always wins over the device.

## Edge cases

- Clicking the button while the app is following the device sets a choice opposite to what is showing, and remembers it.
- A device that changes setting at sunset flips an app that has no choice, and leaves one that has a choice alone.
- Two browser tabs: a tab opened after I choose uses the choice. A tab that was already open keeps its theme until it reloads.
- Overlays and shadows stay neutral black in both themes, so they need no separate colors.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] What does the control offer? **A light/dark toggle.** The app follows the device until I click it.
- [x] Is my choice remembered? **Yes, in this browser.**

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved.
- 2026-10-02: Implementation started.
- 2026-10-02: Implemented.
