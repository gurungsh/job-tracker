import type { DatabaseSync } from "node:sqlite";
import type { Activity, Application, ApplicationInput, Contact, ValidationErrorResponse } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.ts";
import { migratedDatabase, startServer } from "../support/testing.ts";

let db: DatabaseSync;
let baseUrl: string;

beforeEach(async () => {
  db = migratedDatabase();
  baseUrl = await startServer(createApp({ db }));
});

afterEach(() => {
  db.close();
});

function send(method: string, path: string, body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Time-Zone": "UTC" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createApplication(input: Partial<ApplicationInput> = {}): Promise<Application> {
  const response = await send("POST", "/api/applications", { companyName: "Acme", jobTitle: "Engineer", ...input });
  expect(response.status).toBe(201);
  return (await response.json()) as Application;
}

async function addContact(companyId: number, input: Record<string, unknown> = { name: "Sam Lee" }): Promise<Contact> {
  const response = await send("POST", `/api/companies/${String(companyId)}/contacts`, input);
  expect(response.status).toBe(201);
  return (await response.json()) as Contact;
}

async function contactsOf(companyId: number): Promise<Contact[]> {
  const response = await send("GET", `/api/companies/${String(companyId)}/contacts`);
  expect(response.status).toBe(200);
  return (await response.json()) as Contact[];
}

async function timeline(applicationId: number): Promise<Activity[]> {
  return (await (await send("GET", `/api/applications/${String(applicationId)}/activities`)).json()) as Activity[];
}

function logEntry(applicationId: number, entry: Record<string, unknown> = {}) {
  return send("POST", `/api/applications/${String(applicationId)}/activities`, {
    type: "call",
    occurredOn: "2026-10-05",
    text: "Spoke",
    ...entry,
  });
}

describe("adding a contact", () => {
  it("saves every detail and returns it, and it is there on the next read (AC-3)", async () => {
    const { companyId } = await createApplication();

    const created = await addContact(companyId, {
      name: "  Sam Lee ",
      role: "Recruiter",
      email: "sam@acme.com",
      phone: "555-0100",
      notes: "Line one\n\nLine two",
    });

    expect(created).toMatchObject({
      companyId,
      name: "Sam Lee",
      role: "Recruiter",
      email: "sam@acme.com",
      phone: "555-0100",
      notes: "Line one\n\nLine two",
      entryCount: 0,
    });
    expect(await contactsOf(companyId)).toEqual([created]);
  });

  it("needs only a name, and stores the rest as empty (AC-3)", async () => {
    const { companyId } = await createApplication();

    expect(await addContact(companyId, { name: "Pat" })).toMatchObject({ role: null, email: null, phone: null, notes: null });
  });

  it("allows two contacts with the same name", async () => {
    const { companyId } = await createApplication();

    await addContact(companyId, { name: "Sam" });
    await addContact(companyId, { name: "Sam" });

    expect(await contactsOf(companyId)).toHaveLength(2);
  });

  it.each([
    [{}, "name"],
    [{ name: "  " }, "name"],
    [{ name: "x".repeat(201) }, "name"],
    [{ name: "Sam", email: "nope" }, "email"],
    [{ name: "Sam", phone: "1".repeat(51) }, "phone"],
    [{ name: "Sam", notes: "x".repeat(5001) }, "notes"],
    [{ name: "Sam", role: "x".repeat(201) }, "role"],
  ])("rejects %j, naming %s, and saves nothing (AC-4, AC-5)", async (input, field) => {
    const { companyId } = await createApplication();

    const response = await send("POST", `/api/companies/${String(companyId)}/contacts`, input);

    expect(response.status).toBe(400);
    expect(((await response.json()) as ValidationErrorResponse).fields).toHaveProperty(field);
    expect(await contactsOf(companyId)).toHaveLength(0);
  });

  it("answers 404 for a company that doesn't exist (AC-5)", async () => {
    expect((await send("POST", "/api/companies/999/contacts", { name: "Sam" })).status).toBe(404);
    expect((await send("GET", "/api/companies/999/contacts")).status).toBe(404);
    expect((await send("GET", "/api/companies/abc/contacts")).status).toBe(404);
  });
});

describe("a company's contacts", () => {
  it("are listed by name, ignoring case (AC-2)", async () => {
    const { companyId } = await createApplication();
    for (const name of ["zed", "Bea", "adam", "Cy"]) await addContact(companyId, { name });

    expect((await contactsOf(companyId)).map((c) => c.name)).toEqual(["adam", "Bea", "Cy", "zed"]);
  });

  it("are shared by every application at the company, and not by other companies (AC-3)", async () => {
    const first = await createApplication({ jobTitle: "Engineer" });
    const second = await createApplication({ companyName: "acme", jobTitle: "Designer" });
    const other = await createApplication({ companyName: "Globex" });
    expect(second.companyId).toBe(first.companyId);
    await addContact(first.companyId, { name: "Sam" });

    expect(await contactsOf(second.companyId)).toHaveLength(1);
    expect(await contactsOf(other.companyId)).toHaveLength(0);
  });

  it("stay when an application is deleted", async () => {
    const application = await createApplication();
    await addContact(application.companyId);

    await send("DELETE", `/api/applications/${String(application.id)}`);

    expect(await contactsOf(application.companyId)).toHaveLength(1);
  });
});

