import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db.ts";

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-db-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("openDatabase", () => {
  it("creates missing parent folders and the database file", () => {
    const dbPath = path.join(makeTempDir(), "nested", "deeper", "test.db");

    const db = openDatabase(dbPath);
    db.close();

    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it("turns on foreign keys and WAL mode", () => {
    const db = openDatabase(path.join(makeTempDir(), "test.db"));

    expect(db.prepare("PRAGMA foreign_keys").get()).toEqual({ foreign_keys: 1 });
    expect(db.prepare("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
    db.close();
  });
});

describe("database files in git", () => {
  it("are ignored at the default location", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../..");
    const { databasePath } = loadConfig({});
    const files = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`];

    // git check-ignore exits non-zero (and execFileSync throws) if any path isn't ignored.
    const output = execFileSync("git", ["check-ignore", ...files], { cwd: repoRoot, encoding: "utf8" });

    expect(output.trim().split("\n")).toEqual(files);
  });
});
