import path from "node:path";
import { LOG_LEVELS, type LogLevel } from "@job-tracker/shared";

export type Config = {
  port: number;
  databasePath: string;
  /** The built client to serve, in production only. In development, Vite serves it. */
  clientDir: string | undefined;
  /** debug in development and info in production, unless LOG_LEVEL is set (spec 004, AC-3, AC-4). */
  logLevel: LogLevel;
  /** Daily log files go in a `logs` folder next to the database (spec 004, AC-10). */
  logDir: string;
};

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const defaultDatabasePath = path.join(repoRoot, "data", "job-tracker.db");
const builtClientDir = path.join(repoRoot, "apps", "client", "dist");

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const port = env.PORT === undefined ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer from 0 to 65535, got "${env.PORT ?? ""}"`);
  }

  const production = env.NODE_ENV === "production";
  const logLevel = env.LOG_LEVEL || (production ? "info" : "debug");
  if (!isLogLevel(logLevel)) {
    throw new Error(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}, got "${logLevel}"`);
  }

  const databasePath = env.DATABASE_PATH ? path.resolve(env.DATABASE_PATH) : defaultDatabasePath;
  return {
    port,
    databasePath,
    clientDir: production ? builtClientDir : undefined,
    logLevel,
    logDir: path.join(path.dirname(databasePath), "logs"),
  };
}

function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}
