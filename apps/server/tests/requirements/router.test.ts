import type { DatabaseSync } from "node:sqlite";
import type { Application, ApplicationInput, Requirement, ValidationErrorResponse } from "@job-tracker/shared";
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

async function list(applicationId: number): Promise<Requirement[]> {
  const response = await send("GET", `/api/applications/${String(applicationId)}/requirements`);
  expect(response.status).toBe(200);
  return (await response.json()) as Requirement[];
}

function add(applicationId: number, item: Record<string, unknown>) {
  return send("POST", `/api/applications/${String(applicationId)}/requirements`, item);
}

async function addOk(applicationId: number, text: string, kind: string, met?: boolean): Promise<Requirement> {
  const response = await add(applicationId, { text, kind, ...(met === undefined ? {} : { met }) });
  expect(response.status).toBe(201);
  return (await response.json()) as Requirement;
}

describe("adding a requirement", () => {
  it("saves it unmet and returns it, and it is there on the next read (AC-3)", async () => {
    const { id } = await createApplication();

    const created = await addOk(id, "  5 years of Go  ", "required");

    expect(created).toMatchObject({ applicationId: id, text: "5 years of Go", kind: "required", met: false });
    expect(await list(id)).toEqual([created]);
  });

  it("allows two items with the same text", async () => {
    const { id } = await createApplication();

    await addOk(id, "Go", "required");
    await addOk(id, "Go", "required");

    expect(await list(id)).toHaveLength(2);
  });

  it.each([
    [{ kind: "required" }, "text"],
    [{ text: "  ", kind: "required" }, "text"],
    [{ text: "x".repeat(501), kind: "required" }, "text"],
    [{ text: "Go", kind: "nice" }, "kind"],
    [{ text: "Go" }, "kind"],
    [{ text: "Go", kind: "required", met: "yes" }, "met"],
  ])("rejects %j, naming %s, and saves nothing (AC-9, AC-10)", async (item, field) => {
    const { id } = await createApplication();

    const response = await add(id, item);

    expect(response.status).toBe(400);
    expect(((await response.json()) as ValidationErrorResponse).fields).toHaveProperty(field);
    expect(await list(id)).toHaveLength(0);
  });

  it("answers 404 for an application that doesn't exist (AC-10)", async () => {
    expect((await add(999, { text: "Go", kind: "required" })).status).toBe(404);
    expect((await send("GET", "/api/applications/999/requirements")).status).toBe(404);
    expect((await send("GET", "/api/applications/abc/requirements")).status).toBe(404);
  });
});

describe("the list", () => {
  it("has required items first, then preferred, each in the order added (AC-4)", async () => {
    const { id } = await createApplication();
    await addOk(id, "pref 1", "preferred");
    await addOk(id, "req 1", "required");
    await addOk(id, "pref 2", "preferred");
    await addOk(id, "req 2", "required");

    expect((await list(id)).map((item) => item.text)).toEqual(["req 1", "req 2", "pref 1", "pref 2"]);
  });

  it("only has the application's own items, and is empty for an application without any (AC-12)", async () => {
    const a = await createApplication();
    const b = await createApplication({ jobTitle: "Designer" });
    await addOk(a.id, "for a", "required");

    expect(await list(b.id)).toEqual([]);
  });
});

describe("changing a requirement", () => {
  it("checks and unchecks it, and it keeps its place (AC-5)", async () => {
    const { id } = await createApplication();
    const first = await addOk(id, "first", "required");
    await addOk(id, "second", "required");

    const checked = await send("PUT", `/api/requirements/${String(first.id)}`, { text: "first", kind: "required", met: true });
    expect(await checked.json()).toMatchObject({ id: first.id, met: true });
    expect((await list(id)).map((item) => [item.text, item.met])).toEqual([["first", true], ["second", false]]);

    await send("PUT", `/api/requirements/${String(first.id)}`, { text: "first", kind: "required", met: false });
    expect((await list(id))[0]?.met).toBe(false);
  });

  it("changes the text and kind, keeps whether it is met, and moves it to the other group (AC-7)", async () => {
    const { id } = await createApplication();
    const mover = await addOk(id, "mover", "required", true);
    await addOk(id, "stays", "required");
    await addOk(id, "pref", "preferred");

    const response = await send("PUT", `/api/requirements/${String(mover.id)}`, { text: "  Moved  ", kind: "preferred", met: true });

    expect(await response.json()).toMatchObject({ text: "Moved", kind: "preferred", met: true });
    // Preferred items stay in the order added, and the mover was added before "pref".
    expect((await list(id)).map((item) => item.text)).toEqual(["stays", "Moved", "pref"]);
  });

  it("rejects bad input and unknown items, and changes nothing (AC-10)", async () => {
    const { id } = await createApplication();
    const item = await addOk(id, "Go", "required");

    const bad = await send("PUT", `/api/requirements/${String(item.id)}`, { text: "", kind: "nope" });
    expect(bad.status).toBe(400);
    expect(Object.keys(((await bad.json()) as ValidationErrorResponse).fields).sort()).toEqual(["kind", "text"]);
    expect((await list(id))[0]).toMatchObject({ text: "Go", kind: "required" });

    expect((await send("PUT", "/api/requirements/999", { text: "x", kind: "required" })).status).toBe(404);
    expect((await send("PUT", "/api/requirements/abc", { text: "x", kind: "required" })).status).toBe(404);
  });

  it("doesn't touch the application's stage, dates, or timeline (spec 009 rules)", async () => {
    const created = await createApplication({ stage: "applied" });
    const item = await addOk(created.id, "Go", "required");
    const timelineBefore = await (await send("GET", `/api/applications/${String(created.id)}/activities`)).json();

    await send("PUT", `/api/requirements/${String(item.id)}`, { text: "Go", kind: "required", met: true });
    await send("DELETE", `/api/requirements/${String(item.id)}`);

    const applications = (await (await send("GET", "/api/applications")).json()) as Application[];
    expect(applications.find((a) => a.id === created.id)).toEqual(created);
    expect(await (await send("GET", `/api/applications/${String(created.id)}/activities`)).json()).toEqual(timelineBefore);
  });
});

describe("deleting a requirement", () => {
  it("removes it (AC-8)", async () => {
    const { id } = await createApplication();
    const item = await addOk(id, "Go", "required");

    expect((await send("DELETE", `/api/requirements/${String(item.id)}`)).status).toBe(204);

    expect(await list(id)).toEqual([]);
    expect((await send("DELETE", `/api/requirements/${String(item.id)}`)).status).toBe(404);
    expect((await send("DELETE", "/api/requirements/abc")).status).toBe(404);
  });

  it("happens to all of an application's items when the application is deleted (AC-11)", async () => {
    const { id } = await createApplication();
    await addOk(id, "Go", "required");
    await addOk(id, "Rust", "preferred");

    expect((await send("DELETE", `/api/applications/${String(id)}`)).status).toBe(204);

    expect(db.prepare("SELECT COUNT(*) AS n FROM requirements").get()).toEqual({ n: 0 });
    expect((await send("GET", `/api/applications/${String(id)}/requirements`)).status).toBe(404);
  });
});
