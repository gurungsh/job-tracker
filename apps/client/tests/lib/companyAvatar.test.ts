import { describe, expect, it } from "vitest";
import { companyHue, companyInitials } from "../../src/lib/companyAvatar.ts";

describe("companyInitials (AC-4)", () => {
  it.each([
    ["Microsoft", "M"],
    ["Acme Corp", "AC"],
    ["Bank of America", "BA"],
    ["The Home Depot", "HD"],
    ["Procter & Gamble", "PG"],
    ["Johnson and Johnson", "JJ"],
    ["Rolls-Royce", "RR"],
    ["Ernst  Young  Global", "EY"],
    ["  spaced   out  ", "SO"],
    ["lowercase company", "LC"],
    ["3M", "3"],
    ["Bank of", "B"],
  ])("makes %j into %j", (name, initials) => {
    expect(companyInitials(name)).toBe(initials);
  });

  it("uses a name made only of small words by its first word", () => {
    expect(companyInitials("The")).toBe("T");
    expect(companyInitials("of and the")).toBe("O");
  });

  it("uses the first character of each word, in any alphabet", () => {
    expect(companyInitials("日本 電気")).toBe("日電");
    expect(companyInitials("Émile Zola")).toBe("ÉZ");
    expect(companyInitials("🚀 Rocket")).toBe("🚀R");
  });

  it("gives a question mark when there is nothing to use", () => {
    expect(companyInitials("")).toBe("?");
    expect(companyInitials("   ")).toBe("?");
    expect(companyInitials(" - / . ")).toBe("?");
  });
});

describe("companyHue (AC-5)", () => {
  it("is the same for a name whatever its capitals", () => {
    expect(companyHue("Acme Corp")).toBe(companyHue("ACME CORP"));
    expect(companyHue("Acme Corp")).toBe(companyHue("acme corp"));
  });

  it("is always one of twelve hues, a multiple of thirty up to 330", () => {
    const names = ["", "A", "Acme", "Globex", "Initech", "Hooli", "Umbrella", "Wayne Enterprises", "日本", "🚀", "x".repeat(500)];
    for (const name of names) {
      const hue = companyHue(name);
      expect(hue % 30).toBe(0);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThanOrEqual(330);
    }
  });

  it("is stable between calls, and spreads different names over several hues", () => {
    expect(companyHue("Globex")).toBe(companyHue("Globex"));
    const names = Array.from({ length: 60 }, (_, i) => `Company ${String(i)}`);
    expect(new Set(names.map(companyHue)).size).toBeGreaterThanOrEqual(8);
  });
});
