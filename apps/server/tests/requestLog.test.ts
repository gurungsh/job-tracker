import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import type { LogEntry } from "../src/logger.ts";
import { requestLog } from "../src/requestLog.ts";
import { collectingLogger, migratedDatabase, startServer } from "./support/testing.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Request lines are written when the response closes, just after the client has it. */
async function requestLines(entries: LogEntry[], count: number): Promise<LogEntry[]> {
  const deadline = Date.now() + 2000;
  for (;;) {
    const lines = entries.filter((entry) => "durationMs" in entry);
    if (lines.length >= count) return lines;
    if (Date.now() > deadline) throw new Error(`Expected ${String(count)} request lines, got ${String(lines.length)}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

const validInput = { companyName: "Acme", jobTitle: "Engineer" };

describe("request log", () => {
  it("logs one line per API request with its ID, method, path without the query, status, and duration", async () => {
    const { logger, entries } = collectingLogger("info");
    const baseUrl = await startServer(createApp({ db: migratedDatabase(), logger }));

    const response = await fetch(`${baseUrl}/api/applications?sort=new&secret=1`);

    const [line] = await requestLines(entries, 1);
    expect(response.status).toBe(200);
    expect(line).toMatchObject({
      level: "info",
      msg: expect.stringMatching(/^GET \/api\/applications 200 \d+ms$/) as unknown,
      method: "GET",
      path: "/api/applications",
      status: 200,
      durationMs: expect.any(Number) as unknown,
    });
    expect(line?.requestId).toMatch(UUID);
    expect(response.headers.get("x-request-id")).toBe(line?.requestId);
    expect(JSON.stringify(line)).not.toContain("secret");
  });

  it("logs 4xx at warn and 5xx at error", async () => {
    const { logger, entries } = collectingLogger("info");
    const db = migratedDatabase();
    const baseUrl = await startServer(createApp({ db, logger }));

    await fetch(`${baseUrl}/api/nope`);
    await fetch(`${baseUrl}/api/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    db.close();
    await fetch(`${baseUrl}/api/applications`);

    const lines = await requestLines(entries, 3);
    expect(lines.map((line) => [line.status, line.level])).toEqual([
      [404, "warn"],
      [400, "warn"],
      [500, "error"],
    ]);
  });

  it("gives every request a different ID", async () => {
    const baseUrl = await startServer(createApp({ db: migratedDatabase() }));

    const [a, b] = await Promise.all([fetch(`${baseUrl}/api/health`), fetch(`${baseUrl}/api/health`)]);

    expect(a.headers.get("x-request-id")).toMatch(UUID);
    expect(a.headers.get("x-request-id")).not.toBe(b.headers.get("x-request-id"));
  });

  it("includes the request body at debug level only", async () => {
    const send = async (level: "debug" | "info") => {
      const { logger, entries } = collectingLogger(level);
      const baseUrl = await startServer(createApp({ db: migratedDatabase(), logger }));
      await fetch(`${baseUrl}/api/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validInput),
      });
      const [line] = await requestLines(entries, 1);
      return line;
    };

    expect((await send("debug"))?.body).toEqual(validInput);
    const atInfo = await send("info");
    expect(atInfo?.status).toBe(201);
    expect(atInfo).not.toHaveProperty("body");
  });

  it("leaves the body out for requests without one", async () => {
    const { logger, entries } = collectingLogger("debug");
    const baseUrl = await startServer(createApp({ db: migratedDatabase(), logger }));

    await fetch(`${baseUrl}/api/applications`);

    const [line] = await requestLines(entries, 1);
    expect(line).not.toHaveProperty("body");
  });

  it("logs an aborted request, noting that the client disconnected", async () => {
    const { logger, entries } = collectingLogger("info");
    const app = express();
    app.use(requestLog(logger));
    app.get("/api/slow", () => {
      // Never responds.
    });
    const baseUrl = await startServer(app);
    const controller = new AbortController();

    const request = fetch(`${baseUrl}/api/slow`, { signal: controller.signal }).catch(() => undefined);
    setTimeout(() => {
      controller.abort();
    }, 50);
    await request;

    const [line] = await requestLines(entries, 1);
    expect(line).toMatchObject({ path: "/api/slow", aborted: true });
    expect(line?.msg).toMatch(/\(client disconnected\)$/);
  });

  describe("with a built client", () => {
    let clientDir: string;

    beforeEach(() => {
      clientDir = fs.mkdtempSync(path.join(os.tmpdir(), "job-tracker-client-"));
      fs.writeFileSync(path.join(clientDir, "index.html"), "<title>Job Tracker</title>");
      fs.writeFileSync(path.join(clientDir, "app.js"), "");
    });

    afterEach(() => {
      fs.rmSync(clientDir, { recursive: true, force: true });
    });

    it("logs the page, static files, and the health check at debug", async () => {
      const { logger, entries } = collectingLogger("debug");
      const baseUrl = await startServer(createApp({ db: migratedDatabase(), clientDir, logger }));

      for (const route of ["/", "/app.js", "/applications/5", "/api/health"]) await fetch(`${baseUrl}${route}`);

      const lines = await requestLines(entries, 4);
      expect(lines.map((line) => [line.path, line.level])).toEqual([
        ["/", "debug"],
        ["/app.js", "debug"],
        ["/applications/5", "debug"],
        ["/api/health", "debug"],
      ]);
    });

    it("hides them at info", async () => {
      const { logger, entries } = collectingLogger("info");
      const baseUrl = await startServer(createApp({ db: migratedDatabase(), clientDir, logger }));

      for (const route of ["/", "/app.js", "/api/health", "/api/applications"]) await fetch(`${baseUrl}${route}`);

      const lines = await requestLines(entries, 1);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(lines.map((line) => line.path)).toEqual(["/api/applications"]);
      expect(entries).toHaveLength(1);
    });
  });
});
