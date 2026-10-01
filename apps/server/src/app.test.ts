import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ErrorResponse, HealthResponse } from "@job-tracker/shared";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, errorHandler } from "./app.ts";
import { migratedDatabase, startServer as start } from "./testing.ts";

const db = migratedDatabase();

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const baseUrl = await start(createApp({ db }));

    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as HealthResponse;
    expect(body).toEqual({ status: "ok" } satisfies HealthResponse);
  });
});

describe("unknown API routes", () => {
  it("return 404 with an error body", async () => {
    const baseUrl = await start(createApp({ db }));

    const response = await fetch(`${baseUrl}/api/nope`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" } satisfies ErrorResponse);
  });
});

describe("errorHandler", () => {
  it("returns 500 with a generic error body and logs the error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const app = express();
    app.get("/boom", () => {
      throw new Error("secret details");
    });
    app.use(errorHandler);
    const baseUrl = await start(app);

    const response = await fetch(`${baseUrl}/boom`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error" } satisfies ErrorResponse);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ message: "secret details" }));
    log.mockRestore();
  });
});

describe("serving the built client", () => {
  let clientDir: string;

  beforeEach(() => {
    clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-client-"));
    fs.writeFileSync(path.join(clientDir, "index.html"), "<title>Job Tracker</title>");
    fs.mkdirSync(path.join(clientDir, "assets"));
    fs.writeFileSync(path.join(clientDir, "assets", "app.js"), "console.log('app');");
  });

  afterEach(() => {
    fs.rmSync(clientDir, { recursive: true, force: true });
  });

  it("serves index.html at the root and for client routes", async () => {
    const baseUrl = await start(createApp({ db, clientDir }));

    for (const route of ["/", "/applications/5"]) {
      const response = await fetch(`${baseUrl}${route}`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toMatch(/text\/html/);
      expect(await response.text()).toBe("<title>Job Tracker</title>");
    }
  });

  it("serves built asset files", async () => {
    const baseUrl = await start(createApp({ db, clientDir }));

    const response = await fetch(`${baseUrl}/assets/app.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/javascript/);
    expect(await response.text()).toBe("console.log('app');");
  });

  it("keeps the API routes and the JSON 404 for unknown API paths", async () => {
    const baseUrl = await start(createApp({ db, clientDir }));

    const health = await fetch(`${baseUrl}/api/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: "ok" } satisfies HealthResponse);

    const unknown = await fetch(`${baseUrl}/api/nope`);
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual({ error: "Not found" } satisfies ErrorResponse);
  });

  it("refuses to start when the build is missing", () => {
    fs.rmSync(path.join(clientDir, "index.html"));

    expect(() => createApp({ db, clientDir })).toThrow(
      `Client build not found at ${clientDir}. Run \`npm run build\` first.`,
    );
  });

  it("doesn't serve pages without a clientDir", async () => {
    const baseUrl = await start(createApp({ db }));

    const response = await fetch(`${baseUrl}/`);

    expect(response.status).toBe(404);
  });
});
