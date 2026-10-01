import type { DatabaseSync } from "node:sqlite";
import type { Application, ApplicationInput, Company, ValidationErrorResponse } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.ts";
import { migratedDatabase, startServer } from "../testing.ts";

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

async function create(input: ApplicationInput, timeZone?: string): Promise<Application> {
  const response = await send("POST", "/api/applications", input, timeZone);
  expect(response.status).toBe(201);
  return (await response.json()) as Application;
}

async function list(): Promise<Application[]> {
  return (await (await fetch(`${baseUrl}/api/applications`)).json()) as Application[];
}

describe("POST /api/applications", () => {
  it("creates an application in Wishlist from just a company and job title (AC-6)", async () => {
    const created = await create({ companyName: "Acme Corp", jobTitle: "Engineer" });

    expect(created).toMatchObject({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "wishlist", appliedOn: null });
    expect(await list()).toEqual([created]);
  });

  it("keeps every field exactly as sent (AC-8)", async () => {
    const created = await create({
      companyName: "Acme Corp",
      jobTitle: "Engineer",
      stage: "interviewing",
      nextStep: "Prep for onsite",
      nextStepDue: "2026-10-09",
      appliedOn: "2026-09-12",
    });

    expect((await list())[0]).toMatchObject({
      companyName: "Acme Corp",
      jobTitle: "Engineer",
      stage: "interviewing",
      nextStep: "Prep for onsite",
      nextStepDue: "2026-10-09",
      appliedOn: "2026-09-12",
    });
    expect(created.id).toBeGreaterThan(0);
  });

  it("rejects invalid input with a message for each field, and saves nothing (AC-21)", async () => {
    const response = await send("POST", "/api/applications", {
      companyName: " ",
      jobTitle: "x".repeat(201),
      stage: "hired",
      nextStepDue: "2026-02-30",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid application",
      fields: {
        companyName: "Company is required",
        jobTitle: "Job title must be 200 characters or fewer",
        stage: "Stage is not valid",
        nextStepDue: "Next step due date must be a valid date",
      },
    } satisfies ValidationErrorResponse);
    expect(await list()).toEqual([]);
  });

  it("rejects a body that isn't valid JSON", async () => {
    const response = await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Request body is not valid JSON" });
  });

  it("uses the X-Time-Zone header for today's date (AC-13)", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 9:30 p.m. on Sept. 30 in Chicago, already Oct. 1 in UTC.
    vi.setSystemTime(new Date("2026-10-01T02:30:00Z"));

    const chicago = await create({ companyName: "Acme", jobTitle: "A", stage: "applied" }, "America/Chicago");
    const utc = await create({ companyName: "Acme", jobTitle: "B", stage: "applied" }, "UTC");

    expect(chicago.appliedOn).toBe("2026-09-30");
    expect(utc.appliedOn).toBe("2026-10-01");
  });
});

describe("GET /api/applications", () => {
  it("orders by due date, then undated newest first (AC-4)", async () => {
    await create({ companyName: "Acme", jobTitle: "undated old" });
    await create({ companyName: "Acme", jobTitle: "due later", nextStepDue: "2026-11-01" });
    await create({ companyName: "Acme", jobTitle: "due soon", nextStepDue: "2026-10-05" });
    await create({ companyName: "Acme", jobTitle: "undated new" });

    expect((await list()).map((application) => application.jobTitle)).toEqual([
      "due soon",
      "due later",
      "undated new",
      "undated old",
    ]);
  });
});

describe("PUT /api/applications/:id", () => {
  it("saves edits and sets the stage dates when the stage changes (AC-10, AC-12, AC-14)", async () => {
    const created = await create({ companyName: "Acme", jobTitle: "Engineer", stage: "offer", appliedOn: "2026-09-01" });

    const response = await send("PUT", `/api/applications/${String(created.id)}`, {
      companyName: "Acme",
      jobTitle: "Staff Engineer",
      stage: "accepted",
      appliedOn: "2026-09-01",
    });

    expect(response.status).toBe(200);
    const updated = (await response.json()) as Application;
    expect(updated).toMatchObject({ jobTitle: "Staff Engineer", stage: "accepted", appliedOn: "2026-09-01" });
    expect(updated.closedOn).not.toBeNull();
    expect(updated.stageChangedAt >= created.stageChangedAt).toBe(true);
    expect(await list()).toEqual([updated]);
  });

  it("leaves the stage-changed time alone when the stage is unchanged (AC-15)", async () => {
    const created = await create({ companyName: "Acme", jobTitle: "Engineer" });

    const response = await send("PUT", `/api/applications/${String(created.id)}`, {
      companyName: "Acme",
      jobTitle: "Lead",
    });

    expect(((await response.json()) as Application).stageChangedAt).toBe(created.stageChangedAt);
  });

  it("returns 404 for a missing or non-numeric id, and 400 for invalid input", async () => {
    const created = await create({ companyName: "Acme", jobTitle: "Engineer" });

    expect((await send("PUT", "/api/applications/999", { companyName: "A", jobTitle: "B" })).status).toBe(404);
    expect((await send("PUT", "/api/applications/abc", { companyName: "A", jobTitle: "B" })).status).toBe(404);
    expect((await send("PUT", `/api/applications/${String(created.id)}`, { companyName: "A" })).status).toBe(400);
  });
});

describe("DELETE /api/applications/:id", () => {
  it("deletes once, then returns 404 (AC-16)", async () => {
    const created = await create({ companyName: "Acme", jobTitle: "Engineer" });

    expect((await send("DELETE", `/api/applications/${String(created.id)}`)).status).toBe(204);
    expect((await send("DELETE", `/api/applications/${String(created.id)}`)).status).toBe(404);
    expect(await list()).toEqual([]);
  });
});

describe("GET /api/companies", () => {
  it("reuses companies regardless of case and lists new ones (AC-18, AC-19)", async () => {
    await create({ companyName: "Acme Corp", jobTitle: "A" });
    const reused = await create({ companyName: " acme corp ", jobTitle: "B" });
    await create({ companyName: "Globex", jobTitle: "C" });

    const companies = (await (await fetch(`${baseUrl}/api/companies`)).json()) as Company[];

    expect(reused.companyName).toBe("Acme Corp");
    expect(companies.map((company) => company.name)).toEqual(["Acme Corp", "Globex"]);
  });
});
