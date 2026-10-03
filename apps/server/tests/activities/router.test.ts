import type { DatabaseSync } from "node:sqlite";
import type { Activity, Application, ApplicationInput, ValidationErrorResponse } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.ts";
import { migratedDatabase, startServer } from "../support/testing.ts";

let db: DatabaseSync;
let baseUrl: string;

beforeEach(async () => {
  db = migratedDatabase();
  baseUrl = await startServer(createApp({ db }));
});

afterEach(() => {
  vi.useRealTimers();
  db.close();
});

function send(method: string, path: string, body?: unknown, timeZone = "UTC") {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Time-Zone": timeZone },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function createApplication(input: Partial<ApplicationInput> = {}, timeZone?: string): Promise<Application> {
  const response = await send("POST", "/api/applications", { companyName: "Acme", jobTitle: "Engineer", ...input }, timeZone);
  expect(response.status).toBe(201);
  return (await response.json()) as Application;
}

async function timeline(applicationId: number): Promise<Activity[]> {
  const response = await send("GET", `/api/applications/${String(applicationId)}/activities`);
  expect(response.status).toBe(200);
  return (await response.json()) as Activity[];
}

async function log(applicationId: number, entry: Record<string, unknown>) {
  return send("POST", `/api/applications/${String(applicationId)}/activities`, entry);
}

const call = { type: "call", occurredOn: "2026-10-05", text: "Spoke with the recruiter" };

describe("adding an entry", () => {
  it("saves it and returns it, and it is there on the next read (AC-2)", async () => {
    const { id } = await createApplication();

    const response = await log(id, { ...call, text: "  Line one\n\nLine two  " });

    expect(response.status).toBe(201);
    const created = (await response.json()) as Activity;
    expect(created).toMatchObject({ applicationId: id, type: "call", occurredOn: "2026-10-05", text: "Line one\n\nLine two" });
    expect((await timeline(id))[0]).toEqual(created);
  });

  it("allows past and future dates (AC-2)", async () => {
    const { id } = await createApplication();

    expect((await log(id, { ...call, occurredOn: "2020-01-01" })).status).toBe(201);
    expect((await log(id, { ...call, occurredOn: "2099-12-31" })).status).toBe(201);
  });

  it.each([
    [{ ...call, text: "" }, "text"],
    [{ ...call, text: "x".repeat(5001) }, "text"],
    [{ ...call, occurredOn: "2026-13-01" }, "occurredOn"],
    [{ ...call, type: "stage_change" }, "type"],
    [{ ...call, type: "meeting" }, "type"],
    [{}, "type"],
  ])("rejects %j, naming %s, and saves nothing (AC-4, AC-5)", async (entry, field) => {
    const { id } = await createApplication();
    const before = (await timeline(id)).length;

    const response = await log(id, entry);

    expect(response.status).toBe(400);
    expect(((await response.json()) as ValidationErrorResponse).fields).toHaveProperty(field);
    expect(await timeline(id)).toHaveLength(before);
  });

  it("answers 404 for an application that doesn't exist (AC-5)", async () => {
    expect((await log(999, call)).status).toBe(404);
    expect((await send("GET", "/api/applications/999/activities")).status).toBe(404);
    expect((await send("GET", "/api/applications/abc/activities")).status).toBe(404);
  });
});

describe("the timeline", () => {
  it("lists the newest date first, and the last one added first within a date (AC-3)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-01T12:00:00.000Z"));
    const { id } = await createApplication();
    await log(id, { ...call, occurredOn: "2026-10-05", text: "first on the 5th" });
    await log(id, { ...call, occurredOn: "2026-10-09", text: "the 9th" });
    await log(id, { ...call, occurredOn: "2026-10-05", text: "second on the 5th" });
    await log(id, { ...call, occurredOn: "2026-09-01", text: "september" });

    const texts = (await timeline(id)).map((entry) => entry.text);

    // The application's own "Added to" entry is dated Oct. 1.
    expect(texts).toEqual(["the 9th", "second on the 5th", "first on the 5th", "Added to Wishlist", "september"]);
  });

  it("only lists the application's own entries", async () => {
    const a = await createApplication();
    const b = await createApplication({ jobTitle: "Designer" });
    await log(a.id, { ...call, text: "for a" });

    expect((await timeline(b.id)).map((entry) => entry.text)).not.toContain("for a");
  });
});

