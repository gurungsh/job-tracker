# 001: Run the app in Docker

| Field   | Value                                             |
| ------- | ------------------------------------------------- |
| Status  | Implemented                                       |
| Branch  | `feature/docker`                                  |
| Created | 2026-10-01                                        |
| Updated | 2026-10-01                                        |
| Depends | [000: Project foundation](../000-project-foundation/) |

> The spec covers **what** and **why** only. Choices like library names, file paths, and table designs belong in `plan.md`.

## Problem

Today the app only runs through `npm run dev`. That needs a Node install, two dev processes, and a terminal kept open. For day-to-day use, I want to start the whole app with one command and leave it running, without a development setup. My data must stay on my own machine, in a file I can see and back up.

## Goals

- One command builds and starts the app in a single Docker container.
- The page and the API are served together from one address, `http://localhost:8080`.
- The database file lives in a folder on my machine. It survives stopping, removing, and rebuilding the container.
- Pending migrations are applied when the container starts, just as they are under `npm run dev`.
- `npm run dev` keeps working exactly as it does now.
- The same production build can also run without Docker, through `npm run build` and `npm start`.

## Non-goals (out of scope)

- Developing inside Docker, including hot reload or mounted source code.
- Publishing the image to a registry, deploying it to a server, or running it anywhere but my own machine.
- HTTPS, authentication, or access from other devices on the network.
- Backups, or any database tooling beyond what spec 000 provides.
- Running the database as a separate container. SQLite is a file the server opens, not a service.
- Restarting automatically. The container runs only when I start it, and it stays stopped after a reboot or a Docker restart.

## User stories

- **US-1:** As the user, I want to start the app with one Docker command, so that I can use it without a development setup.
- **US-2:** As the user, I want my data kept in a folder on my machine, so that it survives container rebuilds and I can back it up.
- **US-3:** As the developer, I want schema migrations to run automatically when the container starts, so that upgrading means rebuilding and restarting.
- **US-4:** As the developer, I want `npm run dev` unchanged and Docker's data kept separate from it, so that development stays fast and test data never mixes with real data.
- **US-5:** As the developer, I want to build and run the production app without Docker, so that I can check the production build quickly.

## Acceptance criteria

- **AC-1** (US-1)
  - **Given** Docker is installed and the repo is cloned, with no `npm install` needed
  - **When** I run `docker compose up --build --force-recreate` from the repo root
  - **Then** a single container starts, and `http://localhost:8080` shows the "Job Tracker" page.
- **AC-2** (US-1)
  - **Given** the container is running
  - **When** I request `http://localhost:8080/api/health`
  - **Then** I get a 200 response with `{"status":"ok"}`. An unknown `/api` path still returns a 404 JSON error.
- **AC-3** (US-2)
  - **Given** the host data folder has no database file
  - **When** the container starts
  - **Then** the database file is created in the host data folder, and all migrations are applied to it. This file is separate from the one `npm run dev` uses, and the `npm run dev` database is not created or changed.
- **AC-4** (US-2)
  - **Given** the container has created and migrated the database
  - **When** I stop and remove the container, rebuild the image, and start it again
  - **Then** the same database file is used, and its existing contents (including the migration records) are unchanged.
- **AC-5** (US-3)
  - **Given** a database on which every migration has been applied, and a new migration file added to the repo
  - **When** I rebuild and restart the container
  - **Then** only the new migration is applied.
- **AC-6** (US-3)
  - **Given** a migration fails
  - **When** the container starts
  - **Then** the container exits with an error that names the failing migration, instead of serving the app.
- **AC-7** (US-1)
  - **Given** the container is running
  - **When** I run `docker compose down` or press Ctrl+C on `docker compose up`
  - **Then** the container stops within 5 seconds.
- **AC-8** (US-2)
  - **Given** a database file exists in the repo's data folder on my machine
  - **When** the image is built
  - **Then** the image contains no database files.
- **AC-9** (US-4)
  - **Given** the Docker changes are in place
  - **When** I run `npm run dev`, `npm test`, `npm run lint`, and `npm run typecheck`
  - **Then** they behave exactly as they did after spec 000.
- **AC-10** (US-5)
  - **Given** dependencies are installed
  - **When** I run `npm run build` and then `npm start` from the repo root
  - **Then** one server process serves the "Job Tracker" page and the API from `http://localhost:3000`, using the same database location as `npm run dev`.
- **AC-11** (US-5)
  - **Given** `npm run build` hasn't been run
  - **When** I run `npm start`
  - **Then** the server exits with a message saying to run `npm run build` first.

## Data and rules

- The app in the container is the production build. The server serves the built client and the API from one port.
- Inside the container, the app listens on one port, which is published on the host as `8080`.
- Docker's database file lives in its own folder on the host, inside the repo's gitignored data folder, and that folder is mounted into the container. It is separate from the file `npm run dev` and `npm start` use.
- `npm start` runs the production build outside Docker. It uses the same defaults as `npm run dev` (port 3000 and the default database path), and the `PORT` and `DATABASE_PATH` overrides still apply.
- No schema changes. This spec adds no migrations.

## Edge cases

- The host data folder doesn't exist: it is created when the container starts.
- Port 8080 is already in use on the host: `docker compose up` fails with Docker's port error and doesn't start a container.
- The image is rebuilt while the container is running: the running container is unaffected until it is restarted.
- A page path that isn't `/api`, such as `/applications/5`, returns the client's page, so client-side routes work in later specs.

## Verification

AC-1, AC-3, AC-4, AC-5, AC-6, and AC-8 need Docker running, so they are verified by recorded manual checks instead of automated tests in `npm test`. AC-2, AC-7, and AC-10 have automated tests for the server behavior plus a manual check against the container or the production build. AC-9 is a manual check that the existing commands still work.

## Open questions

Resolve these before setting the status to `Approved`.

- [x] Should Docker and `npm run dev` share a database file? **No.** Docker uses its own file (see AC-3 and "Data and rules").
- [x] Should the container restart automatically? **No.** Listed under non-goals.
- [x] Should the production build also run without Docker? **Yes.** Added US-5, AC-10, and AC-11.

## Changelog

- 2026-10-01: Draft created.
- 2026-10-01: Resolved open questions: separate Docker database, no automatic restart, and `npm run build` plus `npm start` added (US-5, AC-10, AC-11).
- 2026-10-01: Approved.
- 2026-10-01: Implementation started.
- 2026-10-01: Added the Verification section, which lists the criteria checked manually because they need Docker.
- 2026-10-01: Changed the start command in AC-1 to `docker compose up --build --force-recreate`. Without `--force-recreate`, Compose restarts a stopped container (for example, one stopped with Ctrl+C) on the old image, so code and migration changes are silently skipped.
- 2026-10-01: Implemented and reviewed by the owner.
