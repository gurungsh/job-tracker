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

describe("the theme rules", () => {
  it("set the browser's color scheme for each theme, so native controls follow (AC-9)", () => {
    expect(css).toMatch(/:root\s*{[^}]*color-scheme:\s*light;/);
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{[^}]*color-scheme:\s*dark;/);
  });

  it("no longer depend on the device setting in CSS (AC-3)", () => {
    expect(css).not.toContain("prefers-color-scheme");
  });
});
