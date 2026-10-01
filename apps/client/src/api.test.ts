import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "./api.ts";

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
