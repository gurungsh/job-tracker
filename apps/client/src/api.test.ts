import type { ClientErrorReport } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api.ts";
import { resetErrorReporting } from "./errorReporting.ts";
import { installFakeServer, json as fakeJson } from "./testing/fakeServer.ts";

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(() => (response instanceof Error ? Promise.reject(response) : Promise.resolve(response)));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("api", () => {
  it("sends JSON and the browser's time zone when saving", async () => {
    const fetchMock = stubFetch(json({ id: 1 }, 201));

    await api.createApplication({ companyName: "Acme", jobTitle: "Engineer" });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Time-Zone": Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      body: JSON.stringify({ companyName: "Acme", jobTitle: "Engineer" }),
    });
  });

  it("returns nothing for a 204 response", async () => {
    stubFetch(new Response(null, { status: 204 }));

    await expect(api.deleteApplication(3)).resolves.toBeUndefined();
  });

  it("throws an ApiError carrying the server's field messages (AC-21)", async () => {
    stubFetch(json({ error: "Invalid application", fields: { jobTitle: "Job title is required" } }, 400));

    const error = await api.createApplication({ companyName: "Acme", jobTitle: "" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ message: "Invalid application", status: 400, fields: { jobTitle: "Job title is required" } });
  });

  it("throws an ApiError when the server can't be reached (AC-5)", async () => {
    stubFetch(new TypeError("Failed to fetch"));

    await expect(api.listApplications()).rejects.toMatchObject({
      message: "Can't reach the server. Check that it's running and try again.",
      status: 0,
    });
  });

  it("throws an ApiError for a server error without a JSON body", async () => {
    stubFetch(new Response("Bad gateway", { status: 502 }));

    await expect(api.listCompanies()).rejects.toMatchObject({ message: "The server returned an error (502).", status: 502 });
  });
});

describe("reporting failed API calls (spec 004, AC-13)", () => {
  beforeEach(() => {
    resetErrorReporting();
  });

  function setup() {
    const server = installFakeServer();
    const reports = () =>
      server.requests.filter((r) => r.path === "/api/client-errors").map((r) => r.body as ClientErrorReport);
    return { server, reports };
  }

  it("reports a 5xx response, and the error message is unchanged", async () => {
    const { server, reports } = setup();
    server.override((_method, path) =>
      path === "/api/applications" ? new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }) : undefined,
    );

    await expect(api.listApplications()).rejects.toMatchObject({ message: "Internal server error", status: 500 });

    expect(reports()).toEqual([
      expect.objectContaining({
        kind: "api",
        message: "GET /api/applications failed with 500",
        api: { method: "GET", path: "/api/applications", status: 500 },
      }),
    ]);
  });

  it("reports a network error with status 0, and the error message is unchanged", async () => {
    const fetchMock = vi.fn((path: string, _init?: RequestInit) =>
      path === "/api/client-errors" ? fakeJson(null, 204) : Promise.reject(new TypeError("Failed to fetch")),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.deleteApplication(3)).rejects.toMatchObject({
      message: "Can't reach the server. Check that it's running and try again.",
      status: 0,
    });

    const reportCall = fetchMock.mock.calls.find(([path]) => path === "/api/client-errors");
    expect(JSON.parse(reportCall?.[1]?.body as string)).toMatchObject({
      kind: "api",
      message: "DELETE /api/applications/3 failed: network error",
      api: { method: "DELETE", path: "/api/applications/3", status: 0 },
    });
  });

  it("doesn't report a 4xx response", async () => {
    const { server, reports } = setup();
    server.override((method) =>
      method === "POST" ? new Response(JSON.stringify({ error: "Invalid application", fields: {} }), { status: 400 }) : undefined,
    );

    await expect(api.updateApplication(999, { companyName: "Acme", jobTitle: "Engineer" })).rejects.toMatchObject({
      status: 404,
    });
    await expect(api.createApplication({ companyName: "Acme", jobTitle: "Engineer" })).rejects.toMatchObject({
      status: 400,
    });

    expect(reports()).toEqual([]);
  });
});
