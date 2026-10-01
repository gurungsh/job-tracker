import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.ts";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

describe("loadConfig", () => {
  it("uses the default port and database path when no env vars are set", () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      databasePath: path.join(repoRoot, "data", "job-tracker.db"),
      clientDir: undefined,
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
});
