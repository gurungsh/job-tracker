import { describe, expect, it } from "vitest";
import { activityInputSchema, activityUpdateSchema, contactInputSchema, fieldErrors } from "../src/index.ts";

describe("contactInputSchema", () => {
  it("accepts just a name, and stores the other details as null (AC-3)", () => {
    expect(contactInputSchema.parse({ name: "  Sam Lee  " })).toEqual({ name: "Sam Lee", role: null, email: null, phone: null, notes: null });
  });

  it("trims every field, treats empty ones as null, and keeps line breaks in notes (AC-3)", () => {
    expect(
      contactInputSchema.parse({ name: "Sam", role: " Recruiter ", email: " sam@acme.com ", phone: "", notes: "a\n\nb" }),
    ).toEqual({ name: "Sam", role: "Recruiter", email: "sam@acme.com", phone: null, notes: "a\n\nb" });
  });

  it.each([
    [{ name: "" }, "name", "Name is required"],
    [{ name: "   " }, "name", "Name is required"],
    [{}, "name", "Name is required"],
    [{ name: "x".repeat(201) }, "name", "Name must be 200 characters or fewer"],
    [{ name: "Sam", role: "x".repeat(201) }, "role", "Role must be 200 characters or fewer"],
    [{ name: "Sam", email: "not-an-email" }, "email", "Email must be a valid email address"],
    [{ name: "Sam", email: "a@b" }, "email", "Email must be a valid email address"],
    [{ name: "Sam", email: `${"a".repeat(250)}@x.com` }, "email", "Email must be 254 characters or fewer"],
    [{ name: "Sam", phone: "1".repeat(51) }, "phone", "Phone must be 50 characters or fewer"],
    [{ name: "Sam", notes: "x".repeat(5001) }, "notes", "Notes must be 5,000 characters or fewer"],
  ])("rejects %j (AC-4, AC-5)", (input, field, message) => {
    const result = contactInputSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)[field]).toBe(message);
  });

  it("accepts values at the limits", () => {
    expect(
      contactInputSchema.safeParse({ name: "x".repeat(200), role: "x".repeat(200), phone: "1".repeat(50), notes: "x".repeat(5000) }).success,
    ).toBe(true);
  });
});

describe("a contact on an entry", () => {
  const entry = { type: "call", occurredOn: "2026-10-05", text: "Spoke" };

  it("is a number, or null when left out or null (AC-8)", () => {
    expect(activityInputSchema.parse({ ...entry, contactId: 7 }).contactId).toBe(7);
    expect(activityInputSchema.parse(entry).contactId).toBeNull();
    expect(activityInputSchema.parse({ ...entry, contactId: null }).contactId).toBeNull();
    expect(activityUpdateSchema.parse({ occurredOn: "2026-10-05", text: "x" }).contactId).toBeNull();
  });

  it.each([0, -1, 1.5, "7", "abc"])("rejects %j (AC-10)", (contactId) => {
    const result = activityInputSchema.safeParse({ ...entry, contactId });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).contactId).toBe("Contact is not valid");
  });
});
