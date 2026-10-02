# Project Constitution

These are the durable rules for job-tracker. Every spec, plan, and task list inherits them.
To change a rule, edit this file on a feature branch and get it reviewed like any other change.

## 1. Product vision

job-tracker is a **personal, single-user** app for tracking job applications: where I applied, what stage each one is at, and what happens next.

- It runs locally, with no authentication and no multi-tenancy.
- Data lives in a local SQLite file that I own.
- Small, useful slices beat big features. Each spec should deliver something usable on its own.

## 2. Tech stack

| Layer    | Choice                                                              |
| -------- | ------------------------------------------------------------------- |
| Language | TypeScript (strict mode) everywhere                                 |
| Runtime  | Node.js 24 LTS                                                      |
| Repo     | npm workspaces monorepo: `apps/server`, `apps/client`, `packages/shared` |
| Backend  | Express                                                             |
| Database | SQLite                                                              |
| Frontend | React, built with Vite                                              |
| Testing  | Vitest                                                              |
| Packaging | Docker Compose, single image, run locally only                     |

Library-level choices, such as the SQLite driver, validation, and test helpers, are made in a feature's `plan.md` and recorded there.
Adding a new runtime dependency requires a line in the plan explaining why.

## 3. Engineering conventions

- **Types are shared, not duplicated.** API request and response shapes live in `packages/shared`.
- **Validate at the boundary.** The server validates every request body and query. It never trusts the client.
- **Schema changes go through migrations.** Migrations are versioned, forward-only SQL files, and the database is never edited by hand.
- **Tests come with the code.** Every acceptance criterion has at least one automated test unless the spec says otherwise.
- **Tests live apart from the code.** Each package keeps its tests and test helpers in a `tests/` folder beside `src/`, mirroring `src/`'s folders. `src/` holds only code that ships.
- **Styles sit beside their component.** A client component's CSS is a file next to it, imported by that component. Only app-wide styles go in `styles/global.css`.
- **Prefer simple code.** Use no abstraction until a second use case exists.
- **Language:** American English and USD in code, UI, docs, and commit messages.

## 4. Spec-driven workflow

Every feature lives in `docs/specs/NNN-short-name/` with three documents:

| File       | Answers         | Written when                 |
| ---------- | --------------- | ---------------------------- |
| `spec.md`  | What and why?   | First. No implementation details. |
| `plan.md`  | How?            | After the spec is approved.  |
| `tasks.md` | In what steps?  | After the plan is approved.  |

**Gates:** no plan before the spec is approved, no tasks before the plan is approved, and no code before the tasks are approved.

**Numbering:** specs are numbered sequentially (`000`, `001`, ...), and numbers are never reused. `short-name` is kebab-case and matches the branch name.

**Status lifecycle** (in the `spec.md` header):

```
Draft → Approved → In Progress → Implemented
                                └→ Superseded (by NNN)
```

**When reality diverges from the spec:** update the spec, plan, or tasks in the same branch, and call out the change in the review. The docs must describe what was actually built.

## 5. Branching and review

```
main          ← stable; merged from development after owner approval
development   ← integration; feature branches merge here after review
feature/<short-name>  ← one per spec, branched from development
```

- All work happens on `feature/<short-name>`.
- Commits are small, and each one leaves the build green where practical.
- **Merges need the owner's approval.** The assistant may merge a reviewed feature branch into `development`, or `development` into `main`, only after the owner explicitly approves that merge. It uses `--no-ff` and never deletes branches.
- Git is local-only for now, so review happens with `git diff development...feature/<short-name>`.

## 6. Definition of Done

A spec is `Implemented` when:

- [ ] Every task in `tasks.md` is checked off.
- [ ] Every acceptance criterion in `spec.md` has been verified, by an automated test or a recorded manual check.
- [ ] `npm test`, `npm run lint`, and `npm run typecheck` pass from the repo root.
- [ ] The spec, plan, and tasks match what was built.
- [ ] The spec status and `docs/specs/README.md` index are updated.
- [ ] The owner has reviewed the branch.
