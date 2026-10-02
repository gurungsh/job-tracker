# Specs

Every feature in job-tracker begins here, before any code is written. Small changes, such as a bug fix or visual polish, don't need a spec. The rules behind this process, including the three workflow tiers, are in [`../constitution.md`](../constitution.md) and [`../../CLAUDE.md`](../../CLAUDE.md), and the planned order of specs is in [`../roadmap.md`](../roadmap.md).

## The loop

```
 ┌─────────┐  approve  ┌─────────┐  approve  ┌──────────┐  approve  ┌───────────┐  review  ┌──────────────┐
 │ spec.md │ ────────► │ plan.md │ ────────► │ tasks.md │ ────────► │ implement │ ───────► │    merge     │
 └─────────┘           └─────────┘           └──────────┘           └───────────┘          └──────────────┘
  what & why            how                   ordered steps          feature branch          into development
```

1. **Spec:** describe the problem, the user stories, and testable acceptance criteria. Leave out implementation details. Resolve open questions before approving.
2. **Plan:** choose the technical approach (data model, API, UI, tests) and trace every decision to an acceptance criterion.
3. **Tasks:** break the plan into small, ordered, checkable steps, each tied to an acceptance criterion. A feature of about ten tasks or fewer (Tier 2) keeps them as a Tasks checklist at the end of `plan.md`, and the plan and tasks are reviewed together. Only a larger feature (Tier 3) gets its own `tasks.md`.
4. **Implement:** work through the tasks on `feature/<short-name>`, checking them off as they're done.
5. **Review:** the owner reviews the diff and approves the merge. Then it's merged into `development`, by the owner or by the assistant.

## Starting a new feature

```sh
git checkout development
git checkout -b feature/<short-name>
mkdir docs/specs/NNN-<short-name>
cp docs/specs/_templates/spec.md docs/specs/NNN-<short-name>/spec.md
```

Copy `plan.md` from the template only after the spec is approved. Copy `tasks.md` only for a Tier 3 feature, after the plan is approved. Specs 000 to 016 were written in the Tier 3 shape and stay as they are.

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
| 012 | [Table view](012-table-view/)                  | Implemented | `feature/table-view`         |
| 013 | [Application detail page](013-application-detail-page/) | Implemented | `feature/application-detail-page` |
| 014 | [App shell and sidebar](014-app-shell-sidebar/) | Implemented | `feature/app-shell-sidebar` |
| 015 | [Add button in the sidebar](015-add-button-sidebar/) | Implemented | `feature/add-button-sidebar` |
| 016 | [Detail page redesign](016-detail-page-redesign/) | Implemented | `feature/detail-page-redesign` |
