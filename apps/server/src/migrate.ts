import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

const MIGRATION_FILE = /^(\d{4})_[a-z0-9_]+\.sql$/;

type Migration = { version: string; name: string };

/** Applies pending migrations from `dir` in version order. Returns the names of the files applied. */
export function migrate(db: DatabaseSync, dir: string): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    db
      .prepare("SELECT version FROM schema_migrations")
      .all()
      .map((row) => String(row.version)),
  );
  const pending = readMigrations(dir).filter((m) => !applied.has(m.version));
  const newestApplied = [...applied].sort().at(-1);
  const outOfOrder = pending.find((m) => newestApplied !== undefined && m.version < newestApplied);
  if (outOfOrder) {
    throw new Error(
      `Migration ${outOfOrder.name} is older than the newest applied migration (${newestApplied ?? ""}). Give it a higher version.`,
    );
  }

  const record = db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)");

  for (const migration of pending) {
    const sql = fs.readFileSync(path.join(dir, migration.name), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      record.run(migration.version, migration.name, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw new Error(`Migration ${migration.name} failed and was rolled back`, { cause: error });
    }
  }

  return pending.map((m) => m.name);
}

function readMigrations(dir: string): Migration[] {
  const migrations = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => {
      const version = MIGRATION_FILE.exec(name)?.[1];
      if (version === undefined) {
        throw new Error(`Invalid migration file name: ${name}. Expected NNNN_snake_case.sql`);
      }
      return { version, name };
    })
    .sort((a, b) => a.version.localeCompare(b.version) || a.name.localeCompare(b.name));

  for (let i = 1; i < migrations.length; i++) {
    const [previous, current] = [migrations[i - 1], migrations[i]];
    if (previous && current && previous.version === current.version) {
      throw new Error(`Migrations ${previous.name} and ${current.name} share version ${current.version}`);
    }
  }
  return migrations;
}
