# CLAUDE.md

This project practices **spec-driven development**. Read `docs/constitution.md` before doing any work.

## Rules for the assistant

- Never write application code without an approved `spec.md`, `plan.md`, and `tasks.md` in `docs/specs/NNN-short-name/`.
- Write one document at a time, then **stop and ask the owner to review it**. Do not move to the next document until it's approved.
- While drafting a spec, ask the owner questions rather than guessing about product behavior.
- Work only on `feature/<short-name>`, branched from `development`.
- Merge only after the owner explicitly approves that specific merge: a reviewed feature branch into `development`, or `development` into `main`. Use `git merge --no-ff`, and never merge anything else into `main`. Approval of one merge doesn't carry over to the next.
- Never rebase onto, force-push, or delete `main`, `development`, or feature branches. The owner does that.
- Check off tasks in `tasks.md` as they're completed. If the implementation must diverge from the docs, update the docs in the same branch and point out the change.
- Keep `docs/specs/README.md`'s index table in sync with spec statuses.
- Use American English and USD.

## Commands

- `npm run dev`: start the API and web app
- `npm run build`, then `npm start`: build and run the production app on port 3000
- `docker compose up --build --force-recreate`: run the production app in Docker on port 8080
- `npm test`, `npm run lint`, and `npm run typecheck`: these must pass before a task is marked done
