import { describe, expect, it } from "vitest";
import {
  ACTIVITY_TEXT_MAX,
  activityInputSchema,
  activityUpdateSchema,
  addedText,
  compareActivities,
  fieldErrors,
  movedText,
} from "../src/index.ts";

const valid = { type: "call", occurredOn: "2026-10-05", text: "  Spoke with the recruiter  " };

describe("activityInputSchema", () => {
  it("accepts a valid entry, trims the text, and allows future dates (AC-2, AC-4)", () => {
    expect(activityInputSchema.parse(valid)).toEqual({
      type: "call",
      occurredOn: "2026-10-05",
      occurredTime: null,
      text: "Spoke with the recruiter",
      contactId: null,
    });
    expect(activityInputSchema.parse({ ...valid, occurredOn: "2099-01-01" }).occurredOn).toBe("2099-01-01");
  });

  it("keeps line breaks in the middle of the text", () => {
    expect(activityInputSchema.parse({ ...valid, text: "a\n\nb" }).text).toBe("a\n\nb");
  });

  it.each([
    [{ ...valid, text: "   " }, "text", "Text is required"],
    [{ ...valid, text: "x".repeat(ACTIVITY_TEXT_MAX + 1) }, "text", "Text must be 5,000 characters or fewer"],
    [{ ...valid, occurredOn: "2026-02-30" }, "occurredOn", "Date must be a valid date"],
    [{ ...valid, occurredOn: "" }, "occurredOn", "Date must be a valid date"],
    [{ ...valid, type: "stage_change" }, "type", "Type is not valid"],
    [{ ...valid, type: "meeting" }, "type", "Type is not valid"],
  ])("rejects %j (AC-4, AC-5)", (input, field, message) => {
    const result = activityInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)[field]).toBe(message);
  });

  it("accepts text of exactly the limit", () => {
    expect(activityInputSchema.safeParse({ ...valid, text: "x".repeat(ACTIVITY_TEXT_MAX) }).success).toBe(true);
  });
});

describe("activityUpdateSchema", () => {
  it("lets the type be left out or be stage_change (AC-8)", () => {
    expect(activityUpdateSchema.parse({ occurredOn: "2026-10-05", text: "x" }).type).toBeUndefined();
    expect(activityUpdateSchema.parse({ type: "stage_change", occurredOn: "2026-10-05", text: "x" }).type).toBe("stage_change");
  });
});

describe("automatic text", () => {
  it("uses the board's stage names (AC-6, AC-7)", () => {
    expect(addedText("wishlist")).toBe("Added to Wishlist");
    expect(movedText("applied", "interviewing")).toBe("Moved from Applied to Interviewing");
  });
});

describe("occurredTime (spec 017, AC-9)", () => {
  it.each([
    ["14:30", "14:30"],
    ["00:00", "00:00"],
    ["23:59", "23:59"],
    ["", null],
    [null, null],
    [undefined, null],
  ])("accepts %j as %j", (typed, saved) => {
    expect(activityInputSchema.parse({ ...valid, occurredTime: typed }).occurredTime).toBe(saved);
    expect(activityUpdateSchema.parse({ ...valid, occurredTime: typed }).occurredTime).toBe(saved);
  });

  it.each(["24:00", "25:00", "12:60", "9:30", "12:5", "noon", "12:30:00", " 12:30"])("rejects %j", (typed) => {
    for (const schema of [activityInputSchema, activityUpdateSchema]) {
      const result = schema.safeParse({ ...valid, occurredTime: typed });
      expect(result.success).toBe(false);
      if (!result.success) expect(fieldErrors(result.error).occurredTime).toBe("Time must be a valid time");
    }
  });
});

describe("compareActivities (spec 017, AC-11)", () => {
  const entry = (id: number, occurredOn: string, occurredTime: string | null) => ({ id, occurredOn, occurredTime });

  it("orders by newest date, then timed before untimed with the later time first, then newest added", () => {
    const entries = [
      entry(1, "2026-10-01", null),
      entry(2, "2026-10-02", "09:00"),
      entry(3, "2026-10-02", null),
      entry(4, "2026-10-02", "15:30"),
      entry(5, "2026-10-02", null),
      entry(6, "2026-09-30", "23:00"),
      entry(7, "2026-10-02", "09:00"),
    ];
    expect([...entries].sort(compareActivities).map((e) => e.id)).toEqual([4, 7, 2, 5, 3, 1, 6]);
  });
});
