import type { AddressInfo } from "node:net";
import path from "node:path";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db.ts";
import { migrate } from "./migrate.ts";

const migrationsDir = path.join(import.meta.dirname, "..", "migrations");

function fail(message: string, error?: unknown): never {
  console.error(message);
  if (error !== undefined) console.error(error);
  process.exit(1);
}

function prepare() {
  const config = loadConfig(process.env);
  const db = openDatabase(config.databasePath);
  for (const name of migrate(db, migrationsDir)) console.log(`Applied migration ${name}`);
  const app = createApp({ db, clientDir: config.clientDir });
  return { config, app, db };
}

let prepared: ReturnType<typeof prepare>;
try {
  prepared = prepare();
} catch (error) {
  fail("Server failed to start.", error);
}

const { config, app, db } = prepared;
const server = app.listen(config.port, (error?: NodeJS.ErrnoException) => {
  if (error?.code === "EADDRINUSE") fail(`Port ${String(config.port)} is already in use. Stop the other process or set PORT.`);
  if (error) fail("Server failed to start.", error);
  const { port } = server.address() as AddressInfo;
  console.log(`Server listening on http://localhost:${String(port)} (database: ${config.databasePath})`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}, shutting down.`);
  server.close();
  server.closeAllConnections();
  db.close();
  process.exit(0);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
