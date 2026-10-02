import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

describe("loadConfig", () => {
  it("uses the default port and database path when no env vars are set", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      databasePath: path.join(repoRoot, "data", "job-tracker.db"),
      clientDir: undefined,
      logLevel: "debug",
      logDir: path.join(repoRoot, "data", "logs"),
    });
  });

  it("uses PORT when set", () => {
    expect(loadConfig({ PORT: "4123" }).port).toBe(4123);
  });

  it("uses DATABASE_PATH when set, resolved to an absolute path", () => {
    expect(loadConfig({ DATABASE_PATH: "/tmp/other.db" }).databasePath).toBe("/tmp/other.db");
    expect(loadConfig({ DATABASE_PATH: "rel/x.db" }).databasePath).toBe(path.resolve("rel/x.db"));
  });

  it("rejects a PORT that isn't a valid port number", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
    expect(() => loadConfig({ PORT: "70000" })).toThrow(/PORT/);
  });

  it("serves the built client only when NODE_ENV is production", () => {
    expect(loadConfig({ NODE_ENV: "production" }).clientDir).toBe(path.join(repoRoot, "apps", "client", "dist"));
    expect(loadConfig({ NODE_ENV: "development" }).clientDir).toBeUndefined();
  });

  it("logs at debug by default, and at info in production", () => {
    expect(loadConfig({}).logLevel).toBe("debug");
    expect(loadConfig({ NODE_ENV: "development" }).logLevel).toBe("debug");
    expect(loadConfig({ NODE_ENV: "production" }).logLevel).toBe("info");
    // An empty value counts as unset, as DATABASE_PATH does.
    expect(loadConfig({ NODE_ENV: "production", LOG_LEVEL: "" }).logLevel).toBe("info");
  });

  it("uses LOG_LEVEL when set, in any mode", () => {
    expect(loadConfig({ LOG_LEVEL: "warn" }).logLevel).toBe("warn");
    expect(loadConfig({ NODE_ENV: "production", LOG_LEVEL: "debug" }).logLevel).toBe("debug");
    expect(loadConfig({ NODE_ENV: "production", LOG_LEVEL: "error" }).logLevel).toBe("error");
  });

  it("rejects an unknown LOG_LEVEL, listing the valid levels", () => {
    expect(() => loadConfig({ LOG_LEVEL: "verbose" })).toThrow(
      'LOG_LEVEL must be one of debug, info, warn, error, got "verbose"',
    );
  });

  it("puts the log folder next to the database", () => {
    expect(loadConfig({ DATABASE_PATH: "/srv/app/data/job-tracker.db" }).logDir).toBe("/srv/app/data/logs");
  });
});
