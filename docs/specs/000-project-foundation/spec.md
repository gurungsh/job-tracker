# 000: Project foundation

| Field   | Value                         |
| ------- | ----------------------------- |
| Status  | Implemented                   |
| Branch  | `feature/project-foundation`  |
| Created | 2026-10-01                    |
| Updated | 2026-10-01                    |
| Depends | None                          |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

The repo has a constitution and spec templates, but no code yet. Every later feature needs the same base: a server, a web app, shared types, a local database with migrations, and the commands from the Definition of Done (`npm test`, `npm run lint`, and `npm run typecheck`). Building that base once, in its own spec, keeps feature specs focused on features and makes the Definition of Done checkable from the first feature on.

## Goals

- A developer can clone the repo, install dependencies, and start the server and web app with one command.
- `npm test`, `npm run lint`, and `npm run typecheck` exist at the repo root and pass.
- The server creates the local SQLite database on first start and applies any pending migrations, so later specs only need to add migration files.
- The web app and server can share TypeScript types from the shared package.

## Non-goals (out of scope)

- Any job-tracking feature, such as adding, listing, or editing applications. That starts in spec 001.
- Any user-visible page beyond a placeholder. There is no status or health page in the web app.
- Authentication, deployment, Docker, CI, or a hosted database.
- Developer extras: code formatting scripts, a database reset script, and a production build or start script.

## User stories

- **US-1:** As the developer, I want to start the whole app with one command, so that I can work on features without setting things up by hand.
- **US-2:** As the developer, I want test, lint, and typecheck commands at the repo root, so that I can check the Definition of Done for every task.
- **US-3:** As the developer, I want the database to be created and migrated automatically, so that schema changes in later specs need only a new migration file.
- **US-4:** As the developer, I want my data file kept out of git, so that personal job data is never committed.
- **US-5:** As the developer, I want to point the server at a different database file, so that tests and experiments don't touch my real data.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** a fresh clone with dependencies installed
  - **When** I run `npm run dev` from the repo root
  - **Then** the server and the web app both start, and the web app loads a placeholder page in the browser.
- **AC-2** (US-1)
  - **Given** the dev server is running
  - **When** a client sends a request to a server health endpoint
  - **Then** the server responds successfully with a body whose type is defined in the shared package.
- **AC-3** (US-2)
  - **Given** a fresh clone with dependencies installed
  - **When** I run `npm test`, `npm run lint`, and `npm run typecheck` from the repo root
  - **Then** each command runs across all three workspaces and exits successfully.
- **AC-4** (US-2)
  - **Given** a deliberate type error in any workspace
  - **When** I run `npm run typecheck`
  - **Then** the command fails and names the file with the error.
- **AC-5** (US-3)
  - **Given** no database file exists
  - **When** the server starts
  - **Then** it creates the database file in the repo's local data location and applies all migrations.
- **AC-6** (US-3)
  - **Given** a database on which every migration has already been applied
  - **When** the server starts again
  - **Then** no migration is applied a second time and existing data is unchanged.
- **AC-7** (US-3)
  - **Given** a migration fails partway through
  - **When** the server starts
  - **Then** the server does not start, reports which migration failed, and leaves the database as it was before that migration.
- **AC-8** (US-4)
  - **Given** the server has created the database file
  - **When** I run `git status`
  - **Then** the database file and its side files are not listed as untracked.
- **AC-9** (US-5)
  - **Given** the database location environment variable is set to a path
  - **When** the server starts
  - **Then** it creates and migrates the database at that path, and does not create or change the default database file.

## Data and rules

- There is one local SQLite database file. By default it lives inside the repo in a dedicated data folder that git ignores.
- An environment variable can override the database file's location. When it is unset, the default location is used.
- Migrations are versioned, forward-only SQL files applied in order. The database records which migrations have been applied.
- The foundation adds no domain tables. The only stored data is migration bookkeeping.
- Runtime targets Node.js 24 LTS with TypeScript strict mode in every workspace (from the constitution).

## Edge cases

- The data folder doesn't exist yet: the server creates it. The same applies to the parent folder of an overridden database path.
- The configured port is already in use: the server exits with a clear message instead of failing silently.
- Migration files are added out of order (a lower version after a higher one was applied): the server refuses to start and names the file.
- `npm run dev` is stopped with Ctrl+C: both the server and the web app shut down.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should the foundation include any extras (formatting, DB reset, production build)? **No.** Listed under non-goals.
- [x] Is a server health endpoint (AC-2) acceptable without a status page? **Yes.**
- [x] Should the database location be overridable by an environment variable? **Yes.** Added US-5 and AC-9.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved open questions: no extras, health endpoint kept, database location override added (US-5, AC-9).
- 2026-10-01: Approved.
- 2026-10-01: Implementation started.
- 2026-10-01: Implemented and reviewed by the owner.
