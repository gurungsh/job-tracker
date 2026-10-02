import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/db.ts";
import { migrate } from "../src/migrate.ts";

const migrationsDir = path.join(import.meta.dirname, "..", "migrations");
const now = "2026-10-01T12:00:00.000Z";

let tempDir: string;
let db: DatabaseSync;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-schema-"));
  db = openDatabase(path.join(tempDir, "test.db"));
  migrate(db, migrationsDir);
});

afterEach(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("real migrations", () => {
  it("create the companies, applications, activities, contacts, and requirements tables", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => row.name);

    expect(tables).toEqual(["activities", "applications", "companies", "contacts", "requirements", "schema_migrations"]);
  });

  it("make company names unique regardless of case", () => {
    db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme Corp", now);

    expect(() => db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("ACME corp", now)).toThrow(
      /UNIQUE/,
    );
    expect(db.prepare("SELECT name FROM companies WHERE name = ?").get("acme CORP")).toEqual({ name: "Acme Corp" });
  });

  it("reject an unknown stage and an application without a company", () => {
    const insert = db.prepare(
      `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );

    expect(() => insert.run(999, "Engineer", "wishlist", now, now, now)).toThrow(/FOREIGN KEY/);
    const { lastInsertRowid } = db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme", now);
    expect(() => insert.run(lastInsertRowid, "Engineer", "hired", now, now, now)).toThrow(/CHECK/);
  });
});

describe("migration 0002 (job details)", () => {
  const detailColumns = [
    "job_link",
    "location",
    "work_mode",
    "employment_type",
    "contract_length_months",
    "salary_min",
    "salary_max",
    "salary_period",
    "source",
    "job_description",
  ];

  it("adds the job detail columns to applications", () => {
    const columns = db
      .prepare("SELECT name FROM pragma_table_info('applications')")
      .all()
      .map((row) => row.name);

    expect(columns).toEqual(expect.arrayContaining(detailColumns));
  });

  it("keeps existing applications, with empty details (spec 003, AC-9)", () => {
    const oldDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-old-migrations-"));
    const oldDb = openDatabase(path.join(tempDir, "old.db"));
    try {
      fs.copyFileSync(
        path.join(migrationsDir, "0001_create_companies_and_applications.sql"),
        path.join(oldDir, "0001_create_companies_and_applications.sql"),
      );
      migrate(oldDb, oldDir);
      const { lastInsertRowid } = oldDb.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme", now);
      oldDb
        .prepare(
          `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at)
           VALUES (?, 'Engineer', 'applied', ?, ?, ?)`,
        )
        .run(lastInsertRowid, now, now, now);

      expect(migrate(oldDb, migrationsDir)).toEqual([
        "0002_add_job_details.sql",
        "0003_create_activities.sql",
        "0004_create_contacts.sql",
        "0005_create_requirements.sql",
      ]);
      const row = oldDb.prepare(`SELECT job_title, ${detailColumns.join(", ")} FROM applications`).get();
      expect(row).toEqual({ job_title: "Engineer", ...Object.fromEntries(detailColumns.map((column) => [column, null])) });
    } finally {
      oldDb.close();
      fs.rmSync(oldDir, { recursive: true, force: true });
    }
  });

  it("rejects unknown options and out-of-range numbers", () => {
    const { lastInsertRowid: companyId } = db
      .prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)")
      .run("Acme", now);
    const insert = (column: string, value: string | number) =>
      db
        .prepare(
          `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at, ${column})
           VALUES (?, 'Engineer', 'wishlist', ?, ?, ?, ?)`,
        )
        .run(companyId, now, now, now, value);

    expect(() => insert("work_mode", "moon")).toThrow(/CHECK/);
    expect(() => insert("employment_type", "gig")).toThrow(/CHECK/);
    expect(() => insert("salary_period", "weekly")).toThrow(/CHECK/);
    expect(() => insert("contract_length_months", 0)).toThrow(/CHECK/);
    expect(() => insert("salary_min", -1)).toThrow(/CHECK/);
    expect(() => insert("salary_max", 10_000_001)).toThrow(/CHECK/);
    expect(() => insert("salary_min", 0)).not.toThrow();
  });
});

describe("migration 0003 (activities)", () => {
  function addApplication(): number {
    const { lastInsertRowid: companyId } = db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme", now);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at)
         VALUES (?, 'Engineer', 'applied', ?, ?, ?)`,
      )
      .run(companyId, now, now, now);
    return Number(lastInsertRowid);
  }

  const insert = (applicationId: number, type: string) =>
    db
      .prepare("INSERT INTO activities (application_id, type, occurred_on, text, created_at, updated_at) VALUES (?, ?, '2026-10-01', 'x', ?, ?)")
      .run(applicationId, type, now, now);

  it("starts empty for existing applications (spec 007, AC-10)", () => {
    addApplication();

    expect(db.prepare("SELECT COUNT(*) AS n FROM activities").get()).toEqual({ n: 0 });
  });

  it("rejects an unknown type and an unknown application", () => {
    const id = addApplication();

    expect(() => insert(id, "meeting")).toThrow(/CHECK/);
    expect(() => insert(999, "note")).toThrow(/FOREIGN KEY/);
  });

  it("removes an application's entries when it is deleted (spec 007, AC-11)", () => {
    const id = addApplication();
    insert(id, "note");
    insert(id, "stage_change");

    db.prepare("DELETE FROM applications WHERE id = ?").run(id);

    expect(db.prepare("SELECT COUNT(*) AS n FROM activities").get()).toEqual({ n: 0 });
  });
});

