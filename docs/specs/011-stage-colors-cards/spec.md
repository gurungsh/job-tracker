# 011: Stage colors and richer cards

| Field   | Value                                                  |
| ------- | ------------------------------------------------------ |
| Status  | Implemented                                          |
| Branch  | `feature/stage-colors-cards`                           |
| Created | 2026-10-02                                             |
| Updated | 2026-10-02                                             |
| Depends | [010: Light and dark themes](../010-themes/)           |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The board looks the same in every column: gray columns with plain text cards. I can't tell stages apart at a glance, and a card only tells me the company, the title, and the next step. To compare jobs I still have to open each one to see where it is, how it pays, and how long it has sat in its stage. This spec gives each stage a color and an icon, and puts the facts I look at most on the card.

## Goals

- Give each of the eight stages its own color and icon, used for column titles and stage badges.
- Show a small initials badge beside each company name, so companies are easy to pick out.
- Show on each card the job's location, work mode, and employment type, its pay, and how long it has been in its stage.
- Keep dragging, clicking, and everything else about the board as it is.

## Non-goals (out of scope)

- Company logos, or anything fetched from the internet. The initials badge is made from the company name alone.
- A sidebar or counts outside the board (spec 014), or the table view (spec 012).
- Letting me choose stage colors or icons.
- Changing the side panel, or what can be edited.
- Showing contacts, requirements, or timeline details on cards.

## User stories

- **US-1:** As a job seeker, I want each stage in its own color and icon, so that I can read the board at a glance.
- **US-2:** As a job seeker, I want a company badge on each card, so that I can spot a company quickly.
- **US-3:** As a job seeker, I want the job's location, work mode, employment type, and pay on the card, so that I can compare jobs without opening them.
- **US-4:** As a job seeker, I want to see how long a card has been in its stage, so that I notice the ones going stale.
- **US-5:** As a job seeker, I want all of it readable in the light and the dark theme, so that I can use either.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** the board
  - **When** I look at the eight columns
  - **Then** each column title shows its stage's own icon, its name, and its count, all in that stage's color. No two stages share a color or an icon, and a column keeps a neutral background.
- **AC-2** (US-1)
  - **Given** any card
  - **When** I look at the bottom of it
  - **Then** I see a stage badge with the stage's name on a tint of the stage's color, the same color as that column's title.
- **AC-3** (US-2)
  - **Given** any card
  - **When** I look at the top of it
  - **Then** I see a round or rounded badge of company initials, then the company's name.
- **AC-4** (US-2)
  - **Given** a company name
  - **When** the badge is made
  - **Then** a name of one word gets one initial, and a name of several words gets two, from its first two words, ignoring the small words "of", "and", "the", "for", "at", and "&". "Bank of America" is "BA", "Microsoft" is "M", "The Home Depot" is "HD", and initials are capitals.
- **AC-5** (US-2)
  - **Given** a company name
  - **When** the badge is colored
  - **Then** the color comes from the name, ignoring capitals, so a company's badge always looks the same, on every card and every visit, and the initials stay readable on it in both themes.
- **AC-6** (US-3)
  - **Given** an application with a location, work mode, or employment type
  - **When** I look at its card
  - **Then** one line shows those that are filled in, separated by " • ", in the order location, work mode, employment type, such as "Charlotte, NC • Hybrid • Contract · 6 mo". A contract shows its length in months. With none of them filled in, there is no line.
- **AC-7** (US-3)
  - **Given** an application with a salary
  - **When** I look at its card
  - **Then** a line shows the pay in a short form:
    - Both amounts: "$140k–$170k/yr" or "$85–$95/hr"
    - Minimum only: "From $140k/yr"
    - Maximum only: "Up to $170k/yr"
    - Equal amounts: "$150k/yr"
    - A whole number of thousands from $1,000 up is written with "k". Any other amount is written in full with commas, such as "$92,500".

    With no salary, there is no line.
- **AC-8** (US-3)
  - **Given** an application with a next step or a due date
  - **When** I look at its card
  - **Then** they show as they did before, and a due date in the past is marked "Overdue" as before.
- **AC-9** (US-4)
  - **Given** any card
  - **When** I look at the bottom of it
  - **Then** next to the stage badge I see a clock and how long the application has been in its stage: "Today", "1 day", or "5 days". Pointing at it says "Time in this stage".
- **AC-10** (US-1, US-4)
  - **Given** a card
  - **When** I drag it to another column, or change its stage in the side panel
  - **Then** its badge, color, and time in stage show the new stage, and clicking and dragging work exactly as in specs 002 and 006.
- **AC-11** (US-5)
  - **Given** either theme
  - **When** I look at stage names, counts, badges, and initials
  - **Then** each text has a contrast ratio of at least 4.5 to 1 against its background, and the stage colors are still told apart from each other.
- **AC-12**
  - **Given** the app is running
  - **When** I use the board
  - **Then** no request leaves the app for badges or icons. Everything is drawn from the application's own data and files.
- **AC-13** (US-3)
  - **Given** a very long company name, job title, location, or next step
  - **When** I look at its card
  - **Then** the card keeps its width: the company name and title are cut off with "…", and the details and next step wrap or are cut off, without pushing other parts of the card out of place.

## Data and rules

- Nothing is stored for any of this. Every part of the card is worked out from the application's existing fields, and from the stage.
- The stage's color and icon depend only on the stage. The initials badge depends only on the company name.
- "Time in this stage" counts whole calendar days from the date the stage last changed to today, in my local time.
- The small words skipped for initials are compared ignoring capitals. A name made only of small words uses its first word. A name with nothing to take an initial from (empty, or only spaces and separators) shows "?".

## Edge cases

- A company name in another alphabet or with an emoji: the first character of each word is used.
- Two companies with the same initials may get different colors, and the same company always gets the same one.
- An application with no work mode, no employment type, and no location has no details line, and the card is shorter.
- A contract with no contract length shows "Contract" alone.
- An hourly salary with one amount over $1,000 is written in full or with "k" by the same rules.
- Moving a card back and forth between stages resets its time in stage each time, as in spec 002.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Does every card show a stage badge? **Yes**, on every card.
- [x] How is pay written on a card? **A compact form**, such as "$140k–$170k/yr".

## Changelog

- 2026-10-02: Draft created.
- 2026-10-02: Approved.
- 2026-10-02: Implementation started.
- 2026-10-02: Clarified when the badge shows "?": only when the name has nothing to take an initial from, so a name that starts with an emoji or symbol uses that character, as the edge case says.
- 2026-10-02: Implemented.
- 2026-10-02: Spec 012 adds the table view this spec left out of scope. It reuses this spec's stage colors and icons, pay and time-in-stage wording, and "Overdue" marker. The cards are unchanged.
