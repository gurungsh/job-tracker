import { describe, expect, it } from "vitest";
import { daysInStage, formatDate, isOverdue, localDateOf, localToday, timeInStage } from "../../src/lib/dates.ts";

describe("localToday", () => {
  it("uses the local calendar date, not UTC", () => {
    expect(localToday(new Date(2026, 8, 30, 23, 59))).toBe("2026-09-30");
    expect(localToday(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });
});

describe("isOverdue", () => {
  it("is true only for dates before today", () => {
    expect(isOverdue("2026-09-30", "2026-10-01")).toBe(true);
    expect(isOverdue("2026-10-01", "2026-10-01")).toBe(false);
    expect(isOverdue("2026-10-02", "2026-10-01")).toBe(false);
  });
});

describe("daysInStage", () => {
  it("counts whole calendar days between the local stage-change date and today", () => {
    const now = new Date(2026, 9, 13, 9, 0);

    expect(daysInStage(new Date(2026, 9, 13, 8, 0).toISOString(), now)).toBe(0);
    expect(daysInStage(new Date(2026, 9, 12, 23, 59).toISOString(), now)).toBe(1);
    expect(daysInStage(new Date(2026, 9, 1, 10, 0).toISOString(), now)).toBe(12);
  });

  it("counts across a month boundary", () => {
    expect(daysInStage(new Date(2026, 8, 28, 12).toISOString(), new Date(2026, 9, 2, 12))).toBe(4);
  });
});

describe("timeInStage", () => {
  it("describes how long an application has been in its stage (AC-22)", () => {
    expect(timeInStage("Screening", 0)).toBe("In Screening since today");
    expect(timeInStage("Screening", 1)).toBe("In Screening for 1 day");
    expect(timeInStage("Screening", 12)).toBe("In Screening for 12 days");
  });
});

describe("formatting", () => {
  it("formats calendar dates in US style", () => {
    expect(formatDate("2026-10-01")).toBe("Oct 1, 2026");
  });

  it("finds the local date of a timestamp", () => {
    expect(localDateOf(new Date(2026, 9, 1, 23, 30).toISOString())).toBe("2026-10-01");
  });
});