describe("migration 0004 (contacts)", () => {
  function addEntry(): { companyId: number; applicationId: number; activityId: number } {
    const { lastInsertRowid: companyId } = db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme", now);
    const { lastInsertRowid: applicationId } = db
      .prepare(
        `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at)
         VALUES (?, 'Engineer', 'applied', ?, ?, ?)`,
      )
      .run(companyId, now, now, now);
    const { lastInsertRowid: activityId } = db
      .prepare("INSERT INTO activities (application_id, type, occurred_on, text, created_at, updated_at) VALUES (?, 'note', '2026-10-01', 'x', ?, ?)")
      .run(applicationId, now, now);
    return { companyId: Number(companyId), applicationId: Number(applicationId), activityId: Number(activityId) };
  }

  const addContact = (companyId: number) =>
    Number(
      db.prepare("INSERT INTO contacts (company_id, name, created_at, updated_at) VALUES (?, 'Sam', ?, ?)").run(companyId, now, now)
        .lastInsertRowid,
    );

  it("leaves existing entries with no contact (spec 008, AC-12)", () => {
    const oldDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-old-migrations-"));
    const oldDb = openDatabase(path.join(tempDir, "old3.db"));
    try {
      for (const file of fs.readdirSync(migrationsDir).filter((name) => !name.startsWith("0004") && !name.startsWith("0005"))) {
        fs.copyFileSync(path.join(migrationsDir, file), path.join(oldDir, file));
      }
      migrate(oldDb, oldDir);
      const { lastInsertRowid: companyId } = oldDb.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme", now);
      const { lastInsertRowid: applicationId } = oldDb
        .prepare(
          `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at)
           VALUES (?, 'Engineer', 'applied', ?, ?, ?)`,
        )
        .run(companyId, now, now, now);
      oldDb
        .prepare("INSERT INTO activities (application_id, type, occurred_on, text, created_at, updated_at) VALUES (?, 'note', '2026-10-01', 'kept', ?, ?)")
        .run(applicationId, now, now);

      expect(migrate(oldDb, migrationsDir)).toEqual(["0004_create_contacts.sql", "0005_create_requirements.sql"]);
      expect(oldDb.prepare("SELECT text, contact_id FROM activities").get()).toEqual({ text: "kept", contact_id: null });
      expect(oldDb.prepare("SELECT COUNT(*) AS n FROM contacts").get()).toEqual({ n: 0 });
    } finally {
      oldDb.close();
      fs.rmSync(oldDir, { recursive: true, force: true });
    }
  });

  it("rejects a contact at a company that doesn't exist, and an entry naming an unknown contact", () => {
    const { activityId } = addEntry();

    expect(() => addContact(999)).toThrow(/FOREIGN KEY/);
    expect(() => db.prepare("UPDATE activities SET contact_id = 999 WHERE id = ?").run(activityId)).toThrow(/FOREIGN KEY/);
  });

  it("unlinks entries, and keeps them, when a contact is deleted (spec 008, AC-7)", () => {
    const { companyId, activityId } = addEntry();
    const contactId = addContact(companyId);
    db.prepare("UPDATE activities SET contact_id = ? WHERE id = ?").run(contactId, activityId);

    db.prepare("DELETE FROM contacts WHERE id = ?").run(contactId);

    expect(db.prepare("SELECT contact_id FROM activities WHERE id = ?").get(activityId)).toEqual({ contact_id: null });
  });

  it("keeps a company's contacts when its application is deleted (spec 008 rules)", () => {
    const { companyId, applicationId } = addEntry();
    addContact(companyId);

    db.prepare("DELETE FROM applications WHERE id = ?").run(applicationId);

    expect(db.prepare("SELECT COUNT(*) AS n FROM contacts").get()).toEqual({ n: 1 });
  });
});

describe("migration 0005 (requirements)", () => {
  function addApplication(): number {
    const { lastInsertRowid: companyId } = db.prepare("INSERT INTO companies (name, created_at) VALUES (?, ?)").run("Acme", now);
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO applications (company_id, job_title, stage, stage_changed_at, created_at, updated_at)
         VALUES (?, 'Engineer', 'applied', ?, ?, ?)`,
      )
      .run(companyId, now, now, now);
    return Number(lastInsertRowid);
  }

  const insert = (applicationId: number, kind: string, met = 0) =>
    db
      .prepare("INSERT INTO requirements (application_id, text, kind, met, created_at, updated_at) VALUES (?, 'Go', ?, ?, ?, ?)")
      .run(applicationId, kind, met, now, now);

  it("starts empty for existing applications (spec 009, AC-12)", () => {
    addApplication();

    expect(db.prepare("SELECT COUNT(*) AS n FROM requirements").get()).toEqual({ n: 0 });
  });

  it("rejects an unknown kind, a met value other than 0 or 1, and an unknown application", () => {
    const id = addApplication();

    expect(() => insert(id, "nice")).toThrow(/CHECK/);
    expect(() => insert(id, "required", 2)).toThrow(/CHECK/);
    expect(() => insert(999, "required")).toThrow(/FOREIGN KEY/);
  });

  it("removes an application's requirements when it is deleted (spec 009, AC-11)", () => {
    const id = addApplication();
    insert(id, "required");
    insert(id, "preferred", 1);

    db.prepare("DELETE FROM applications WHERE id = ?").run(id);

    expect(db.prepare("SELECT COUNT(*) AS n FROM requirements").get()).toEqual({ n: 0 });
  });
});
