import { z } from "zod";
import { optionalText, requiredText } from "./applications.ts";

export const CONTACT_NAME_MAX = 200;
export const CONTACT_EMAIL_MAX = 254;

/** An optional email address, stored as null when empty. */
function optionalEmail() {
  const message = "Email must be a valid email address";
  return z
    .string()
    .trim()
    .max(CONTACT_EMAIL_MAX, `Email must be ${String(CONTACT_EMAIL_MAX)} characters or fewer`)
    .nullish()
    .transform((value) => value || null)
    .refine((value) => value === null || z.email().safeParse(value).success, message);
}

/** What a client sends to add or change a contact (spec 008). */
export const contactInputSchema = z.object({
  name: requiredText("Name", CONTACT_NAME_MAX),
  role: optionalText("Role", 200),
  email: optionalEmail(),
  phone: optionalText("Phone", 50),
  notes: optionalText("Notes", 5000),
});

export type ContactInput = z.input<typeof contactInputSchema>;
export type ValidContactInput = z.output<typeof contactInputSchema>;

export type Contact = {
  id: number;
  companyId: number;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  /** How many timeline entries name this contact. */
  entryCount: number;
  createdAt: string;
  updatedAt: string;
};
