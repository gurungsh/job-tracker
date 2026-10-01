# Specs

Every feature in job-tracker begins here, before any code is written. The rules behind this process are in [`../constitution.md`](../constitution.md).

## The loop

```
 ┌─────────┐  approve  ┌─────────┐  approve  ┌──────────┐  approve  ┌───────────┐  review  ┌──────────────┐
 │ spec.md │ ────────► │ plan.md │ ────────► │ tasks.md │ ────────► │ implement │ ───────► │    merge     │
 └─────────┘           └─────────┘           └──────────┘           └───────────┘          └──────────────┘
  what & why            how                   ordered steps          feature branch          into development
```

1. **Spec:** describe the problem, the user stories, and testable acceptance criteria. Leave out implementation details. Resolve open questions before approving.
2. **Plan:** choose the technical approach (data model, API, UI, tests) and trace every decision to an acceptance criterion.
3. **Tasks:** break the plan into small, ordered, checkable steps, each tied to an acceptance criterion.
4. **Implement:** work through the tasks on `feature/<short-name>`, checking them off as they're done.
5. **Review:** the owner reviews the diff and approves the merge. Then it's merged into `development`, by the owner or by the assistant.

## Starting a new feature

```sh
git checkout development
git checkout -b feature/<short-name>
mkdir docs/specs/NNN-<short-name>
cp docs/specs/_templates/spec.md docs/specs/NNN-<short-name>/spec.md
```

Copy `plan.md` and `tasks.md` from the templates only after the previous document is approved.

## Index

| #   | Spec                                            | Status | Branch                       |
| --- | ----------------------------------------------- | ------ | ---------------------------- |
| 000 | [Project foundation](000-project-foundation/)   | Implemented | `feature/project-foundation` |
