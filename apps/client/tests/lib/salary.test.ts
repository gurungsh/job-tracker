import { describe, expect, it } from "vitest";
import { compactSalary, formatDollars, salarySummary } from "../../src/lib/salary.ts";

describe("formatDollars", () => {
  it("adds a dollar sign and commas", () => {
    expect(formatDollars(140_000)).toBe("$140,000");
    expect(formatDollars(0)).toBe("$0");
    expect(formatDollars(85)).toBe("$85");
  });
});

describe("salarySummary", () => {
  it.each([
    [140_000, 170_000, "annual", "$140,000–$170,000 per year"],
    [140_000, null, "annual", "From $140,000 per year"],
    [null, 170_000, "annual", "Up to $170,000 per year"],
    [85, 95, "hourly", "$85–$95 per hour"],
    [150_000, 150_000, "annual", "$150,000 per year"],
    [0, 0, "annual", "$0 per year"],
    [0, null, "annual", "From $0 per year"],
    [null, 0, "annual", "Up to $0 per year"],
  ] as const)("describes %j to %j %s as %j (AC-5)", (min, max, period, summary) => {
    expect(salarySummary(min, max, period)).toBe(summary);
  });

  it("leaves out the period until one is chosen", () => {
    expect(salarySummary(140_000, 170_000, null)).toBe("$140,000–$170,000");
  });

  it("is empty without an amount", () => {
    expect(salarySummary(null, null, "annual")).toBe("");
  });
});

describe("compactSalary (spec 011, AC-7)", () => {
  it.each([
    [140_000, 170_000, "annual", "$140k–$170k/yr"],
    [85, 95, "hourly", "$85–$95/hr"],
    [140_000, null, "annual", "From $140k/yr"],
    [null, 170_000, "annual", "Up to $170k/yr"],
    [null, 95, "hourly", "Up to $95/hr"],
    [150_000, 150_000, "annual", "$150k/yr"],
    [92_500, 100_000, "annual", "$92,500–$100k/yr"],
    [1_000, 1_500, "annual", "$1k–$1,500/yr"],
    [999, 1_000, "hourly", "$999–$1k/hr"],
    [0, 0, "annual", "$0/yr"],
  ] as const)("writes %j to %j for %s as %j", (min, max, period, expected) => {
    expect(compactSalary(min, max, period)).toBe(expected);
  });

  it("is empty without an amount", () => {
    expect(compactSalary(null, null, null)).toBe("");
    expect(compactSalary(null, null, "annual")).toBe("");
  });

  it("has no period suffix when there is no period", () => {
    expect(compactSalary(140_000, 170_000, null)).toBe("$140k–$170k");
  });
});
