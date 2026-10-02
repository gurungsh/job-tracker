# Roadmap

| Field   | Value      |
| ------- | ---------- |
| Status  | Approved   |
| Updated | 2026-10-01 |

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
| 007 | Activity timeline | Log notes, emails, calls, and interviews on an application, and see stage changes recorded automatically. | 002 |
| 008 | Contacts | Keep the people at each company, see them on that company's applications, and link activities to them. | 002, 007 |
| 009 | Requirements checklist | List a posting's required and preferred items, and check off the ones I meet. | 002 |

## Later, maybe

These ideas aren't scheduled. They will get a number only when they're picked up.

- Archiving closed applications, so the board stays focused on active ones
- Search and filtering on the board
- A "what's next" view that lists upcoming next steps by due date
- Editing company details, such as website, industry, and notes
- Reordering cards within a column by hand, and keeping that order
- Dragging on touch screens and with the keyboard

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