describe("editing a contact", () => {
  it("changes every detail, and linked entries show the new name (AC-6)", async () => {
    const application = await createApplication();
    const contact = await addContact(application.companyId, { name: "Sam", role: "Recruiter" });
    await logEntry(application.id, { contactId: contact.id });

    const response = await send("PUT", `/api/contacts/${String(contact.id)}`, { name: "Samantha Lee", email: "s@acme.com" });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Samantha Lee", role: null, email: "s@acme.com", entryCount: 1 });
    expect((await timeline(application.id))[0]).toMatchObject({ contactId: contact.id, contactName: "Samantha Lee" });
  });

  it("rejects bad input and unknown contacts, and changes nothing (AC-5)", async () => {
    const { companyId } = await createApplication();
    const contact = await addContact(companyId);

    const bad = await send("PUT", `/api/contacts/${String(contact.id)}`, { name: "", email: "x" });
    expect(bad.status).toBe(400);
    expect(Object.keys(((await bad.json()) as ValidationErrorResponse).fields).sort()).toEqual(["email", "name"]);
    expect((await contactsOf(companyId))[0]?.name).toBe("Sam Lee");

    expect((await send("PUT", "/api/contacts/999", { name: "x" })).status).toBe(404);
    expect((await send("PUT", "/api/contacts/abc", { name: "x" })).status).toBe(404);
  });
});

describe("deleting a contact", () => {
  it("keeps the entries that named them, with no contact, in every application at the company (AC-7)", async () => {
    const first = await createApplication({ jobTitle: "Engineer" });
    const second = await createApplication({ jobTitle: "Designer" });
    const contact = await addContact(first.companyId);
    await logEntry(first.id, { contactId: contact.id, text: "first app" });
    await logEntry(second.id, { contactId: contact.id, text: "second app" });
    expect((await contactsOf(first.companyId))[0]?.entryCount).toBe(2);

    expect((await send("DELETE", `/api/contacts/${String(contact.id)}`)).status).toBe(204);

    expect(await contactsOf(first.companyId)).toEqual([]);
    for (const [application, text] of [[first, "first app"], [second, "second app"]] as const) {
      expect((await timeline(application.id)).find((e) => e.text === text)).toMatchObject({ contactId: null, contactName: null });
    }
    expect((await send("DELETE", `/api/contacts/${String(contact.id)}`)).status).toBe(404);
    expect((await send("DELETE", "/api/contacts/abc")).status).toBe(404);
  });
});

describe("a contact on a timeline entry", () => {
  it("is saved and shown with the contact's name, and None removes it (AC-8)", async () => {
    const application = await createApplication();
    const contact = await addContact(application.companyId, { name: "Sam" });

    const created = (await (await logEntry(application.id, { contactId: contact.id })).json()) as Activity;
    expect(created).toMatchObject({ contactId: contact.id, contactName: "Sam" });
    expect((await timeline(application.id)).find((e) => e.id === created.id)).toMatchObject({ contactName: "Sam" });

    const cleared = await send("PUT", `/api/activities/${String(created.id)}`, { occurredOn: "2026-10-05", text: "Spoke", contactId: null });
    expect(await cleared.json()).toMatchObject({ contactId: null, contactName: null });
  });

  it("has no contact when none is given (AC-8, AC-12)", async () => {
    const application = await createApplication();

    expect(await (await logEntry(application.id)).json()).toMatchObject({ contactId: null, contactName: null });
    expect((await timeline(application.id)).every((e) => e.contactId === null)).toBe(true);
  });

  it("can be set on an automatic entry (AC-9)", async () => {
    const application = await createApplication({ stage: "applied" });
    const contact = await addContact(application.companyId);
    const [automatic] = await timeline(application.id);

    const response = await send("PUT", `/api/activities/${String(automatic?.id)}`, {
      occurredOn: automatic?.occurredOn,
      text: automatic?.text,
      contactId: contact.id,
    });

    expect(await response.json()).toMatchObject({ type: "stage_change", contactId: contact.id });
  });

  it("must be someone at the application's company, and exist (AC-10)", async () => {
    const application = await createApplication();
    const other = await createApplication({ companyName: "Globex" });
    const stranger = await addContact(other.companyId, { name: "Not ours" });
    const own = await addContact(application.companyId);
    const entry = (await (await logEntry(application.id, { contactId: own.id })).json()) as Activity;

    for (const contactId of [stranger.id, 999]) {
      const added = await logEntry(application.id, { contactId });
      expect(added.status).toBe(400);
      expect(((await added.json()) as ValidationErrorResponse).fields).toHaveProperty("contactId");
      const edited = await send("PUT", `/api/activities/${String(entry.id)}`, { occurredOn: "2026-10-05", text: "x", contactId });
      expect(edited.status).toBe(400);
    }
    expect((await timeline(application.id)).find((e) => e.id === entry.id)).toMatchObject({ text: "Spoke", contactId: own.id });
  });
});

describe("changing an application's company", () => {
  it("clears its entries' contacts, and only its own, while a same-company save keeps them (AC-11)", async () => {
    const moving = await createApplication({ jobTitle: "Engineer" });
    const staying = await createApplication({ jobTitle: "Designer" });
    const contact = await addContact(moving.companyId, { name: "Sam" });
    await logEntry(moving.id, { contactId: contact.id, text: "moving" });
    await logEntry(staying.id, { contactId: contact.id, text: "staying" });

    await send("PUT", `/api/applications/${String(moving.id)}`, { ...moving, nextStep: "same company" });
    expect((await timeline(moving.id)).find((e) => e.text === "moving")?.contactId).toBe(contact.id);

    const response = await send("PUT", `/api/applications/${String(moving.id)}`, { ...moving, companyName: "Globex" });
    expect(response.status).toBe(200);

    const moved = (await timeline(moving.id)).find((e) => e.text === "moving");
    expect(moved).toMatchObject({ contactId: null, contactName: null, text: "moving", type: "call" });
    expect((await timeline(staying.id)).find((e) => e.text === "staying")?.contactId).toBe(contact.id);
    expect(await contactsOf(moving.companyId)).toHaveLength(1);
  });
});
