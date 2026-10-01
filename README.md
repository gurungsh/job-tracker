# job-tracker

A personal tracker for job applications, built with spec-driven development.

- Stack: TypeScript, Express, React, and SQLite in an npm workspaces monorepo.
- Process: every feature starts as a spec in `docs/specs/`. See `docs/specs/README.md`.
- Plan: the planned features and their order are in `docs/roadmap.md`.

## Setup

Requires Node.js 24 or later.

```sh
npm install
npm run dev
```

`npm run dev` starts the API at `http://localhost:3000` and the web app at `http://localhost:5173`. The web app proxies `/api` requests to the API. Press Ctrl+C to stop both.

On first start, the server creates the SQLite database and applies any pending migrations.

## Run with Docker

Requires Docker with Compose. You don't need Node or `npm install`.

```sh
docker compose up --build --force-recreate
```

Open `http://localhost:8080`. The app is reachable only from this machine. Stop it with Ctrl+C or `docker compose down`. It doesn't restart on its own.

- **Data:** Docker's database is `data/docker/job-tracker.db`, kept separate from the one `npm run dev` uses. It survives rebuilds, and you can back it up by copying the folder while the app is stopped.
- **Always use `--force-recreate`.** Without it, Compose restarts a stopped container (for example, one stopped with Ctrl+C) on the old image, so code and migration changes are skipped.
- **Don't open Docker's database from your machine while the container is running.** SQLite's WAL mode can't coordinate across Docker's file sharing.
- **The log says port 3000.** That's the port inside the container. Use 8080 from your machine.
- **Linux:** the container runs as the `node` user (uid 1000). If Docker creates `data/docker/` as root, run `sudo chown 1000:1000 data/docker`. Docker Desktop on macOS doesn't need this.

## Production build without Docker

```sh
npm run build
npm start
```

`npm start` serves the built page and the API together at `http://localhost:3000`, using the same database as `npm run dev`. Run `npm run build` again after changing the client.

## Commands

| Command             | What it does                                       |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Starts the API and web app with reload on changes  |
| `npm run build`     | Builds the client for production                   |
| `npm start`         | Serves the production build and the API            |
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
