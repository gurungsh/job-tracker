import { applicationInputSchema } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { applicationToInput, boardIndex, sortForBoard } from "../../src/lib/applicationInput.ts";
import { application } from "../support/fakeServer.ts";

describe("applicationToInput", () => {
  it("carries every editable field and applies the changes (AC-2)", () => {
    const original = application({
      companyName: "Acme",
      jobTitle: "Engineer",
      stage: "applied",
      nextStep: "Call",
      nextStepDue: "2026-10-05",
      salaryMin: 140000,
      salaryMax: 170000,
      salaryPeriod: "annual",
      employmentType: "contract",
      contractLengthMonths: 6,
    });

    const input = applicationToInput(original, { stage: "offer" });

    expect(input).toMatchObject({ companyName: "Acme", jobTitle: "Engineer", stage: "offer", nextStep: "Call", salaryMin: 140000 });
    // The server's own schema accepts it, and nothing else changes.
    const parsed = applicationInputSchema.parse(input);
    expect(parsed).toMatchObject({ contractLengthMonths: 6, salaryPeriod: "annual", nextStepDue: "2026-10-05" });
    expect(applicationInputSchema.parse(applicationToInput(original))).toMatchObject({ stage: "applied" });
  });
});

describe("sortForBoard", () => {
  it("orders by due date with none last, then newest first (AC-1)", () => {
    const none = application({ companyName: "A", jobTitle: "none" });
    const late = application({ companyName: "B", jobTitle: "late", nextStepDue: "2026-11-01" });
    const soon = application({ companyName: "C", jobTitle: "soon", nextStepDue: "2026-10-02" });
    const newer = application({ companyName: "D", jobTitle: "newer", createdAt: "2026-10-02T12:00:00.000Z" });

    expect(sortForBoard([none, late, newer, soon]).map((a) => a.jobTitle)).toEqual(["soon", "late", "newer", "none"]);
  });

  it("carries the company's website, so a stage change doesn't clear it (spec 017, AC-7)", () => {
    const original = application({ companyName: "Acme", jobTitle: "Engineer", companyWebsite: "https://acme.com" });

    const input = applicationToInput(original, { stage: "applied" });

    expect(input.companyWebsite).toBe("https://acme.com");
    expect(applicationInputSchema.parse(input).companyWebsite).toBe("https://acme.com");
  });
});

describe("boardIndex (spec 019, AC-2, AC-5)", () => {
  const soon = application({ companyName: "A", jobTitle: "soon", nextStepDue: "2026-10-02" });
  const late = application({ companyName: "B", jobTitle: "late", nextStepDue: "2026-12-01" });
  const none = application({ companyName: "C", jobTitle: "none" });

  it("puts a card by due date among the others", () => {
    const moved = application({ companyName: "M", jobTitle: "moved", nextStepDue: "2026-11-01" });

    expect(boardIndex([soon, late, none], moved)).toBe(1);
  });

  it("puts a card with no due date last, and into an empty column at 0", () => {
    const moved = application({ companyName: "M", jobTitle: "moved" });

    expect(boardIndex([soon, late], moved)).toBe(2);
    expect(boardIndex([], moved)).toBe(0);
  });

  it("puts the newer of two equal due dates first", () => {
    const moved = application({ companyName: "M", jobTitle: "moved", nextStepDue: "2026-10-02", createdAt: "2026-10-01T13:00:00.000Z" });

    expect(boardIndex([soon, late], moved)).toBe(0);
  });
});