describe("automatic entries", () => {
  it("records the starting stage when an application is added, dated by the client's time zone (AC-6)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-02T03:00:00.000Z"));

    const { id } = await createApplication({ stage: "applied" }, "America/Los_Angeles");

    expect(await timeline(id)).toEqual([
      expect.objectContaining({ type: "stage_change", text: "Added to Applied", occurredOn: "2026-10-01" }),
    ]);
  });

  it("records a move, once, even when other fields change in the same save (AC-7)", async () => {
    const created = await createApplication();

    await send("PUT", `/api/applications/${String(created.id)}`, {
      ...created,
      stage: "interviewing",
      jobTitle: "Senior Engineer",
    });

    const moves = (await timeline(created.id)).filter((entry) => entry.text.startsWith("Moved"));
    expect(moves).toEqual([expect.objectContaining({ type: "stage_change", text: "Moved from Wishlist to Interviewing" })]);
  });

  it("records nothing when the stage stays the same (AC-7)", async () => {
    const created = await createApplication();

    await send("PUT", `/api/applications/${String(created.id)}`, { ...created, nextStep: "Call them" });

    expect(await timeline(created.id)).toHaveLength(1);
  });

  it("records every move, including back and forth (AC-7)", async () => {
    const created = await createApplication();
    const put = (stage: string) => send("PUT", `/api/applications/${String(created.id)}`, { ...created, stage });

    await put("applied");
    await put("wishlist");
    await put("applied");

    expect((await timeline(created.id)).map((entry) => entry.text)).toEqual([
      "Moved from Wishlist to Applied",
      "Moved from Applied to Wishlist",
      "Moved from Wishlist to Applied",
      "Added to Wishlist",
    ]);
  });

  it("writes no entry when the save is rejected", async () => {
    const created = await createApplication();

    const response = await send("PUT", `/api/applications/${String(created.id)}`, { ...created, stage: "hired" });

    expect(response.status).toBe(400);
    expect(await timeline(created.id)).toHaveLength(1);
  });
});

describe("editing an entry", () => {
  async function addCall(applicationId: number): Promise<Activity> {
    return (await (await log(applicationId, call)).json()) as Activity;
  }

  it("changes the date, text, and type (AC-8)", async () => {
    const { id } = await createApplication();
    const entry = await addCall(id);

    const response = await send("PUT", `/api/activities/${String(entry.id)}`, {
      type: "interview",
      occurredOn: "2026-10-12",
      text: "Onsite",
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: entry.id, type: "interview", occurredOn: "2026-10-12", text: "Onsite" });
    expect((await timeline(id)).find((e) => e.id === entry.id)).toMatchObject({ type: "interview", text: "Onsite" });
  });

  it("keeps the type when it is left out (AC-8)", async () => {
    const { id } = await createApplication();
    const entry = await addCall(id);

    const response = await send("PUT", `/api/activities/${String(entry.id)}`, { occurredOn: "2026-10-12", text: "New text" });

    expect(await response.json()).toMatchObject({ type: "call", text: "New text" });
  });

  it("lets a stage-change entry change its date and text but not its type (AC-8)", async () => {
    const { id } = await createApplication();
    const [automatic] = await timeline(id);

    const edited = await send("PUT", `/api/activities/${String(automatic?.id)}`, { occurredOn: "2026-09-30", text: "Found the posting" });
    expect(await edited.json()).toMatchObject({ type: "stage_change", occurredOn: "2026-09-30", text: "Found the posting" });

    const retyped = await send("PUT", `/api/activities/${String(automatic?.id)}`, { type: "note", occurredOn: "2026-09-30", text: "x" });
    expect(retyped.status).toBe(400);
  });

  it("doesn't let a logged entry become a stage change (AC-5)", async () => {
    const { id } = await createApplication();
    const entry = await addCall(id);

    const response = await send("PUT", `/api/activities/${String(entry.id)}`, { type: "stage_change", occurredOn: "2026-10-12", text: "x" });

    expect(response.status).toBe(400);
  });

  it("rejects bad input and unknown entries, and changes nothing (AC-5)", async () => {
    const { id } = await createApplication();
    const entry = await addCall(id);

    const bad = await send("PUT", `/api/activities/${String(entry.id)}`, { occurredOn: "nope", text: "" });
    expect(bad.status).toBe(400);
    expect(Object.keys(((await bad.json()) as ValidationErrorResponse).fields).sort()).toEqual(["occurredOn", "text"]);
    expect((await timeline(id)).find((e) => e.id === entry.id)).toMatchObject({ text: call.text });

    expect((await send("PUT", "/api/activities/999", { occurredOn: "2026-10-12", text: "x" })).status).toBe(404);
    expect((await send("PUT", "/api/activities/abc", { occurredOn: "2026-10-12", text: "x" })).status).toBe(404);
  });

  it("doesn't change the application's stage or dates (spec 007 rules)", async () => {
    const created = await createApplication({ stage: "applied" });
    const [automatic] = await timeline(created.id);

    await send("PUT", `/api/activities/${String(automatic?.id)}`, { occurredOn: "2020-01-01", text: "edited" });
    await send("DELETE", `/api/activities/${String(automatic?.id)}`);

    const applications = (await (await send("GET", "/api/applications")).json()) as Application[];
    expect(applications.find((a) => a.id === created.id)).toEqual(created);
  });
});

