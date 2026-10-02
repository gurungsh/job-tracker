import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Read from disk because the test runner blanks CSS imports.
const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "styles", "global.css"), "utf8");

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

describe("the theme rules", () => {
  it("set the browser's color scheme for each theme, so native controls follow (AC-9)", () => {
    expect(css).toMatch(/:root\s*{[^}]*color-scheme:\s*light;/);
    expect(css).toMatch(/:root\[data-theme="dark"\]\s*{[^}]*color-scheme:\s*dark;/);
  });

  it("no longer depend on the device setting in CSS (AC-3)", () => {
    expect(css).not.toContain("prefers-color-scheme");
  });
});
