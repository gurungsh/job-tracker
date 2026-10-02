# Roadmap

| Field   | Value      |
| ------- | ---------- |
| Status  | Approved   |
| Updated | 2026-10-02 |

This is the big picture: what job-tracker will become, and the order in which specs will build it. It is a guide, not a contract. Each feature still gets its own approved `spec.md`, `plan.md`, and `tasks.md` before any code, and this page changes whenever what we learn changes the plan.

The vision is in [constitution §1](constitution.md#1-product-vision): a personal, local app for tracking where I applied, what stage each application is at, and what happens next.

## Domain sketch

These are the things the app tracks and how they relate. Fields and table designs are decided in each spec's `plan.md`, not here.

```
Company ──< Application ──< Requirement
   │             │
   │             └──< Activity
   │                     │  (optional: the contact it involved)
   └──< Contact <────────┘
```

`A ──< B` means one A has many B.

- **Company:** an employer. For now it is only a name, which is unique and case-insensitive, picked or created while adding an application. One company can have many applications and many contacts.
- **Application:** one job I'm tracking at a company. It has a job title, a stage, and a next step with an optional due date. Its details are the job link, location, work mode (onsite, hybrid, or remote), salary range (annual or hourly), employment type (full-time, contract, or part-time) with a contract length for contracts, where I found it, and the job description. It is the card on the board.
- **Stage:** one of eight, in board order: **Wishlist, Applied, Screening, Interviewing, Offer, Accepted, Rejected, Withdrawn**. The last three close the application.
- **Activity:** something that happened on an application, such as a note, email, call, or interview, plus an automatic entry whenever the stage changes. Together they form the application's timeline.
- **Contact:** a person at a company, such as a recruiter or hiring manager. Contacts belong to the company, not to one application, so the same person can be reused across every application at that company. An activity can name the contact it involved.
- **Requirement:** an item from the job posting, marked required or preferred, and met or not met.

Money is in USD only (per `CLAUDE.md`).

## Planned specs

Each spec is usable on its own once it's done. The numbers are reserved in this order, but the order can change if priorities do.

| #   | Spec | What I can do when it's done | Depends on |
| --- | ---- | ---------------------------- | ---------- |
| 000 | Project foundation | *(Implemented)* Run, test, lint, and typecheck the app. | — |
| 001 | Run the app in Docker | *(Implemented)* Run the production app with one Docker command. | 000 |
| 002 | Applications board | *(Implemented)* Add, edit, and delete applications, each with a company (by name), a job title, a stage, and a next step with a due date. See them on a board with one column per stage, and change the stage from the edit form. | 000 |
| 003 | Job details | *(Implemented)* Record each application's job link, location, work mode, employment type and contract length, salary range, source, and description. | 002 |
| 004 | Logging and observability | Log every API request and server event to the terminal and to daily log files, see browser errors in the server's logs, and check the app's health, version, and request counts. | 000 |
| 005 | File restructure | *(Implemented)* Find code, tests, and styles quickly: tests live apart from source, and each component's styles sit beside it. The app behaves exactly as before. | 000–004 |
| 006 | Board drag and drop | *(Implemented)* Move cards between columns by dragging them with the mouse. The stage changes as it does in the edit form. | 002 |
| 007 | Activity timeline | *(Implemented)* Log notes, emails, calls, and interviews on an application, and see stage changes recorded automatically. | 002 |
| 008 | Contacts | *(Implemented)* Keep the people at each company, see them on that company's applications, and link activities to them. | 002, 007 |
| 009 | Requirements checklist | *(Implemented)* List a posting's required and preferred items, and check off the ones I meet. | 002 |
| 010 | Light and dark themes | *(Implemented)* Switch between a light and a dark theme from the header. It starts from the device's setting and never flashes the wrong theme on load. | 000 |
| 011 | Stage colors and richer cards | *(Implemented)* See each stage in its own color and icon. Cards also show a company initials badge, location, work mode, employment type, pay, and time in stage. | 010 |
| 012 | Table view | *(Implemented)* See all applications in a table with search, filters for stage, work mode and employment type, and sortable columns. Filters live in the page address. A Kanban/Table switch moves between the two views. | 011 |
| 013 | Application detail page | *(Implemented)* Click a card to open that application on its own page, with a link back to the board. The page shows the job's details, requirements, timeline, and contacts together, and I can change the stage, edit the application, or delete it from there. It replaces the side panel. | 011, 012 |
| 014 | App shell and sidebar | Use a sidebar that lists every stage with a live count. Each one opens the table filtered to that stage. The header carries the app name. | 012 |
| 015 | Board stage filter and card menu | Choose which stages the board shows, with the closed ones hidden to start, and move a card to another stage from its menu. | 011 |
| 016 | Keyboard drag and drag preview | Move cards with the keyboard as well as the mouse, and see the card move live while dragging. | 015 |
| 017 | User guide | Open a built-in walkthrough of every screen from the header. | 010–016 |

## Later, maybe

These ideas aren't scheduled. They will get a number only when they're picked up.

- Archiving closed applications, so the board stays focused on active ones
- A "what's next" view that lists upcoming next steps by due date
- Editing company details, such as website, industry, and notes
- Reordering cards within a column by hand, and keeping that order
- Dragging on touch screens

## Decided

- 2026-10-01: The main screen is a Kanban board.
- 2026-10-01: The eight stages above are kept from the earlier version of the app.
- 2026-10-01: The old app's data (`data/legacy/jobs.db`) is sample data. It stays backed up, and no import is planned.
- 2026-10-01: Contacts belong to a company and are reused across its applications.
- 2026-10-01: A company is only a name for now. A company details screen stays under "Later, maybe".
- 2026-10-01: The application fields are split across two specs: the board essentials in 002, and the job details in 003. This keeps 002 a reviewable size. Drag and drop and later specs moved down one number.
- 2026-10-01: The spec order stays as listed. The "what's next" view stays under "Later, maybe".
- 2026-10-01: Logging and observability is added as spec 004, ahead of the remaining features. Drag and drop and later specs moved down one number.
- 2026-10-01: File restructure is added as spec 005, ahead of the remaining features, so new features are built in the new layout. Drag and drop and later specs moved down one number.
- 2026-10-01: Timeline entries are shown in a Timeline tab in the side panel. All entries, including automatic stage-change ones, can be edited and deleted. Creation is recorded too.
- 2026-10-02: Contacts are managed in a Contacts tab in the side panel, with name, role, email, phone, and notes. Deleting a contact keeps the entries that named it.
- 2026-10-02: The UI features are added as eight small specs, 010 to 017, in an order where each builds on the one before.
- 2026-10-02: The table's filters live in the page address, so a filtered view can be reloaded or bookmarked. That needs a router, which spec 012 adds as a dependency.
- 2026-10-02: Stage icons come from an icon library, which spec 011 adds as a dependency.
- 2026-10-02: Clicking a card opens the application on its own page instead of the side panel, so spec 013 replaces the panel for existing applications. It comes after the table view because it needs the router that spec 012 adds.
- 2026-10-02: Spec 013 removes the side panel entirely. Cards and rows open the application's page, adding and editing use a dialog, and the timeline, contacts, and requirements are sections of the page. The page's back link and delete go back to the view it was opened from, and to the board when that is unknown.
- 2026-10-02: Keyboard dragging is in scope from spec 016, which changes spec 006's "mouse only" decision.
- 2026-10-02: Still out of scope for specs 010 to 017: currencies other than USD, archiving, fetching company logos from the internet, and accounts or a profile menu.
- 2026-10-02: Requirements are managed in a Requirements tab in the side panel. Each has text, a required or preferred kind, and a met checkbox. They list required first, then preferred, in the order added. A count shows at the top of the tab, not on cards.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved the open questions (see Decided) and approved.
- 2026-10-01: Split the job details out of 002 into a new spec 003, and renumbered the specs after it (004–007).
- 2026-10-01: Marked 003 implemented.
- 2026-10-01: Added spec 004, logging and observability, and renumbered the specs after it (005–008).
- 2026-10-01: Added spec 005, file restructure, and renumbered the specs after it (006–009).
- 2026-10-01: Marked 005 implemented.
- 2026-10-01: Narrowed 006 to moving cards between columns with the mouse. Reordering and touch or keyboard dragging moved to "Later, maybe".
- 2026-10-01: Marked 006 implemented.
- 2026-10-01: Decisions for 007 added.
- 2026-10-02: Marked 007 implemented.
- 2026-10-02: Decisions for 008 added.
- 2026-10-02: Marked 008 implemented.
- 2026-10-02: Decisions for 009 added.
- 2026-10-02: Marked 009 implemented. All planned specs are done.
- 2026-10-02: Added specs 010–017 for the UI features.
- 2026-10-02: Marked 010 implemented.
- 2026-10-02: Marked 011 implemented.
- 2026-10-02: Marked 012 implemented.
- 2026-10-02: Marked 013 implemented.
