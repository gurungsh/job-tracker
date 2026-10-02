import { z } from "zod";
import { requiredText } from "./applications.ts";

export const REQUIREMENT_KINDS = ["required", "preferred"] as const;

export type RequirementKind = (typeof REQUIREMENT_KINDS)[number];

export const REQUIREMENT_KIND_LABELS: Record<RequirementKind, string> = {
  required: "Required",
  preferred: "Preferred",
};

export const REQUIREMENT_TEXT_MAX = 500;

/** What a client sends to add or change a requirement (spec 009). New ones start unmet. */
export const requirementInputSchema = z.object({
  text: requiredText("Text", REQUIREMENT_TEXT_MAX),
  kind: z.enum(REQUIREMENT_KINDS, { error: "Kind is not valid" }),
  met: z.boolean({ error: "Met must be yes or no" }).default(false),
});

export type RequirementInput = z.input<typeof requirementInputSchema>;
export type ValidRequirementInput = z.output<typeof requirementInputSchema>;

export type Requirement = {
  id: number;
  applicationId: number;
  text: string;
  kind: RequirementKind;
  met: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * "2/3 required met". Only required requirements count, and a preferred one never does. With no required ones the
 * result is an empty string (spec 016, AC-3).
 */
export function requiredMetSummary(requirements: readonly Pick<Requirement, "kind" | "met">[]): string {
  const required = requirements.filter((r) => r.kind === "required");
  if (required.length === 0) return "";
  const met = required.filter((r) => r.met).length;
  return `${String(met)}/${String(required.length)} required met`;
}
