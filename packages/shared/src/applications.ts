import { z } from "zod";
import { STAGES, type Stage } from "./stages.ts";

function requiredText(label: string, max: number) {
  return z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${String(max)} characters or fewer`);
}

/** Optional text: trimmed, and stored as null when empty. */
function optionalText(label: string, max: number) {
  return z
    .string()
    .trim()
    .max(max, `${label} must be ${String(max)} characters or fewer`)
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

export const applicationInputSchema = z.object({
  companyName: requiredText("Company", 200),
  jobTitle: requiredText("Job title", 200),
  stage: z.enum(STAGES, { error: "Stage is not valid" }).default("wishlist"),
  nextStep: optionalText("Next step", 500),
  nextStepDue: optionalDate("Next step due date"),
  appliedOn: optionalDate("Applied date"),
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
