import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { ErrorResponse, HealthResponse } from "@job-tracker/shared";
import express, { type Express } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, errorHandler } from "./app.ts";

let server: Server | undefined;

async function start(app: Express): Promise<string> {
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => {
      resolve(s);
    });
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(port)}`;
}

afterEach(async () => {
  await new Promise((resolve) => server?.close(resolve));
  server = undefined;
});

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const baseUrl = await start(createApp());

    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as HealthResponse;
    expect(body).toEqual({ status: "ok" } satisfies HealthResponse);
  });
});

describe("unknown API routes", () => {
  it("return 404 with an error body", async () => {
    const baseUrl = await start(createApp());

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
