import type { AddressInfo } from "node:net";
import path from "node:path";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { openDatabase } from "./db.ts";
import { createLogger, type Logger } from "./logger.ts";
import { migrate } from "./migrate.ts";

const migrationsDir = path.join(import.meta.dirname, "..", "migrations");

// Until the config is loaded, errors go to the terminal only (spec 004, AC-5).
let logger: Logger = createLogger({ level: "error" });

function fail(message: string, error?: unknown): never {
  logger.error(message, error === undefined ? {} : { error });
  process.exit(1);
}

function prepare() {
  const config = loadConfig(process.env);
  logger = createLogger({ level: config.logLevel, logDir: config.logDir });
  logger.info("Server starting", {
    port: config.port,
    databasePath: config.databasePath,
    logDir: config.logDir,
    logLevel: config.logLevel,
  });
  const db = openDatabase(config.databasePath);
  for (const name of migrate(db, migrationsDir)) logger.info("Migration applied", { name });
  const app = createApp({ db, clientDir: config.clientDir, logger });
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
  logger.info(`Server listening on http://localhost:${String(port)}`, { port });
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info(`Received ${signal}, shutting down`, { signal });
  server.close();
  server.closeAllConnections();
  db.close();
  process.exit(0);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
