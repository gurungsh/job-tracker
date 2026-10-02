import { describe, expect, it } from "vitest";
import { fieldErrors, requirementInputSchema, requiredMetSummary } from "../src/index.ts";

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

describe("requiredMetSummary (spec 016, AC-3)", () => {
  const item = (kind: "required" | "preferred", met: boolean) => ({ kind, met });

  it("counts the required ones that are met, out of the required ones", () => {
    const items = [item("preferred", true), item("required", true), item("required", false), item("preferred", false), item("required", true)];

    expect(requiredMetSummary(items)).toBe("2/3 required met");
  });

  it("never counts a preferred one, met or not", () => {
    expect(requiredMetSummary([item("required", false), item("preferred", true), item("preferred", true)])).toBe("0/1 required met");
  });

  it("is empty with no required ones, including when there are only preferred ones", () => {
    expect(requiredMetSummary([item("preferred", false)])).toBe("");
    expect(requiredMetSummary([])).toBe("");
  });

  it("says when all of them are met", () => {
    expect(requiredMetSummary([item("required", true)])).toBe("1/1 required met");
  });
});
