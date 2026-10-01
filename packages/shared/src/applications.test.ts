import { describe, expect, it } from "vitest";
import { applicationInputSchema, fieldErrors } from "./applications.ts";

function errorsFor(input: unknown): Record<string, string> {
  const result = applicationInputSchema.safeParse(input);
  return result.success ? {} : fieldErrors(result.error);
}

describe("applicationInputSchema", () => {
  it("accepts just a company and a job title, defaulting the rest", () => {
    expect(applicationInputSchema.parse({ companyName: "Acme", jobTitle: "Engineer" })).toEqual({
      companyName: "Acme",
      jobTitle: "Engineer",
      stage: "wishlist",
      nextStep: null,
      nextStepDue: null,
      appliedOn: null,
    });
  });

  it("trims text and stores empty optional fields as null", () => {
    expect(
      applicationInputSchema.parse({
        companyName: "  Acme Corp ",
        jobTitle: " Engineer ",
        stage: "applied",
        nextStep: "   ",
        nextStepDue: "",
        appliedOn: null,
      }),
    ).toMatchObject({ companyName: "Acme Corp", jobTitle: "Engineer", nextStep: null, nextStepDue: null, appliedOn: null });
  });

  it("requires a company and a job title, including when they're only spaces", () => {
    expect(errorsFor({})).toEqual({ companyName: "Company is required", jobTitle: "Job title is required" });
    expect(errorsFor({ companyName: "   ", jobTitle: "" })).toEqual({
      companyName: "Company is required",
      jobTitle: "Job title is required",
    });
  });

  it("enforces length limits after trimming", () => {
    expect(errorsFor({ companyName: "a".repeat(200), jobTitle: ` ${"b".repeat(200)} `, nextStep: "c".repeat(500) })).toEqual(
      {},
    );
    expect(errorsFor({ companyName: "a".repeat(201), jobTitle: "b".repeat(201), nextStep: "c".repeat(501) })).toEqual({
      companyName: "Company must be 200 characters or fewer",
      jobTitle: "Job title must be 200 characters or fewer",
      nextStep: "Next step must be 500 characters or fewer",
    });
  });

  it("accepts only real calendar dates", () => {
    expect(errorsFor({ companyName: "A", jobTitle: "B", nextStepDue: "2028-02-29", appliedOn: "2026-10-01" })).toEqual({});
    expect(errorsFor({ companyName: "A", jobTitle: "B", nextStepDue: "2026-02-30", appliedOn: "10/01/2026" })).toEqual({
      nextStepDue: "Next step due date must be a valid date",
      appliedOn: "Applied date must be a valid date",
    });
  });

  it("rejects an unknown stage", () => {
    expect(errorsFor({ companyName: "A", jobTitle: "B", stage: "hired" })).toEqual({ stage: "Stage is not valid" });
  });
});
