import { describe, expect, it } from "vitest";
import {
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPES,
  SALARY_PERIOD_LABELS,
  SALARY_PERIODS,
  WORK_MODE_LABELS,
  WORK_MODES,
  isValidJobLink,
  normalizeJobLink,
  parseDollars,
} from "../src/jobDetails.ts";

describe("value lists", () => {
  it("label every option", () => {
    expect(WORK_MODES.map((mode) => WORK_MODE_LABELS[mode])).toEqual(["Onsite", "Hybrid", "Remote"]);
    expect(EMPLOYMENT_TYPES.map((type) => EMPLOYMENT_TYPE_LABELS[type])).toEqual(["Full-time", "Contract", "Part-time"]);
    expect(SALARY_PERIODS.map((period) => SALARY_PERIOD_LABELS[period])).toEqual(["Annual", "Hourly"]);
  });
});

describe("parseDollars", () => {
  it.each([
    ["140000", 140_000],
    ["140,000", 140_000],
    ["1,250,000", 1_250_000],
    ["$140,000", 140_000],
    ["$85", 85],
    ["0", 0],
    ["140k", 140_000],
    ["140K", 140_000],
    ["92.5k", 92_500],
    ["92.25k", 92_250],
    ["0.001k", 1],
    ["$150k", 150_000],
    ["  140k  ", 140_000],
    ["1,500k", 1_500_000],
  ])("reads %j as %j", (text, dollars) => {
    expect(parseDollars(text)).toBe(dollars);
  });

  it.each(["", "140.5", "1.5m", "about 140k", "140,00", "14,0000", "1.2345k", "-5", "k", "$", "140 000", "1e5"])(
    "rejects %j",
    (text) => {
      expect(parseDollars(text)).toBeUndefined();
    },
  );

  it("reads large k values exactly, leaving range checks to the schema (spec edge case)", () => {
    expect(parseDollars("10,000.5k")).toBe(10_000_500);
  });
});

describe("normalizeJobLink", () => {
  it.each([
    ["jobs.acme.com/123", "https://jobs.acme.com/123"],
    ["www.acme.com/careers/42", "https://www.acme.com/careers/42"],
    ["  jobs.acme.com/123  ", "https://jobs.acme.com/123"],
    ["localhost:3000/jobs/1", "https://localhost:3000/jobs/1"],
    ["https://jobs.acme.com/123", "https://jobs.acme.com/123"],
    ["http://jobs.acme.com/123", "http://jobs.acme.com/123"],
    ["HTTPS://JOBS.ACME.COM/123", "HTTPS://JOBS.ACME.COM/123"],
  ])("turns %j into %j", (typed, link) => {
    expect(normalizeJobLink(typed)).toBe(link);
  });

  it("leaves other schemes alone, so they can be rejected", () => {
    expect(normalizeJobLink("mailto:jobs@acme.com")).toBe("mailto:jobs@acme.com");
    expect(normalizeJobLink("ftp://acme.com/jobs")).toBe("ftp://acme.com/jobs");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeJobLink("   ")).toBe("");
  });
});

describe("isValidJobLink", () => {
  it("accepts http and https web addresses", () => {
    expect(isValidJobLink("https://jobs.acme.com/123")).toBe(true);
    expect(isValidJobLink("HTTP://acme.com")).toBe(true);
  });

  it.each(["", "mailto:jobs@acme.com", "ftp://acme.com/jobs", "https://acme .com/jobs", "https://"])("rejects %j", (link) => {
    expect(isValidJobLink(link)).toBe(false);
  });
});
