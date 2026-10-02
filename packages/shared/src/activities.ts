import { z } from "zod";
import { STAGE_LABELS, type Stage } from "./stages.ts";

/** The types a person can log. */
export const LOGGED_ACTIVITY_TYPES = ["note", "email", "call", "interview"] as const;

/** Every type, including the entries the server writes when a stage changes. */
export const ACTIVITY_TYPES = [...LOGGED_ACTIVITY_TYPES, "stage_change"] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type LoggedActivityType = (typeof LOGGED_ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Note",
  email: "Email",
  call: "Call",
  interview: "Interview",
  stage_change: "Stage change",
};

export const ACTIVITY_TEXT_MAX = 5000;

const dateMessage = "Date must be a valid date";
const textSchema = z
  .string({ error: "Text is required" })
  .trim()
  .min(1, "Text is required")
  .max(ACTIVITY_TEXT_MAX, `Text must be ${new Intl.NumberFormat("en-US").format(ACTIVITY_TEXT_MAX)} characters or fewer`);
const dateSchema = z.iso.date({ error: dateMessage });
// The contact the entry involved, at the application's company. Left out or null means none (spec 008, AC-8).
const contactSchema = z
  .number({ error: "Contact is not valid" })
  .int({ error: "Contact is not valid" })
  .positive({ error: "Contact is not valid" })
  .nullish()
  .transform((value) => value ?? null);

/** What a client sends to log a new entry (spec 007). */
export const activityInputSchema = z.object({
  type: z.enum(LOGGED_ACTIVITY_TYPES, { error: "Type is not valid" }),
  occurredOn: dateSchema,
  text: textSchema,
  contactId: contactSchema,
});

/**
 * What a client sends to change an entry. The type may be left out to keep it, and an entry the server wrote
 * when a stage changed keeps its type (checked against the stored entry by the server).
 */
export const activityUpdateSchema = z.object({
  type: z.enum(ACTIVITY_TYPES, { error: "Type is not valid" }).optional(),
  occurredOn: dateSchema,
  text: textSchema,
  contactId: contactSchema,
});

export type ActivityInput = z.input<typeof activityInputSchema>;
export type ActivityUpdate = z.input<typeof activityUpdateSchema>;
export type ValidActivityInput = z.output<typeof activityInputSchema>;
export type ValidActivityUpdate = z.output<typeof activityUpdateSchema>;

export type Activity = {
  id: number;
  applicationId: number;
  type: ActivityType;
  /** YYYY-MM-DD */
  occurredOn: string;
  text: string;
  /** The contact the entry involved, if any (spec 008). */
  contactId: number | null;
  contactName: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The text of the entry written when an application is added (spec 007, AC-6). */
export function addedText(stage: Stage): string {
  return `Added to ${STAGE_LABELS[stage]}`;
}

/** The text of the entry written when the stage changes (spec 007, AC-7). */
export function movedText(from: Stage, to: Stage): string {
  return `Moved from ${STAGE_LABELS[from]} to ${STAGE_LABELS[to]}`;
}
