# 010: Light and dark themes (plan)

| Field   | Value              |
| ------- | ------------------ |
| Spec    | [spec.md](spec.md) |
| Status  | Implemented      |
| Updated | 2026-10-02         |

> The plan covers **how**. Every section should trace back to acceptance criteria (AC-n) in the spec.

## Approach

The app's colors already live in tokens in `styles/global.css`, with a dark set applied through the device's `prefers-color-scheme`. This spec makes the theme an explicit attribute on the page, `data-theme="light"` or `data-theme="dark"`, set by a tiny script that runs before anything is drawn. The tokens change to follow that attribute instead of the media query. A `ThemeToggle` button in the header flips the attribute and remembers the choice in `localStorage`. No server change.

## Decisions

| Decision | Choice | Why | Alternatives considered |
| -------- | ------ | --- | ----------------------- |
| How a theme is applied | `data-theme` attribute on `<html>`, always set | One mechanism for device-driven and chosen themes, so CSS has just two token sets (AC-2, AC-3) | A class on `<body>`: set later, so it flashes. Keeping the media query for the device case: two mechanisms to keep in sync |
| No flash | A small classic script in `index.html`'s `<head>`, before the app's CSS and bundle, sets `data-theme` | It runs before first paint, which a React effect can't (AC-5) | Setting it in React: flashes. Server-side injection: the app is static and the choice is per browser |
| Where the script lives | `apps/client/public/theme-init.js`, loaded with a plain `<script src>` | Vite copies `public/` into the build, so dev, production, and Docker all serve it (AC-10), and tests can load the file itself | Inline in `index.html`: harder to test. Bundled: loads too late |
| Remembering | `localStorage` key `job-tracker-theme`, value `light` or `dark`, every access in `try`/`catch` | Per-browser and simple (AC-4). Failures fall back to the device (AC-7) | A cookie or the server: unneeded |
| Device changes | A `matchMedia("(prefers-color-scheme: dark)")` change listener in the hook, ignored once a choice exists | Meets AC-6 | Polling: wasteful |
| Control | `ThemeToggle` component beside `App.tsx`'s header, using `useTheme()` from `lib/theme.ts` | Small and testable (AC-1, AC-3) | Inline in `App.tsx`: grows the file |
| Button label | Text with a decorative glyph (`aria-hidden`), named for the theme it switches to | No icon library until spec 011 (AC-1) | An icon: waits for 011 |
| Native controls | `color-scheme: light` or `dark` set per theme in CSS | Date pickers, selects, and scroll bars follow (AC-9) | Leaving `light dark`: they would follow the device, not the choice |
| Contrast | A test reads the token values from `global.css` and checks each text pairing (AC-8) | Keeps both themes accessible as colors change | Checking by eye |
| New dependencies | None | — | — |

## Data model

No change. No API change.

## UI

- `index.html`: `<script src="/theme-init.js"></script>` in `<head>`, before the module script.
- `public/theme-init.js`: reads `job-tracker-theme` (valid values only, in a `try`/`catch`), otherwise `matchMedia`, and sets `document.documentElement.dataset.theme` (AC-2, AC-4, AC-5, AC-7).
- `styles/global.css`: `:root` holds the light tokens with `color-scheme: light`, and `:root[data-theme="dark"]` the dark tokens with `color-scheme: dark`. The media query block goes away. If the script somehow doesn't run, the page is light (AC-8, AC-9).
- `lib/theme.ts`: `readStoredTheme()`, `systemTheme()`, `storeTheme()`, `applyTheme()`, and `useTheme()`, which returns the current theme and a `toggle`. It reads the attribute the script set, so React and the script never disagree. It listens for device changes only while no choice is stored (AC-3, AC-6, AC-7).
- `components/ThemeToggle.tsx` (+ `ThemeToggle.css`): a button named "Dark theme" or "Light theme" (AC-1). `App.tsx` places it at the right end of `.app-header`.
- Contrast: tokens that fail 4.5 to 1 are adjusted. The spec lists the pairs (AC-8).

## Shared types

None.

## Test strategy

| AC | Test level | What it checks |
| -- | ---------- | -------------- |
| AC-1 | UI (`ThemeToggle.test.tsx`) | The button is in the header, named for the other theme, reachable by keyboard |
| AC-2 | unit (`themeInit.test.ts`, `theme.test.ts`) | With nothing stored, the device's dark or light setting becomes `data-theme` |
| AC-3 | UI | Clicking switches the attribute and the button name, and the page content stays the same |
| AC-4 | unit + UI | A stored choice wins over the device, survives a fresh start of the script, and is written on click |
| AC-5 | unit | `theme-init.js` run alone, before React, sets the attribute. Browser check confirms it is set before the app renders |
| AC-6 | unit | A device change updates the theme while no choice exists, and is ignored after a click |
| AC-7 | unit | A `localStorage` that throws, and a stored `"purple"`, both fall back to the device, and the toggle still works |
| AC-8 | unit (`contrast.test.ts`) | Every listed text pairing is at least 4.5 to 1 in both token sets |
| AC-9 | unit + browser | Each theme's CSS sets `color-scheme`, and the browser's computed value follows the toggle |
| AC-10 | browser | Against the production build and the Docker image |
| AC-11 | UI | Existing board, panel, timeline, contacts, requirements, and drag and drop tests pass unchanged |

## Risks and mitigations

- The script and the hook could drift apart: tests run both against the same table of cases (stored choice, device setting, bad stored value).
- jsdom has no `matchMedia`: tests stub it, and the shared setup already unstubs globals after each test.
- A failing contrast pair means choosing a new color: this changes the look slightly, and the spec's AC-8 is the guide.
- A browser extension or privacy mode may block storage: every access is guarded (AC-7).

## New dependencies

None.
