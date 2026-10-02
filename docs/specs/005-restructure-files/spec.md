# 005: File restructure

| Field   | Value                                     |
| ------- | ----------------------------------------- |
| Status  | Implemented                               |
| Branch  | `feature/restructure-files`               |
| Created | 2026-10-01                                |
| Updated | 2026-10-01                                |
| Depends | [000](../000-project-foundation/spec.md) through [004](../004-logging/spec.md) |

> The spec covers **what** and **why** only. The target folder tree and the config changes belong in `plan.md`.

## Problem

Source files, tests, and styles are mixed together. The client's source folder holds about 30 files side by side: components, helpers, tests, test helpers, and one 400-line stylesheet for the whole app. The server and shared packages keep each test next to the file it tests. This makes it hard to see what ships and what only tests it, and the single stylesheet makes it hard to tell which styles belong to which component. Every feature after this one adds more files, so it is cheaper to fix the layout now.

## Goals

- Tests live apart from the code they test, in every package.
- Each client component's styles sit beside that component, not in one app-wide stylesheet.
- Client files are grouped by kind (components, helpers, global styles) instead of one flat folder.
- The layout rule is written down so later specs follow it.
- The app behaves exactly as before.

## Non-goals (out of scope)

- Any change to behavior, UI, API, database, or logs.
- Renaming components, functions, or exported names.
- Adding or removing dependencies.
- Rewriting or adding tests, other than moving them and fixing their imports.
- Redesigning the look of the app. The styles are split, not changed.
- Updating the text of specs 000–004 that mention old file paths. They stay as a record of what was built then.

## User stories

- **US-1:** As the owner, I want tests kept apart from source files, so that I can see at a glance what the app ships.
- **US-2:** As the owner, I want each component's styles next to the component, so that I can change one without scanning the whole stylesheet.
- **US-3:** As the owner, I want a written layout rule, so that future features land in the right place.
- **US-4:** As the owner, I want the move to change nothing for users, so that I can trust it is only a reorganization.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** any package (client, server, or shared)
  - **When** I list its source folder
  - **Then** it contains no test files and no test helpers, and every test and test helper is in that package's separate tests folder, which mirrors the source layout.
- **AC-2** (US-2)
  - **Given** a client component that has its own styles
  - **When** I look at where that component lives
  - **Then** its styles are in a stylesheet beside it, and the component imports that stylesheet.
- **AC-3** (US-2)
  - **Given** the styles that apply to the whole app, such as the page background, fonts, and base form controls
  - **When** I look for them
  - **Then** they are in one global stylesheet, and the old single stylesheet is gone.
- **AC-4** (US-1)
  - **Given** the client source folder
  - **When** I list it
  - **Then** components, helper modules, and global styles are each in their own folder instead of one flat list.
- **AC-5** (US-4)
  - **Given** the restructured code
  - **When** I run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`
  - **Then** all pass, and the number of tests is the same as before the move.
- **AC-6** (US-4)
  - **Given** the restructured app, run in development, in production, and in Docker
  - **When** I walk through the board, a card, the application form, the delete confirmation, and the crash screen
  - **Then** every screen looks and behaves the same as before the move.
- **AC-7** (US-3)
  - **Given** the constitution
  - **When** I read its engineering conventions
  - **Then** they state where tests, test helpers, and component styles go.
- **AC-8** (US-4)
  - **Given** the moved files
  - **When** I run `git diff -M --stat development...feature/restructure-files`
  - **Then** the files show as renames, so their history is kept.
- **AC-9** (US-1)
  - **Given** the production client build
  - **When** I search the built files for test code and fake data, such as the fake server and test setup
  - **Then** none is found. This is a one-time manual check, recorded in the spec's changelog when done.

## Data and rules

- Nothing about the app's data changes. This spec only moves files and rewrites the paths that point at them.
- Each package keeps one clear place for shipped code and one for tests. The server's entry point stays runnable the way the Docker image and `npm start` run it today.
- A component's styles are the rules that only that component uses. Rules shared by the whole app are global.

## Edge cases

- **Style order:** The browser applies a later rule over an earlier one. Splitting the stylesheet must not change which rule wins anywhere. The old file has a few selectors defined twice, and these need extra care.
- **Styles used by more than one component:** A rule used by two components, such as the form field styles, goes with the component that owns it, or into the global styles if neither does. The plan decides each case.
- **Test setup:** The client's test setup file and fake server move with the tests, and the test runner must still find them.
- **Tooling globs:** Lint, typecheck, and test settings that name a source folder must also cover the new tests folders. Otherwise tests would silently stop being checked.
- **Docs that cite paths:** The README and current docs must not point at files that no longer exist.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should the shipped client build be checked to confirm no test code or fake data ends up in it? Yes, as a one-time manual check, since the tests folders sit outside `src` (owner, 2026-10-01). See AC-9.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved the open question: the build is checked once for test code (added AC-9).
- 2026-10-01: Approved.
- 2026-10-01: AC-9 checked: the production client build has no test code or fake data.
- 2026-10-01: AC-6 checked by the owner in all three run modes. Marked Implemented.
