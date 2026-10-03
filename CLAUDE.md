# CLAUDE.md

This project practices **spec-driven development**, scaled to the size of the change. Read `docs/constitution.md` before doing any work.

## Workflow tiers

Pick the smallest tier that fits, and say which one in your first reply. If a tweak turns out to change behavior or stored data, stop and move it up a tier.

| Tier | What it covers | Documents | Owner review stops |
| ---- | -------------- | --------- | ------------------ |
| 1. Tweak | A bug fix, visual polish, a copy or rename change, or a test or docs fix. No new behavior and no new stored data. | None. The commit message says what and why. | The merge |
| 2. Feature | New or changed behavior, or new stored data, in about ten tasks or fewer. | `spec.md`, then one `plan.md` that ends with a Tasks checklist | The spec, then the plan and tasks together, then the merge |
| 3. Large feature | A data migration, or more than about ten tasks. | `spec.md`, `plan.md`, and `tasks.md` | Each document, then the merge |

Documents live in `docs/specs/NNN-short-name/`. Specs 000 to 016 follow the Tier 3 shape and stay as they are.

## Rules for the assistant

- For a Tier 2 or 3 feature, never write application code without an approved `spec.md` and `plan.md` (and `tasks.md` in Tier 3).
- Write one document at a time, then **stop and ask the owner to review it**. Do not move to the next document until it's approved. In Tier 2 the plan and its Tasks checklist count as one document.
- While drafting a spec, ask the owner questions rather than guessing about product behavior.
- Work only on `feature/<short-name>`, branched from `development`. Tweaks too.
- Merge only after the owner explicitly approves that specific merge: a reviewed feature branch into `development`, or `development` into `main`. Use `git merge --no-ff`, and never merge anything else into `main`. Approval of one merge doesn't carry over to the next.
- Never rebase onto, force-push, or delete `main`, `development`, or feature branches. The owner does that.
- Check off tasks as they're completed, in `tasks.md` (Tier 3) or the plan's Tasks checklist (Tier 2). If the implementation must diverge from the docs, update the docs in the same branch and point out the change.
- Keep `docs/specs/README.md`'s index table in sync with spec statuses.
- For every change, update the root `README.md` if it is required: when what the app does, its commands, configuration, API, or layout changes, or when an existing line there is no longer true. Do it in the same branch.
- Use American English and USD.

## Keeping work small

- **Tests while working:** run only the tests for what you changed, such as `npx vitest run <file>`.
- **Checks before committing done work:** run `npm test`, `npm run lint`, and `npm run typecheck` one after another, never at the same time, and commit as done only when all three pass. Do this for the last commit of a tweak or a feature, and before asking for any merge.
- **Browser checks:** component tests are the main proof. After a feature, run one short smoke script (the main path, about 15 checks) against the production build, in one theme. Run both themes and the Docker image check only when merging `development` into `main`. Look at screenshots only to judge layout.
- **Docs:** change an earlier spec's changelog only when one of its acceptance criteria is no longer true. Each feature gets one roadmap line and one index row.
- **Edits:** change what needs changing. Don't rewrite whole files, and don't re-read a file you just edited.
- **Reports:** keep them short. For a tweak, a few lines. For a feature, what changed, what to look at, anything that differs from the plan, and the merge question. Don't restate the diff.
- **Sessions:** one feature per session. When a session gets long, tell the owner it's a good point to start a fresh one, since the docs carry the context.

## Commands

- `npm run dev`: start the API and web app
- `npm run build`, then `npm start`: build and run the production app on port 3000
- `docker compose up --build --force-recreate`: run the production app in Docker on port 8080
- `npm test`, `npm run lint`, and `npm run typecheck`: these must all pass before a tweak or feature is committed as done (see "Keeping work small")
