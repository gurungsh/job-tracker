import fs from "node:fs";
import path from "node:path";
import type { HealthResponse } from "@job-tracker/shared";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { migratedDatabase, startServer } from "./support/testing.ts";

const { version } = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "package.json"), "utf8")) as {
  version: string;
};
const latestMigration = fs
  .readdirSync(path.join(import.meta.dirname, "..", "migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .at(-1) ?? null;

async function health(baseUrl: string): Promise<{ status: number; body: HealthResponse }> {
  const response = await fetch(`${baseUrl}/api/health`);
  return { status: response.status, body: (await response.json()) as HealthResponse };
}

/** Counts are updated when each response closes, just after the client has it. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

describe("GET /api/health", () => {
  it("returns 200 with the status, version, uptime, database, and counts", async () => {
    const baseUrl = await startServer(createApp({ db: migratedDatabase() }));

    const { status, body } = await health(baseUrl);

    expect(status).toBe(200);
    expect(body).toEqual({
      status: "ok",
      version,
      uptimeSeconds: 0,
      database: { status: "ok", latestMigration },
      requests: 0,
      errors: 0,
    } satisfies HealthResponse);
  });

  it("returns 503 with the database status error when the database can't answer", async () => {
    const db = migratedDatabase();
    const baseUrl = await startServer(createApp({ db }));
    db.close();

    const { status, body } = await health(baseUrl);

    expect(status).toBe(503);
    expect(body).toEqual({
      status: "error",
      version,
      uptimeSeconds: 0,
      database: { status: "error", latestMigration: null },
      requests: 0,
      errors: 0,
    } satisfies HealthResponse);
  });

  it("counts API requests and 5xx errors, but not health checks", async () => {
    const db = migratedDatabase();
    const baseUrl = await startServer(createApp({ db }));

    await fetch(`${baseUrl}/api/applications`);
    await fetch(`${baseUrl}/api/nope`);
    await health(baseUrl);
    await health(baseUrl);
    db.close();
    await fetch(`${baseUrl}/api/applications`);
    await settle();

    const { body } = await health(baseUrl);
    expect(body).toMatchObject({ requests: 3, errors: 1 });
  });

  it("starts counting at zero for each new app, as after a restart", async () => {
    const db = migratedDatabase();
    const first = await startServer(createApp({ db }));
    await fetch(`${first}/api/applications`);
    await settle();
    expect((await health(first)).body.requests).toBe(1);

    const second = await startServer(createApp({ db }));

    expect((await health(second)).body).toMatchObject({ requests: 0, errors: 0 });
  });
});
