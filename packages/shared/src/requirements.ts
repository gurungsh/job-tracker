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

/** "Required: 3 of 5 met · Preferred: 1 of 2 met". A kind with no items is left out, and no items gives an empty string (spec 009, AC-6). */
export function requirementsSummary(requirements: readonly Pick<Requirement, "kind" | "met">[]): string {
  return REQUIREMENT_KINDS.flatMap((kind) => {
    const items = requirements.filter((r) => r.kind === kind);
    if (items.length === 0) return [];
    const met = items.filter((r) => r.met).length;
    return [`${REQUIREMENT_KIND_LABELS[kind]}: ${String(met)} of ${String(items.length)} met`];
  }).join(" · ");
}
