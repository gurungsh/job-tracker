import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../src/db.ts";
import { migrate } from "../src/migrate.ts";

let tempDir: string;
let migrationsDir: string;
let db: DatabaseSync;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-migrate-"));
  migrationsDir = path.join(tempDir, "migrations");
  fs.mkdirSync(migrationsDir);
  db = openDatabase(path.join(tempDir, "test.db"));
});

afterEach(() => {
  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

function writeMigrations(files: Record<string, string>): void {
  for (const [name, sql] of Object.entries(files)) {
    fs.writeFileSync(path.join(migrationsDir, name), sql);
  }
}

function appliedVersions(): string[] {
  return db
    .prepare("SELECT version FROM schema_migrations ORDER BY version")
    .all()
    .map((row) => String(row.version));
}

describe("migrate", () => {
  it("applies pending migrations in version order and records them", () => {
    writeMigrations({
      "0002_add_note.sql": "ALTER TABLE things ADD COLUMN note TEXT;",
      "0001_create_things.sql": "CREATE TABLE things (id INTEGER PRIMARY KEY, name TEXT NOT NULL);",
    });

    const applied = migrate(db, migrationsDir);

    expect(applied).toEqual(["0001_create_things.sql", "0002_add_note.sql"]);
    expect(appliedVersions()).toEqual(["0001", "0002"]);
    db.prepare("INSERT INTO things (name, note) VALUES (?, ?)").run("a", "b");
  });

  it("does nothing when there are no migration files", () => {
    fs.writeFileSync(path.join(migrationsDir, ".gitkeep"), "");

    expect(migrate(db, migrationsDir)).toEqual([]);
    expect(appliedVersions()).toEqual([]);
  });

  it("does not re-apply migrations, and leaves existing data unchanged", () => {
    writeMigrations({ "0001_create_things.sql": "CREATE TABLE things (id INTEGER PRIMARY KEY, name TEXT NOT NULL);" });
    migrate(db, migrationsDir);
    db.prepare("INSERT INTO things (name) VALUES (?)").run("keep me");

    const applied = migrate(db, migrationsDir);

    expect(applied).toEqual([]);
    expect(appliedVersions()).toEqual(["0001"]);
    expect(db.prepare("SELECT name FROM things").all()).toEqual([{ name: "keep me" }]);
  });

  it("applies only the new migration when one is added later", () => {
    writeMigrations({ "0001_create_things.sql": "CREATE TABLE things (id INTEGER PRIMARY KEY);" });
    migrate(db, migrationsDir);
    writeMigrations({ "0002_create_others.sql": "CREATE TABLE others (id INTEGER PRIMARY KEY);" });

    expect(migrate(db, migrationsDir)).toEqual(["0002_create_others.sql"]);
    expect(appliedVersions()).toEqual(["0001", "0002"]);
  });
});

describe("migrate failures", () => {
  function tableNames(): string[] {
    return db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name != 'schema_migrations' ORDER BY name")
      .all()
      .map((row) => String(row.name));
  }

  it("rolls back a failing migration, names the file, and keeps earlier migrations", () => {
    writeMigrations({
      "0001_create_things.sql": "CREATE TABLE things (id INTEGER PRIMARY KEY);",
      "0002_broken.sql": "CREATE TABLE others (id INTEGER PRIMARY KEY);\nINSERT INTO missing_table VALUES (1);",
    });

    expect(() => migrate(db, migrationsDir)).toThrow(/0002_broken\.sql/);
    expect(appliedVersions()).toEqual(["0001"]);
    expect(tableNames()).toEqual(["things"]);
  });

  it("refuses an unapplied migration older than the newest applied one, and runs nothing", () => {
    writeMigrations({ "0002_create_things.sql": "CREATE TABLE things (id INTEGER PRIMARY KEY);" });
    migrate(db, migrationsDir);
    writeMigrations({
      "0001_late.sql": "CREATE TABLE late (id INTEGER PRIMARY KEY);",
      "0003_next.sql": "CREATE TABLE next (id INTEGER PRIMARY KEY);",
    });

    expect(() => migrate(db, migrationsDir)).toThrow(/0001_late\.sql/);
    expect(appliedVersions()).toEqual(["0002"]);
    expect(tableNames()).toEqual(["things"]);
  });

  it("rejects a .sql file that doesn't match the naming pattern", () => {
    writeMigrations({ "create_things.sql": "CREATE TABLE things (id INTEGER PRIMARY KEY);" });

    expect(() => migrate(db, migrationsDir)).toThrow(/create_things\.sql/);
    expect(tableNames()).toEqual([]);
  });

  it("rejects two files with the same version", () => {
    writeMigrations({
      "0001_a.sql": "CREATE TABLE a (id INTEGER PRIMARY KEY);",
      "0001_b.sql": "CREATE TABLE b (id INTEGER PRIMARY KEY);",
    });

    expect(() => migrate(db, migrationsDir)).toThrow(/0001_a\.sql.*0001_b\.sql/);
    expect(tableNames()).toEqual([]);
  });
});
