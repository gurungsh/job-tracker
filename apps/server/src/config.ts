import path from "node:path";

export type Config = {
  port: number;
  databasePath: string;
  /** The built client to serve, in production only. In development, Vite serves it. */
  clientDir: string | undefined;
};

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const defaultDatabasePath = path.join(repoRoot, "data", "job-tracker.db");
const builtClientDir = path.join(repoRoot, "apps", "client", "dist");

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const port = env.PORT === undefined ? 3000 : Number(env.PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT must be an integer from 0 to 65535, got "${env.PORT ?? ""}"`);
  }

  return {
    port,
    databasePath: env.DATABASE_PATH ? path.resolve(env.DATABASE_PATH) : defaultDatabasePath,
    clientDir: env.NODE_ENV === "production" ? builtClientDir : undefined,
  };
}
