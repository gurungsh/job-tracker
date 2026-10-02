import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ErrorResponse, HealthResponse } from "@job-tracker/shared";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, errorHandler } from "./app.ts";
import type { Logger } from "./logger.ts";
import { requestLog } from "./requestLog.ts";
import { collectingLogger, migratedDatabase, startServer as start } from "./testing.ts";

const db = migratedDatabase();

describe("unknown API routes", () => {
  it("return 404 with an error body", async () => {
    const baseUrl = await start(createApp({ db }));

    const response = await fetch(`${baseUrl}/api/nope`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" } satisfies ErrorResponse);
  });
});

describe("errorHandler", () => {
  function appThatThrows(logger: Logger) {
    const app = express();
    app.use(requestLog(logger));
    app.use(express.json());
    app.post("/boom", (req) => {
      logger.info("Working on it", { got: (req.body as { name?: string }).name });
      throw new Error("secret details");
    });
    app.use(errorHandler(logger));
    return app;
  }

  it("returns 500 with a generic error and the request ID, and logs the error under that ID", async () => {
    const { logger, entries } = collectingLogger();
    const baseUrl = await start(appThatThrows(logger));

    const response = await fetch(`${baseUrl}/boom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "x" }),
    });

    const requestId = response.headers.get("x-request-id") ?? undefined;
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Internal server error", requestId } satisfies ErrorResponse);

    await vi.waitFor(() => {
      expect(entries).toHaveLength(3);
    });
    expect(entries.map((entry) => [entry.msg.replace(/\d+ms/, "Nms"), entry.requestId])).toEqual([
      ["Working on it", requestId],
      ["Unhandled error", requestId],
      ["POST /boom 500 Nms", requestId],
    ]);
    expect(entries[1]?.error).toMatchObject({ message: "secret details" });
  });

  it("answers an unreadable body with 400 and doesn't log an error", async () => {
    const { logger, entries } = collectingLogger();
    const baseUrl = await start(appThatThrows(logger));

    const response = await fetch(`${baseUrl}/boom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{nope",
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Request body is not valid JSON" } satisfies ErrorResponse);
    await vi.waitFor(() => {
      expect(entries).toHaveLength(1);
    });
    expect(entries[0]?.level).toBe("debug");
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
    expect(await health.json()).toMatchObject({ status: "ok" } satisfies Partial<HealthResponse>);

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
