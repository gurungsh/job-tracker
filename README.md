# job-tracker

A personal tracker for job applications, built with spec-driven development.

- Stack: TypeScript, Express, React, and SQLite in an npm workspaces monorepo.
- Process: every feature starts as a spec in `docs/specs/`. See `docs/specs/README.md`.

## Setup

Requires Node.js 24 or later.

```sh
npm install
npm run dev
```

`npm run dev` starts the API at `http://localhost:3000` and the web app at `http://localhost:5173`. The web app proxies `/api` requests to the API. Press Ctrl+C to stop both.

On first start, the server creates the SQLite database and applies any pending migrations.

## Commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Starts the API and web app with reload on changes  |
| `npm test`          | Runs all tests in every workspace                  |
| `npm run lint`      | Lints the whole repo                               |
| `npm run typecheck` | Typechecks every workspace                         |

## Configuration

| Variable        | Default                | Purpose                                       |
| --------------- | ---------------------- | --------------------------------------------- |
| `PORT`          | `3000`                 | The API's port. The client's dev proxy expects `3000`. |
| `DATABASE_PATH` | `data/job-tracker.db`  | The SQLite file. The `data/` folder is gitignored. |

## Layout

```
apps/server        Express API (run directly with Node's TypeScript support)
apps/server/migrations   Versioned SQL migrations: NNNN_snake_case.sql
apps/client        React app built with Vite
packages/shared    Types shared by the API and web app
docs/              Constitution and feature specs
```
