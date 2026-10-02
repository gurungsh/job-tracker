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
      jobLink: null,
      location: null,
      workMode: null,
      employmentType: null,
      contractLengthMonths: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      source: null,
      jobDescription: null,
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

describe("applicationInputSchema job details", () => {
  const base = { companyName: "Acme", jobTitle: "Engineer" };

  it("defaults every job detail to null, so spec 002 inputs still parse", () => {
    expect(applicationInputSchema.parse(base)).toMatchObject({
      jobLink: null,
      location: null,
      workMode: null,
      employmentType: null,
      contractLengthMonths: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      source: null,
      jobDescription: null,
    });
  });

  it("normalizes every detail as typed in the form", () => {
    expect(
      applicationInputSchema.parse({
        ...base,
        jobLink: " jobs.acme.com/123 ",
        location: " Austin, TX ",
        workMode: "hybrid",
        employmentType: "contract",
        contractLengthMonths: " 6 ",
        salaryMin: "$92.5k",
        salaryMax: "140,000",
        salaryPeriod: "annual",
        source: "LinkedIn",
        jobDescription: "\n\nLine one\n\nLine two\n\n",
      }),
    ).toMatchObject({
      jobLink: "https://jobs.acme.com/123",
      location: "Austin, TX",
      workMode: "hybrid",
      employmentType: "contract",
      contractLengthMonths: 6,
      salaryMin: 92_500,
      salaryMax: 140_000,
      salaryPeriod: "annual",
      source: "LinkedIn",
      jobDescription: "Line one\n\nLine two",
    });
  });

  it("accepts plain numbers from API callers, and treats empty strings as null", () => {
    expect(
      applicationInputSchema.parse({ ...base, salaryMin: 0, salaryPeriod: "hourly", contractLengthMonths: "", workMode: "" }),
    ).toMatchObject({ salaryMin: 0, salaryPeriod: "hourly", contractLengthMonths: null, workMode: null });
  });

  it("rejects links that aren't http or https web addresses", () => {
    expect(errorsFor({ ...base, jobLink: "ftp://acme.com/jobs" })).toEqual({
      jobLink: "Job link must be a web address starting with http:// or https://",
    });
    expect(errorsFor({ ...base, jobLink: "mailto:jobs@acme.com" })).toHaveProperty("jobLink");
    expect(errorsFor({ ...base, jobLink: `acme.com/${"a".repeat(2000)}` })).toEqual({
      jobLink: "Job link must be 2,000 characters or fewer",
    });
  });

  it("rejects unknown option values", () => {
    expect(errorsFor({ ...base, workMode: "moon", employmentType: "gig", salaryPeriod: "weekly", salaryMin: 1 })).toEqual({
      workMode: "Work mode is not valid",
      employmentType: "Employment type is not valid",
      salaryPeriod: "Salary period is not valid",
    });
  });

  it("rejects amounts that can't be read as whole dollars, or are out of range", () => {
    expect(errorsFor({ ...base, salaryMin: "140.5", salaryMax: "about 140k", salaryPeriod: "annual" })).toEqual({
      salaryMin: "Minimum salary must be whole dollars, like 140,000 or 140k",
      salaryMax: "Maximum salary must be whole dollars, like 140,000 or 140k",
    });
    expect(errorsFor({ ...base, salaryMin: -1, salaryMax: "10,000.5k", salaryPeriod: "annual" })).toEqual({
      salaryMin: "Minimum salary must be whole dollars, like 140,000 or 140k",
      salaryMax: "Maximum salary must be $10,000,000 or less",
    });
  });

  it("requires the minimum to be no more than the maximum", () => {
    expect(errorsFor({ ...base, salaryMin: "150k", salaryMax: "150k", salaryPeriod: "annual" })).toEqual({});
    expect(errorsFor({ ...base, salaryMin: "170k", salaryMax: "140k", salaryPeriod: "annual" })).toEqual({
      salaryMin: "Minimum salary can't be more than the maximum",
    });
  });

  it("requires a period with an amount, and an amount with a period", () => {
    expect(errorsFor({ ...base, salaryMax: "140k" })).toEqual({ salaryPeriod: "Choose annual or hourly for the salary" });
    expect(errorsFor({ ...base, salaryPeriod: "annual" })).toEqual({
      salaryPeriod: "Enter a salary amount, or clear the period",
    });
  });

  it("allows a contract length only for contracts, from 1 to 120 months", () => {
    expect(errorsFor({ ...base, employmentType: "contract", contractLengthMonths: 120 })).toEqual({});
    expect(errorsFor({ ...base, employmentType: "full_time", contractLengthMonths: 6 })).toEqual({
      contractLengthMonths: "Contract length only applies when the employment type is Contract",
    });
    expect(errorsFor({ ...base, employmentType: "contract", contractLengthMonths: "0" })).toEqual({
      contractLengthMonths: "Contract length must be 1 to 120 months",
    });
    expect(errorsFor({ ...base, employmentType: "contract", contractLengthMonths: "six" })).toEqual({
      contractLengthMonths: "Contract length must be 1 to 120 months",
    });
  });

  it("limits the text details", () => {
    expect(
      errorsFor({ ...base, location: "a".repeat(201), source: "b".repeat(201), jobDescription: "c".repeat(50_001) }),
    ).toEqual({
      location: "Location must be 200 characters or fewer",
      source: "Source must be 200 characters or fewer",
      jobDescription: "Job description must be 50,000 characters or fewer",
    });
  });
});
