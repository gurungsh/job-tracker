import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { applicationInputSchema, type ApplicationInput } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../src/db.ts";
import { migrate } from "../../src/migrate.ts";
import {
  createApplication,
  deleteApplication,
  listApplications,
  listCompanies,
  updateApplication,
} from "../../src/applications/store.ts";

const migrationsDir = path.join(import.meta.dirname, "..", "..", "migrations");

let tempDir: string;
let db: DatabaseSync;
let tick = 0;

/** A clock that moves forward one second per call, so created times are distinct. */
function clock(today = "2026-10-01") {
  tick += 1;
  return { today, now: new Date(Date.UTC(2026, 9, 1, 12, 0, tick)).toISOString() };
}

function input(fields: ApplicationInput) {
  return applicationInputSchema.parse(fields);
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-store-"));
  db = openDatabase(path.join(tempDir, "test.db"));
  migrate(db, migrationsDir);
});

afterEach(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("createApplication", () => {
  it("saves every field and returns the stored application", () => {
    const c = clock();
    const created = createApplication(
      db,
      input({
        companyName: "Acme Corp",
        jobTitle: "Engineer",
        stage: "applied",
        nextStep: "Follow up",
        nextStepDue: "2026-10-08",
        appliedOn: "2026-09-30",
      }),
      c,
    );

    expect(created).toEqual({
      id: created.id,
      companyId: created.companyId,
      companyName: "Acme Corp",
      jobTitle: "Engineer",
      stage: "applied",
      nextStep: "Follow up",
      nextStepDue: "2026-10-08",
      appliedOn: "2026-09-30",
      closedOn: null,
      stageChangedAt: c.now,
      createdAt: c.now,
      updatedAt: c.now,
      jobLink: null,
      location: null,
      workMode: null,
      employmentType: null,
      contractLengthMonths: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      source: null,
      jobDescription: null,
    });
    expect(listApplications(db)).toEqual([created]);
  });

  it("reuses an existing company regardless of case and spaces (AC-18)", () => {
    const first = createApplication(db, input({ companyName: "Acme Corp", jobTitle: "A" }), clock());
    const second = createApplication(db, input({ companyName: "  acme CORP ", jobTitle: "B" }), clock());

    expect(second.companyId).toBe(first.companyId);
    expect(second.companyName).toBe("Acme Corp");
    expect(listCompanies(db)).toEqual([{ id: first.companyId, name: "Acme Corp" }]);
  });

  it("creates a new company for a new name, and lists companies by name (AC-19)", () => {
    createApplication(db, input({ companyName: "Initech", jobTitle: "A" }), clock());
    createApplication(db, input({ companyName: "globex", jobTitle: "B" }), clock());

    expect(listCompanies(db).map((company) => company.name)).toEqual(["globex", "Initech"]);
  });

  it("allows two applications with the same company and job title", () => {
    createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer" }), clock());
    createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer" }), clock());

    expect(listApplications(db)).toHaveLength(2);
  });
});

describe("listApplications", () => {
  it("orders by due date, soonest first, then undated ones newest first (AC-4)", () => {
    const add = (jobTitle: string, nextStepDue?: string) =>
      createApplication(db, input({ companyName: "Acme", jobTitle, nextStepDue }), clock());
    add("undated old");
    add("due later", "2026-10-20");
    add("due soon", "2026-10-02");
    add("undated new");
    add("due soon, added later", "2026-10-02");

    expect(listApplications(db).map((application) => application.jobTitle)).toEqual([
      "due soon, added later",
      "due soon",
      "due later",
      "undated new",
      "undated old",
    ]);
  });
});

describe("updateApplication", () => {
  it("replaces the editable fields and applies the stage-date rules", () => {
    const created = createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer" }), clock());
    const c = clock("2026-10-05");

    const updated = updateApplication(
      db,
      created.id,
      input({ companyName: "Globex", jobTitle: "Senior Engineer", stage: "applied", nextStep: "Wait" }),
      c,
    );

    expect(updated).toMatchObject({
      companyName: "Globex",
      jobTitle: "Senior Engineer",
      stage: "applied",
      nextStep: "Wait",
      appliedOn: "2026-10-05",
      stageChangedAt: c.now,
      createdAt: created.createdAt,
      updatedAt: c.now,
    });
    expect(listApplications(db)).toEqual([updated]);
  });

  it("keeps the stage-changed time when the stage doesn't change (AC-15)", () => {
    const created = createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer" }), clock());

    const updated = updateApplication(db, created.id, input({ companyName: "Acme", jobTitle: "Lead" }), clock());

    expect(updated?.stageChangedAt).toBe(created.stageChangedAt);
  });

  it("returns undefined for a missing application", () => {
    expect(updateApplication(db, 999, input({ companyName: "Acme", jobTitle: "A" }), clock())).toBeUndefined();
    expect(listCompanies(db)).toEqual([]);
  });
});

describe("deleteApplication", () => {
  it("deletes the application but keeps its company", () => {
    const created = createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer" }), clock());

    expect(deleteApplication(db, created.id)).toBe(true);
    expect(deleteApplication(db, created.id)).toBe(false);
    expect(listApplications(db)).toEqual([]);
    expect(listCompanies(db)).toEqual([{ id: created.companyId, name: "Acme" }]);
  });
});

describe("job details (spec 003)", () => {
  const details = {
    jobLink: "https://jobs.acme.com/123",
    location: "Austin, TX",
    workMode: "hybrid",
    employmentType: "contract",
    contractLengthMonths: 6,
    salaryMin: 92_500,
    salaryMax: 140_000,
    salaryPeriod: "annual",
    source: "LinkedIn",
    jobDescription: "Line one\n\nLine two",
  } as const;

  it("saves and returns every detail (AC-2)", () => {
    const created = createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer", ...details }), clock());

    expect(created).toMatchObject(details);
    expect(listApplications(db)[0]).toMatchObject(details);
  });

  it("clears details on update (AC-3)", () => {
    const created = createApplication(db, input({ companyName: "Acme", jobTitle: "Engineer", ...details }), clock());

    const updated = updateApplication(db, created.id, input({ companyName: "Acme", jobTitle: "Engineer", location: "Remote" }), clock());

    expect(updated).toMatchObject({
      location: "Remote",
      jobLink: null,
      workMode: null,
      employmentType: null,
      contractLengthMonths: null,
      salaryMin: null,
      salaryMax: null,
      salaryPeriod: null,
      source: null,
      jobDescription: null,
    });
  });
});
