// Helpers shared by the server's tests. Not used by the app itself.
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { LogLevel } from "@job-tracker/shared";
import type { Express } from "express";
import { afterEach } from "vitest";
import { createLogger, type LogEntry, type Logger } from "./logger.ts";
import { migrate } from "./migrate.ts";

const migrationsDir = path.join(import.meta.dirname, "..", "migrations");
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

/** Starts `app` on a free port, stopped automatically after each test. Returns its base URL. */
export async function startServer(app: Express): Promise<string> {
  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => {
      resolve(s);
    });
  });
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}`;
}

/** An in-memory database with every real migration applied. */
export function migratedDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  migrate(db, migrationsDir);
  return db;
}

/** A logger that keeps every entry in `entries` instead of writing it anywhere. */
export function collectingLogger(level: LogLevel = "debug"): { logger: Logger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const logger = createLogger({
    level,
    terminal: (_line, entry) => {
      entries.push(entry);
    },
  });
  return { logger, entries };
}
