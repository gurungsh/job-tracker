import { z } from "zod";
import {
  EMPLOYMENT_TYPES,
  type EmploymentType,
  SALARY_PERIODS,
  type SalaryPeriod,
  WORK_MODES,
  type WorkMode,
  isValidJobLink,
  normalizeJobLink,
  parseDollars,
} from "./jobDetails.ts";
import { STAGES, type Stage } from "./stages.ts";

const count = new Intl.NumberFormat("en-US");

function requiredText(label: string, max: number) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${count.format(max)} characters or fewer`);
}

/** Optional text: trimmed, and stored as null when empty. */
function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${count.format(max)} characters or fewer`)
    .nullish()
    .transform((value) => value || null);
}

/** An optional calendar date (YYYY-MM-DD), stored as null when empty. */
function optionalDate(label: string) {
  const message = `${label} must be a valid date`;
  return z
    .union([z.literal(""), z.iso.date({ error: message })], { error: message })
    .nullish()
    .transform((value) => value || null);
}

/** One of `values`, stored as null when empty. */
function optionalChoice<const T extends readonly [string, ...string[]]>(label: string, values: T) {
  return z
    .union([z.literal(""), z.enum(values)], { error: `${label} is not valid` })
    .nullish()
    .transform((value) => value || null);
}

/** A salary amount in whole dollars, typed as "140,000" or "140k" (spec 003, AC-13), or sent as a number. */
function optionalDollars(label: string) {
  const message = `${label} must be whole dollars, like 140,000 or 140k`;
  return z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        return value.trim() === "" ? null : (parseDollars(value) ?? Number.NaN);
      },
      z
        .number({ error: message })
        .int(message)
        .min(0, message)
        .max(10_000_000, `${label} must be $10,000,000 or less`)
        .nullish(),
    )
    .transform((value) => value ?? null);
}

function optionalContractLength() {
  const message = "Contract length must be 1 to 120 months";
  return z
    .preprocess(
      (value) => {
        if (typeof value !== "string") return value;
        const trimmed = value.trim();
        if (trimmed === "") return null;
        return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
      },
      z.number({ error: message }).int(message).min(1, message).max(120, message).nullish(),
    )
    .transform((value) => value ?? null);
}

/** A job link, with https:// added when it has no scheme (spec 003, AC-12). */
function optionalJobLink() {
  return z
    .string()
    .nullish()
    .transform((value) => (value ? normalizeJobLink(value) : "") || null)
    .refine((link) => link === null || isValidJobLink(link), "Job link must be a web address starting with http:// or https://")
    .refine((link) => link === null || link.length <= 2000, "Job link must be 2,000 characters or fewer");
}

export const applicationInputSchema = z
  .object({
    companyName: requiredText("Company", 200),
    jobTitle: requiredText("Job title", 200),
    stage: z.enum(STAGES, { error: "Stage is not valid" }).default("wishlist"),
    nextStep: optionalText("Next step", 500),
    nextStepDue: optionalDate("Next step due date"),
    appliedOn: optionalDate("Applied date"),
    jobLink: optionalJobLink(),
    location: optionalText("Location", 200),
    workMode: optionalChoice("Work mode", WORK_MODES),
    employmentType: optionalChoice("Employment type", EMPLOYMENT_TYPES),
    contractLengthMonths: optionalContractLength(),
    salaryMin: optionalDollars("Minimum salary"),
    salaryMax: optionalDollars("Maximum salary"),
    salaryPeriod: optionalChoice("Salary period", SALARY_PERIODS),
    source: optionalText("Source", 200),
    jobDescription: optionalText("Job description", 50_000),
  })
  .superRefine((input, ctx) => {
    // Rules that connect fields. Each error goes on the field to fix (spec 003, AC-7, AC-8).
    const hasAmount = input.salaryMin !== null || input.salaryMax !== null;
    if (input.salaryMin !== null && input.salaryMax !== null && input.salaryMin > input.salaryMax) {
      ctx.addIssue({ code: "custom", path: ["salaryMin"], message: "Minimum salary can't be more than the maximum" });
    }
    if (hasAmount && input.salaryPeriod === null) {
      ctx.addIssue({ code: "custom", path: ["salaryPeriod"], message: "Choose annual or hourly for the salary" });
    }
    if (!hasAmount && input.salaryPeriod !== null) {
      ctx.addIssue({ code: "custom", path: ["salaryPeriod"], message: "Enter a salary amount, or clear the period" });
    }
    if (input.contractLengthMonths !== null && input.employmentType !== "contract") {
      ctx.addIssue({
        code: "custom",
        path: ["contractLengthMonths"],
        message: "Contract length only applies when the employment type is Contract",
      });
    }
  });

/** What a client sends to create or update an application. */
export type ApplicationInput = z.input<typeof applicationInputSchema>;

/** An application input after validation and normalization. */
export type ValidApplicationInput = z.output<typeof applicationInputSchema>;

export type Application = {
  id: number;
  companyId: number;
  companyName: string;
  jobTitle: string;
  stage: Stage;
  nextStep: string | null;
  /** YYYY-MM-DD */
  nextStepDue: string | null;
  /** YYYY-MM-DD */
  appliedOn: string | null;
  /** YYYY-MM-DD */
  closedOn: string | null;
  /** ISO 8601 UTC timestamp */
  stageChangedAt: string;
  createdAt: string;
  updatedAt: string;
  jobLink: string | null;
  location: string | null;
  workMode: WorkMode | null;
  employmentType: EmploymentType | null;
  contractLengthMonths: number | null;
  /** Whole US dollars */
  salaryMin: number | null;
  /** Whole US dollars */
  salaryMax: number | null;
  salaryPeriod: SalaryPeriod | null;
  source: string | null;
  jobDescription: string | null;
};

export type Company = { id: number; name: string };

/** The first error message for each top-level field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    fields[field] ??= issue.message;
  }
  return fields;
}
