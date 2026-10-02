import { describe, expect, it } from "vitest";
import { ACTIVITY_TEXT_MAX, activityInputSchema, activityUpdateSchema, addedText, fieldErrors, movedText } from "../src/index.ts";

const valid = { type: "call", occurredOn: "2026-10-05", text: "  Spoke with the recruiter  " };

describe("activityInputSchema", () => {
  it("accepts a valid entry, trims the text, and allows future dates (AC-2, AC-4)", () => {
    expect(activityInputSchema.parse(valid)).toEqual({
      type: "call",
      occurredOn: "2026-10-05",
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
