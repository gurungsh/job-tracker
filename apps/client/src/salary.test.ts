import { describe, expect, it } from "vitest";
import { formatDollars, salarySummary } from "./salary.ts";

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
