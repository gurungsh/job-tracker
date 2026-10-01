import path from "node:path";
import { createApp } from "./app.ts";
import { type Config, loadConfig } from "./config.ts";
import { openDatabase } from "./db.ts";
import { migrate } from "./migrate.ts";

const migrationsDir = path.join(import.meta.dirname, "..", "migrations");

function fail(message: string, error?: unknown): never {
  console.error(message);
  if (error !== undefined) console.error(error);
  process.exit(1);
}

let config: Config;
try {
  config = loadConfig(process.env);
  const db = openDatabase(config.databasePath);
  for (const name of migrate(db, migrationsDir)) console.log(`Applied migration ${name}`);
} catch (error) {
  fail("Server failed to start.", error);
}

const { port, databasePath } = config;
createApp().listen(port, (error?: NodeJS.ErrnoException) => {
  if (error?.code === "EADDRINUSE") fail(`Port ${String(port)} is already in use. Stop the other process or set PORT.`);
  if (error) fail("Server failed to start.", error);
  console.log(`Server listening on http://localhost:${String(port)} (database: ${databasePath})`);
});
