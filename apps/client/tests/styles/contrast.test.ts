import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Read from disk because the test runner blanks CSS imports.
const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "styles", "global.css"), "utf8");
const avatarCss = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", "CompanyAvatar.css"), "utf8");

/** The `--name: value` pairs of the first rule whose selector is exactly `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`No rule for ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1] as string, (m[2] as string).trim()]));
}

function channel(hex: string, index: number): number {
  const value = parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

export function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const light = tokens(":root");
const dark = { ...light, ...tokens(':root[data-theme="dark"]') };

// Every pairing of text and background the app uses (spec 010, AC-8): [text token, background token].
const pairs: [string, string][] = [
  ["--text", "--bg"],
  ["--text", "--surface"],
  ["--text", "--column-bg"],
  ["--text-muted", "--bg"],
  ["--text-muted", "--surface"],
  ["--text-muted", "--column-bg"],
  ["--accent-text", "--accent"],
  ["--accent", "--bg"],
  ["--accent", "--surface"],
  ["--danger", "--bg"],
  ["--danger", "--surface"],
  ["--danger", "--danger-bg"],
  ["--overdue", "--surface"],
  ["--overdue", "--overdue-bg"],
];

describe.each([
  ["light", light],
  ["dark", dark],
])("the %s theme", (_name, theme) => {
  it.each(pairs)("has at least 4.5 to 1 contrast for %s on %s (AC-8)", (foreground, background) => {
    const ratio = contrast(theme[foreground] as string, theme[background] as string);

    expect(ratio, `${foreground} ${theme[foreground] ?? ""} on ${background} ${theme[background] ?? ""}`).toBeGreaterThanOrEqual(4.5);
  });
});

// Stage colors (spec 011): each [data-stage="…"] rule sets --stage and --stage-soft as light-dark(light, dark).
const STAGES = ["wishlist", "applied", "screening", "interviewing", "offer", "accepted", "rejected", "withdrawn"] as const;

function stageColors(stage: string): { stage: [string, string]; soft: [string, string] } {
  const rule = new RegExp(`\\[data-stage="${stage}"\\]\\s*{([^}]*)}`).exec(css);
  if (!rule) throw new Error(`No stage rule for ${stage}`);
  const pair = (token: string): [string, string] => {
    const match = new RegExp(`${token}:\\s*light-dark\\((#[0-9a-fA-F]{6}),\\s*(#[0-9a-fA-F]{6})\\)`).exec(rule[1] ?? "");
    if (!match) throw new Error(`No ${token} for ${stage}`);
    return [match[1] as string, match[2] as string];
  };
  return { stage: pair("--stage"), soft: pair("--stage-soft") };
}

describe.each([
  ["light", 0, light],
  ["dark", 1, dark],
] as const)("the stage colors in the %s theme", (_name, index, theme) => {
  it.each(STAGES)("keeps %s readable on its tint, on a card, and on a column (AC-11)", (stage) => {
    const colors = stageColors(stage);
    const text = colors.stage[index];

    expect(contrast(text, colors.soft[index]), `${stage} ${text} on its tint`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, theme["--surface"] as string), `${stage} ${text} on the card`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(text, theme["--column-bg"] as string), `${stage} ${text} on the column`).toBeGreaterThanOrEqual(4.5);
  });

  it.each(STAGES)("keeps --text readable on %s's tint, where a Move to entry is hovered or focused (spec 018, AC-7)", (stage) => {
    const soft = stageColors(stage).soft[index];

    expect(contrast(theme["--text"] as string, soft), `--text on ${stage}'s tint`).toBeGreaterThanOrEqual(4.5);
  });

  it("gives every stage its own color (AC-1)", () => {
    const colors = STAGES.map((stage) => stageColors(stage).stage[index].toLowerCase());

    expect(new Set(colors).size).toBe(STAGES.length);
  });
});

// The company badge (spec 011, AC-5, AC-11): hue(var(--hue) S% L%) for light and dark, tried at all twelve hues.
function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channelValue = (n: number) => {
    const k = (n + hue / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  const hex = (value: number) => Math.round(value * 255).toString(16).padStart(2, "0");
  return `#${hex(channelValue(0))}${hex(channelValue(8))}${hex(channelValue(4))}`;
}

function avatarPair(property: "background" | "color"): { light: [number, number]; dark: [number, number] } {
  const match = new RegExp(
    `${property}:\\s*light-dark\\(hsl\\(var\\(--hue\\) (\\d+)% (\\d+)%\\),\\s*hsl\\(var\\(--hue\\) (\\d+)% (\\d+)%\\)\\)`,
  ).exec(avatarCss);
  if (!match) throw new Error(`No ${property} rule in CompanyAvatar.css`);
  return { light: [Number(match[1]), Number(match[2])], dark: [Number(match[3]), Number(match[4])] };
}

describe.each(["light", "dark"] as const)("the company badge in the %s theme", (theme) => {
  const background = avatarPair("background")[theme];
  const text = avatarPair("color")[theme];

  it.each(Array.from({ length: 12 }, (_, i) => i * 30))("keeps the initials readable at hue %i (AC-11)", (hue) => {
    const ratio = contrast(hslToHex(hue, text[0], text[1]), hslToHex(hue, background[0], background[1]));

    expect(ratio, `hue ${String(hue)}`).toBeGreaterThanOrEqual(4.5);
  });
});

// The table, its filters, and the view switch (spec 012, AC-20) add no colors of their own. They use the tokens above,
// whose pairings are checked in both themes, so a hex color written into one of these files is a mistake.
describe("the table styles", () => {
  it.each(["TableView.css", "FilterDropdown.css", "ViewSwitch.css"])("%s uses only color tokens (AC-20)", (file) => {
    const source = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", file), "utf8");

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

// The detail page and the application dialog (spec 013, AC-14) add no colors of their own either. Every text color they
// use is one whose pairings with the page, card, and tint backgrounds are checked above.
describe("the detail page styles", () => {
  const checkedTextTokens = ["--text", "--text-muted", "--accent", "--danger", "--overdue", "--stage"];

  it.each(["ApplicationDetailPage.css", "ApplicationDialog.css", "ApplicationForm.css"])("%s uses only color tokens (AC-14)", (file) => {
    const source = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", file), "utf8");

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("sets text only in colors whose contrast is checked (AC-14)", () => {
    const source = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", "ApplicationDetailPage.css"), "utf8");
    const used = [...source.matchAll(/(?<![-\w])color:\s*var\((--[\w-]+)\)/g)].map((match) => match[1] as string);

    expect(used.length).toBeGreaterThan(0);
    for (const token of used) expect(checkedTextTokens, token).toContain(token);
  });
});

// The header, the sidebar, and the drawer (spec 014, AC-11) add no colors of their own. The sidebar sits on --surface,
// and an entry that is hovered or selected sits on --column-bg. Its text is --text, a stage's color, or --text-muted,
// and every one of those pairings is checked above, in both themes.
describe("the app shell styles", () => {
  // --accent-text is the text on an --accent background, such as the logo tile and the theme switch's current disc.
  const checkedTextTokens = ["--text", "--text-muted", "--accent", "--accent-text", "--stage"];
  const files = ["AppShell.css", "Sidebar.css", "ThemeToggle.css"];
  const read = (file: string) => fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", file), "utf8");

  it.each(files)("%s uses only color tokens (AC-11)", (file) => {
    expect(read(file)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it.each(files)("%s sets text only in colors whose contrast is checked (AC-11)", (file) => {
    const used = [...read(file).matchAll(/(?<![-\w])color:\s*var\((--[\w-]+)\)/g)].map((match) => match[1] as string);

    for (const token of used) expect(checkedTextTokens, token).toContain(token);
  });

  it("puts the sidebar's text only on backgrounds whose pairings are checked (AC-11)", () => {
    const backgrounds = [...read("Sidebar.css").matchAll(/background:\s*var\((--[\w-]+)\)/g)].map((match) => match[1] as string);

    expect(backgrounds.length).toBeGreaterThan(0);
    for (const token of backgrounds) expect(["--column-bg", "--surface"], token).toContain(token);
  });

  it("shows the selected entry in a way that doesn't depend on its text color (AC-11)", () => {
    expect(read("Sidebar.css")).toMatch(/\[aria-current="page"\]\s*{[^}]*border-left-color:\s*var\(--accent\)[^}]*font-weight:\s*600/);
  });
});

// The Add Application button in the sidebar (spec 015, AC-10) is the app's primary button, whose text and background
// are the --accent-text on --accent pair checked above. Its own rules must not change either color.
describe("the Add Application button", () => {
  const read = (file: string) => fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", file), "utf8");

  it("uses the primary button's colors, which are the checked accent pair (AC-10)", () => {
    expect(read("styles/global.css")).toMatch(/button\.primary\s*{[^}]*background:\s*var\(--accent\)[^}]*color:\s*var\(--accent-text\)/);
    const rule = /\.sidebar-add\s*{([^}]*)}/.exec(read("components/Sidebar.css"));
    expect(rule).not.toBeNull();
    expect(rule?.[1]).not.toMatch(/(?<![-\w])(color|background|background-color)\s*:/);
  });

  it("lets the salary fields' columns shrink below an input's built-in width (spec 015, AC-3)", () => {
    expect(read("components/ApplicationForm.css")).toMatch(/\.field-row\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  });

  it("lets the job details fieldset shrink, so its fields stay inside a dialog on a phone (spec 015, AC-3)", () => {
    expect(read("components/ApplicationForm.css")).toMatch(/\.job-details\s*{[^}]*min-width:\s*0/);
  });

  it("leaves nothing of the board's old toolbar in its styles (AC-11)", () => {
    expect(read("components/Board.css")).not.toContain("board-toolbar");
  });
});

// The redesigned boxes on an application's page (spec 016, AC-1, AC-4, AC-12) add no colors of their own. Their text is
// one of the tokens below, each paired with --surface or --column-bg in the checked pairs above, and the ✕ and Edit
// buttons only change to pairs that are checked too.
describe("the redesigned detail page styles", () => {
  const files = ["SectionCard.css", "EntryActions.css", "Requirements.css", "Timeline.css", "Contacts.css", "ApplicationDetailPage.css", "ArchiveButton.css"];
  const allowedText = ["--text", "--text-muted", "--accent", "--danger", "--overdue", "--stage"];
  const read = (file: string) => fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", file), "utf8");

  it.each(files)("%s uses only color tokens, and sets text only in colors whose contrast is checked (AC-1)", (file) => {
    const source = read(`components/${file}`);
    const used = [...source.matchAll(/(?<![-\w])color:\s*var\((--[\w-]+)\)/g)].map((match) => match[1] as string);

    expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    for (const token of used) expect(allowedText, token).toContain(token);
  });

  it("styles the Edit and ✕ buttons with checked pairs: muted on the card, then --text on --column-bg, and --danger on --danger-bg (AC-4)", () => {
    const css = read("styles/global.css");

    expect(css).toMatch(/button\.text-button\s*{[^}]*color:\s*var\(--text-muted\)/);
    expect(css).toMatch(/button\.text-button:hover\s*{[^}]*color:\s*var\(--text\)[^}]*background:\s*var\(--column-bg\)/);
    expect(css).toMatch(/button\.icon-button\s*{[^}]*color:\s*var\(--text-muted\)/);
    expect(css).toMatch(/button\.icon-button:hover\s*{[^}]*color:\s*var\(--danger\)[^}]*background:\s*var\(--danger-bg\)/);
  });

  it("shows the hover and focus label as --bg on --text, the page's own text and background pair, reversed (AC-4)", () => {
    const css = read("styles/global.css");

    expect(css).toMatch(/\[data-tip\]::after\s*{[^}]*color:\s*var\(--bg\)[^}]*background:\s*var\(--text\)/);
    expect(css).toMatch(/button\.icon-button\.icon-button--edit:hover\s*{[^}]*color:\s*var\(--text\)[^}]*background:\s*var\(--column-bg\)/);
  });

  it("gives the ✕ a target of at least 2rem, with the app's focus ring left in place (AC-4, AC-12)", () => {
    const css = read("styles/global.css");

    expect(css).toMatch(/button\.icon-button\s*{[^}]*width:\s*2rem[^}]*height:\s*2rem/);
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*2px solid var\(--accent\)/);
  });

  it("marks a pill in muted text on --column-bg, a checked pair (AC-2, AC-3)", () => {
    expect(read("styles/global.css")).toMatch(/\.pill\s*{[^}]*color:\s*var\(--text-muted\)[^}]*background:\s*var\(--column-bg\)/);
  });

  it("lets an entry's text wrap and shrink while its controls keep their size, so a long text can't push them away (AC-12)", () => {
    expect(read("components/EntryActions.css")).toMatch(/\.entry-actions\s*{[^}]*flex-shrink:\s*0/);
    expect(read("components/Timeline.css")).toMatch(/\.timeline-body\s*{[^}]*min-width:\s*0/);
    expect(read("components/Timeline.css")).toMatch(/\.timeline-text\s*{[^}]*overflow-wrap:\s*anywhere/);
    expect(read("components/Contacts.css")).toMatch(/\.contact-info\s*{[^}]*min-width:\s*0/);
    expect(read("components/Contacts.css")).toMatch(/\.contact p\s*{[^}]*overflow-wrap:\s*anywhere/);
    expect(read("components/Requirements.css")).toMatch(/\.requirement-check\s*{[^}]*min-width:\s*0/);
    expect(read("components/Requirements.css")).toMatch(/\.requirement-text\s*{[^}]*overflow-wrap:\s*anywhere/);
  });

  it("keeps the ✕ out of the way of Edit, with a gap between them (AC-12)", () => {
    expect(read("components/EntryActions.css")).toMatch(/\.entry-actions\s*{[^}]*gap:\s*0\.25rem/);
  });
});

describe("the theme rules", () => {
  it("set the browser's color scheme for each theme, so native controls follow (AC-9)", () => {
    expect(css).toMatch(/:root\s*{[^}]*color-scheme:\s*light;/);
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{[^}]*color-scheme:\s*dark;/);
  });

  it("no longer depend on the device setting in CSS (AC-3)", () => {
    expect(css).not.toContain("prefers-color-scheme");
  });
});

// Archiving (spec 017, AC-13) adds no colors of its own. The Archived note, its pill, and the Archive button's hover
// use --text on --column-bg, and the button is --text-muted on the card, all pairs checked above in both themes.
describe("the archive styles", () => {
  const read = (file: string) => fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", file), "utf8");

  it("sets the Archived note and pill in --text on --column-bg, a checked pair", () => {
    const detail = read("components/ApplicationDetailPage.css");

    expect(detail).toMatch(/\.detail-archived\s*{[^}]*color:\s*var\(--text\)[^}]*background:\s*var\(--column-bg\)/);
    expect(detail).toMatch(/\.pill\.pill--archived\s*{[^}]*color:\s*var\(--text\)/);
  });

  it("hovers the Archive button in --text on --column-bg, never in the danger colors", () => {
    expect(read("components/ArchiveButton.css")).toMatch(/button\.archive-button:hover\s*{[^}]*color:\s*var\(--text\)[^}]*background:\s*var\(--column-bg\)/);
  });

  it("hides the button on a card only where there is hover, so it is always there on a touch screen and on keyboard focus", () => {
    const source = read("components/ArchiveButton.css");

    expect(source).toMatch(/@media \(hover: hover\)\s*{[^@]*opacity:\s*0/);
    expect(source).toMatch(/\.card-wrap:focus-within > \.archive-button\s*{[^}]*opacity:\s*1/);
    expect(source).toMatch(/\.card-wrap:hover > \.archive-button/);
  });

  it("keeps the buttons in the bottom right corner of a card, in a footer row with room for them", () => {
    expect(read("components/ArchiveButton.css")).toMatch(/\.card-wrap > \.archive-button\s*{[^}]*bottom:/);
    expect(read("components/ArchiveButton.css")).toMatch(/\.card-wrap \.card-footer\s*{[^}]*min-height:\s*2rem/);
  });

  it("uses the 2rem icon button size, a target large enough for a phone", () => {
    expect(read("styles/global.css")).toMatch(/button\.icon-button\s*{[^}]*width:\s*2rem[^}]*height:\s*2rem/);
  });
});

describe("the board's stage filter and card menu styles (spec 018)", () => {
  const read = (file: string) => fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", file), "utf8");

  it.each(["CardMenu.css", "Board.css"])("%s uses only color tokens", (file) => {
    expect(read(file)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("sets the menu's text only in checked colors, on --surface", () => {
    const used = [...read("CardMenu.css").matchAll(/(?<![-\w])color:\s*var\((--[\w-]+)\)/g)].map((match) => match[1] as string);

    expect(used.length).toBeGreaterThan(0);
    for (const token of used) expect(["--text", "--text-muted", "--stage"], token).toContain(token);
    expect(read("CardMenu.css")).toMatch(/\.card-menu-list\s*{[^}]*background:\s*var\(--surface\)/);
  });

  it("hides the button on a card only where there is hover, so it is always there on a touch screen and on keyboard focus", () => {
    const source = read("CardMenu.css");

    expect(source).toMatch(/@media \(hover: hover\)\s*{[^@]*opacity:\s*0/);
    expect(source).toMatch(/:focus-within/);
  });

  it("gives each entry a target of at least 2rem", () => {
    expect(read("CardMenu.css")).toMatch(/button\[role="menuitem"\]\s*{[^}]*min-height:\s*2\.25rem/);
  });
});
