import { describe, expect, it } from "vitest";
import { fieldErrors, requirementInputSchema, requirementsSummary } from "../src/index.ts";

describe("requirementInputSchema", () => {
  it("accepts text and a kind, trims the text, and starts unmet (AC-3)", () => {
    expect(requirementInputSchema.parse({ text: "  5 years of Go  ", kind: "required" })).toEqual({
      text: "5 years of Go",
      kind: "required",
      met: false,
    });
  });

  it("accepts met, and text at exactly the limit (AC-5, AC-9)", () => {
    expect(requirementInputSchema.parse({ text: "x".repeat(500), kind: "preferred", met: true }).met).toBe(true);
  });

  it.each([
    [{ text: "", kind: "required" }, "text", "Text is required"],
    [{ text: "   ", kind: "required" }, "text", "Text is required"],
    [{ kind: "required" }, "text", "Text is required"],
    [{ text: "x".repeat(501), kind: "required" }, "text", "Text must be 500 characters or fewer"],
    [{ text: "Go", kind: "nice" }, "kind", "Kind is not valid"],
    [{ text: "Go" }, "kind", "Kind is not valid"],
    [{ text: "Go", kind: "required", met: "yes" }, "met", "Met must be yes or no"],
  ])("rejects %j (AC-9, AC-10)", (input, field, message) => {
    const result = requirementInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)[field]).toBe(message);
  });
});

describe("requirementsSummary", () => {
  const item = (kind: "required" | "preferred", met: boolean) => ({ kind, met });

  it("counts each kind, required first (AC-6)", () => {
    const items = [item("preferred", true), item("required", true), item("required", false), item("preferred", false), item("required", true)];

    expect(requirementsSummary(items)).toBe("Required: 2 of 3 met · Preferred: 1 of 2 met");
  });

  it("leaves out a kind with no items (AC-6)", () => {
    expect(requirementsSummary([item("preferred", false)])).toBe("Preferred: 0 of 1 met");
    expect(requirementsSummary([item("required", true)])).toBe("Required: 1 of 1 met");
  });

  it("is empty when there are no items (AC-6)", () => {
    expect(requirementsSummary([])).toBe("");
  });
});