describe("deleting an entry", () => {
  it("removes it (AC-9)", async () => {
    const { id } = await createApplication();
    const entry = (await (await log(id, call)).json()) as Activity;

    expect((await send("DELETE", `/api/activities/${String(entry.id)}`)).status).toBe(204);

    expect((await timeline(id)).map((e) => e.id)).not.toContain(entry.id);
    expect((await send("DELETE", `/api/activities/${String(entry.id)}`)).status).toBe(404);
    expect((await send("DELETE", "/api/activities/abc")).status).toBe(404);
  });

  it("is also gone when the application is deleted (AC-11)", async () => {
    const { id } = await createApplication();
    await log(id, call);

    expect((await send("DELETE", `/api/applications/${String(id)}`)).status).toBe(204);

    expect(db.prepare("SELECT COUNT(*) AS n FROM activities").get()).toEqual({ n: 0 });
    expect((await send("GET", `/api/applications/${String(id)}/activities`)).status).toBe(404);
  });
});

describe("entry times (spec 017)", () => {
  it("saves an optional time, and an entry without one stays date-only (AC-9, AC-10)", async () => {
    const { id } = await createApplication();

    const timed = (await (await log(id, { ...call, occurredTime: "14:30" })).json()) as Activity;
    const untimed = (await (await log(id, call)).json()) as Activity;
    const emptied = (await (await log(id, { ...call, occurredTime: "" })).json()) as Activity;

    expect(timed.occurredTime).toBe("14:30");
    expect(untimed.occurredTime).toBeNull();
    expect(emptied.occurredTime).toBeNull();
    expect((await timeline(id)).find((e) => e.id === timed.id)?.occurredTime).toBe("14:30");
  });

  it("changes and clears a time when editing (AC-9)", async () => {
    const { id } = await createApplication();
    const entry = (await (await log(id, call)).json()) as Activity;

    const set = await send("PUT", `/api/activities/${String(entry.id)}`, { ...call, occurredTime: "09:15" });
    expect(((await set.json()) as Activity).occurredTime).toBe("09:15");

    const cleared = await send("PUT", `/api/activities/${String(entry.id)}`, { ...call, occurredTime: null });
    expect(((await cleared.json()) as Activity).occurredTime).toBeNull();
  });

  it.each(["25:00", "12:60", "9:30", "noon"])("rejects the time %j with a message on the field (AC-9)", async (time) => {
    const { id } = await createApplication();
    const entry = (await (await log(id, call)).json()) as Activity;

    for (const response of [await log(id, { ...call, occurredTime: time }), await send("PUT", `/api/activities/${String(entry.id)}`, { ...call, occurredTime: time })]) {
      expect(response.status).toBe(400);
      expect(((await response.json()) as ValidationErrorResponse).fields).toEqual({ occurredTime: "Time must be a valid time" });
    }
  });

  it("lists newest date first, then timed before untimed with the later time first, then newest added (AC-11)", async () => {
    const { id } = await createApplication();
    const added = async (occurredOn: string, occurredTime?: string) =>
      ((await (await log(id, { ...call, occurredOn, occurredTime })).json()) as Activity).id;
    const a = await added("2026-10-05");
    const b = await added("2026-10-05", "09:00");
    const c = await added("2026-10-05");
    const d = await added("2026-10-05", "15:30");
    const e = await added("2026-10-06");
    const f = await added("2026-10-04", "23:00");

    const ids = (await timeline(id)).map((entry) => entry.id);

    // The application's own "Added to Wishlist" entry is dated today, so look only at these six.
    expect(ids.filter((entryId) => [a, b, c, d, e, f].includes(entryId))).toEqual([e, d, b, c, a, f]);
  });

  it("gives the automatic entries no time (AC-10)", async () => {
    const { id } = await createApplication();
    await send("PUT", `/api/applications/${String(id)}`, { companyName: "Acme", jobTitle: "Engineer", stage: "applied" });

    const entries = await timeline(id);

    expect(entries.filter((entry) => entry.type === "stage_change")).toHaveLength(2);
    expect(entries.every((entry) => entry.occurredTime === null)).toBe(true);
  });
});
