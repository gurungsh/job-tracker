import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "./db.ts";
import { migrate } from "./migrate.ts";

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
  it("create the companies and applications tables", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => row.name);

    expect(tables).toEqual(["applications", "companies", "schema_migrations"]);
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
