import type { ClientErrorReport, ValidationErrorResponse } from "@job-tracker/shared";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import { collectingLogger, migratedDatabase, startServer } from "./testing.ts";

async function setup() {
  const { logger, entries } = collectingLogger("info");
  const baseUrl = await startServer(createApp({ db: migratedDatabase(), logger }));
  const send = (body: unknown) =>
    fetch(`${baseUrl}/api/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const browserLines = () => entries.filter((entry) => entry.source === "browser");
  return { entries, send, browserLines };
}

describe("POST /api/client-errors", () => {
  it("logs an uncaught error at error level, marked as from the browser, and returns 204", async () => {
    const { send, browserLines } = await setup();
    const report: ClientErrorReport = {
      kind: "uncaught",
      message: "Cannot read properties of undefined",
      stack: "TypeError: Cannot read properties of undefined\n    at Board.tsx:10:5",
      page: "http://localhost:5173/",
    };

    const response = await send(report);

    expect(response.status).toBe(204);
    expect(browserLines()).toEqual([
      expect.objectContaining({
        level: "error",
        msg: report.message,
        source: "browser",
        kind: "uncaught",
        page: report.page,
        stack: report.stack,
        requestId: response.headers.get("x-request-id"),
      }),
    ]);
  });

  it("logs a failed API call with its method, path, and status", async () => {
    const { send, browserLines } = await setup();
    const api = { method: "PUT", path: "/api/applications/3", status: 0 };

    const response = await send({ kind: "api", message: "Network error", page: "http://localhost:5173/", api });

    expect(response.status).toBe(204);
    expect(browserLines()[0]).toMatchObject({ kind: "api", api });
  });

  it("rejects an invalid report with 400 naming the fields, and logs no browser line", async () => {
    const { entries, send, browserLines } = await setup();

    const response = await send({ kind: "nope", message: "", page: "x".repeat(2001) });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid error report",
      fields: {
        kind: "Kind is not valid",
        message: "Message is required",
        page: "Page address must be 2,000 characters or fewer",
      },
    } satisfies ValidationErrorResponse);
    await vi.waitFor(() => {
      expect(entries).toHaveLength(1);
    });
    expect(entries[0]).toMatchObject({ path: "/api/client-errors", status: 400, level: "warn" });
    expect(browserLines()).toEqual([]);
  });

  it("rejects an empty body", async () => {
    const { send } = await setup();

    const response = await send(undefined);

    expect(response.status).toBe(400);
  });
});
