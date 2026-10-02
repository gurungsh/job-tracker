# 011: Stage colors and richer cards (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented      |
| Updated | 2026-10-02         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

Each stage gets two color tokens, `--stage` and `--stage-soft`, set by a `data-stage` attribute, so any element can take its stage's colors by carrying the attribute. Both themes are covered with CSS `light-dark()`, which works because spec 010 sets `color-scheme` per theme. Stage icons come from an icon library, and the card is rebuilt from small pieces: a company badge, and plain helper functions for initials, color, pay, and time in stage. Nothing is stored and no server code changes.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| Stage colors | `[data-stage="…"]` rules in `styles/global.css` using `light-dark(light, dark)` | One rule per stage covers both themes, and any component can use it (AC-1, AC-2, AC-11) | A token pair per theme: twice the rules |
| Stage icons | `lucide-react`, importing the eight icons by name (Bookmark, Send, Search, Users, CircleCheck, Trophy, CircleX, Undo2), plus Clock | The owner chose an icon library (roadmap). Named imports keep the bundle small | Inline SVGs: decided against |
| Where stage UI lives | `lib/stageIcons.ts` for the icon map, `components/StageBadge.tsx` for the badge | Both are reused by the table view and sidebar specs. The badge is not used on board cards (AC-2) and is kept for the table view | Inline in `Card.tsx`: repeated later. Deleting the badge now: it is rebuilt for the table |
| Company badge | `components/CompanyAvatar.tsx` with pure `companyInitials()` and `companyHue()` in `lib/companyAvatar.ts` | Pure functions are easy to test (AC-4, AC-5) | Logic inside the component |
| Badge color | A hue from a hash of the lowercased name, 12 steps of 30 degrees, applied as `--hue` and used with `light-dark()` lightness for background and text | Stable per name, readable in both themes, nothing fetched (AC-5, AC-11, AC-12) | A fixed palette index: collides more |
| Compact pay | `compactSalary()` in `lib/salary.ts`, next to `salarySummary()` | Same file, same inputs, different wording (AC-7) | Changing `salarySummary`: the side panel keeps its long form |
| Time in stage | Existing `daysInStage()` in `lib/dates.ts`, plus a short formatter | Already counts local calendar days (AC-9) | A new calculation |
| Columns | Keep the neutral `--column-bg`. Only the header gets color | AC-1 asks for a neutral column | Tinted columns: reads as noise |
| New dependencies | `lucide-react` in `apps/client` | Stage icons (AC-1). Justified above | None |

## Data model

No change. No API change.

## UI

- `styles/global.css`: eight `[data-stage]` rules with `--stage` and `--stage-soft`. Colors are chosen so `--stage` on `--stage-soft`, on `--surface`, and on `--column-bg` is at least 4.5 to 1 in both themes (AC-11).
- `lib/stageIcons.ts`: `STAGE_ICONS: Record<Stage, LucideIcon>`.
- `components/StageBadge.tsx` (+ `.css`): the stage name on `--stage-soft` in `--stage`, carrying `data-stage`. Not shown on board cards (AC-2). Kept, with its test, for the table view.
- `lib/companyAvatar.ts`: `companyInitials(name)` (first two words, minor words skipped, capitals, `?` fallback) and `companyHue(name)` (AC-4, AC-5).
- `components/CompanyAvatar.tsx` (+ `.css`): decorative (`aria-hidden`) initials in a rounded badge colored by `--hue` (AC-3, AC-5).
- `Card.tsx` (+ `Card.css`): header (avatar and company name), title, details line (location • work mode • employment type, with "Contract · N mo"), compact pay line, next step and due date as now, and a footer with only a clock and the time in stage (title attribute "Time in this stage") (AC-3, AC-6 to AC-9, AC-13). Dragging and clicking are untouched (AC-10).
- `Board.tsx`: each column gets `data-stage`, and its header shows the stage icon, name, and count in `--stage` (AC-1).
- No change to `ApplicationPanel`.

## Shared types

None. Labels already exist in `packages/shared` (`STAGE_LABELS`, `WORK_MODE_LABELS`, `EMPLOYMENT_TYPE_LABELS`).

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI (`Board.test.tsx`) + unit (contrast test) | Each column header has its icon, name, count, and `data-stage`. All eight stage colors and icons differ. Column background stays neutral |
| AC-2 | UI (`Card.test.tsx`, `Board.test.tsx`) | A card shows no stage badge and doesn't repeat the stage name. `StageBadge.test.tsx` still covers the component for the table view |
| AC-3 | UI | The card shows the initials badge, then the company name |
| AC-4 | unit (`companyAvatar.test.ts`) | One word, two words, minor words, a name of only minor words, non-Latin and emoji, and the `?` fallback |
| AC-5 | unit | The same hue for any capitalization, 12 possible hues, different names spread over several hues |
| AC-6 | UI + unit | Each combination of location, work mode, and employment type, contract length shown, and no line when all are empty |
| AC-7 | unit (`salary.test.ts`) | Every form in the spec, whole thousands with "k", other amounts in full, and no pay giving an empty result |
| AC-8 | UI | Next step, due date, and the overdue marker are as before |
| AC-9 | UI + unit | "Today", "1 day", "N days", with the clock icon and its tooltip |
| AC-10 | UI | After a drop or a stage change in the panel, the badge and column color match the new stage. Existing drag and click tests pass |
| AC-11 | unit (`contrast.test.ts`, extended) | Stage text on its tint, on the card, and on the column background, and the badge's initials in all 12 hues, at least 4.5 to 1 in both themes |
| AC-12 | browser | No network request other than the app's own while the board loads |
| AC-13 | browser | A very long company name and title keep the card within its column |
| Browser | Playwright run by the assistant | The flows above, in both themes, against the production build and a Docker image copy |

## Risks and mitigations

- A palette that looks fine can fail contrast in one theme: the extended contrast test fails the build, and the fix is to adjust the color.
- `light-dark()` needs a recent browser: it has been supported in all major browsers since 2024, and spec 010's `color-scheme` is already required for it.
- A new dependency adds weight: icons are imported by name, and the build size is checked before and after.
- Existing specs say cards show only company, title, next step, and due date: their changelogs get a note that spec 011 changes the card (a task below).
- Card text tests look for text such as the company name: the initials badge is `aria-hidden`, so accessible names don't change.

## New dependencies

| Package | Workspace | Why |
| ------- | --------- | --- |
| `lucide-react` | `apps/client` | The eight stage icons and the clock (AC-1, AC-9), as chosen for the roadmap. Imported by name so unused icons aren't bundled |
