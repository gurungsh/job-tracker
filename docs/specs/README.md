# Specs

Every feature in job-tracker begins here, before any code is written. The rules behind this process are in [`../constitution.md`](../constitution.md), and the planned order of specs is in [`../roadmap.md`](../roadmap.md).

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
| 001 | [Run the app in Docker](001-docker/)             | Implemented | `feature/docker`             |
| 002 | [Applications board](002-applications-board/)   | Implemented | `feature/applications-board` |
| 003 | [Job details](003-job-details/)                 | Implemented | `feature/job-details`        |
| 004 | [Logging and observability](004-logging/)      | Implemented | `feature/logging`            |
| 005 | [File restructure](005-restructure-files/)     | Implemented | `feature/restructure-files`  |
| 006 | [Board drag and drop](006-board-drag-drop/)    | Implemented | `feature/board-drag-drop`    |
| 007 | [Activity timeline](007-activity-timeline/)    | Implemented | `feature/activity-timeline`  |
| 008 | [Contacts](008-contacts/)                      | Implemented | `feature/contacts`           |
| 009 | [Requirements checklist](009-requirements-checklist/) | Implemented | `feature/requirements-checklist` |
| 010 | [Light and dark themes](010-themes/)           | Implemented | `feature/themes`             |
| 011 | [Stage colors and richer cards](011-stage-colors-cards/) | Implemented | `feature/stage-colors-cards` |
