import type { ClientErrorReport } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeError, installErrorReporting, reportError, resetErrorReporting } from "./errorReporting.ts";

function stubFetch(result: Promise<Response> = Promise.resolve(new Response(null, { status: 204 }))) {
  const fetchMock = vi.fn((_path: string, _init?: RequestInit) => result);
  vi.stubGlobal("fetch", fetchMock);
  const reports = () => fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string) as ClientErrorReport);
  return { fetchMock, reports };
}

beforeEach(() => {
  resetErrorReporting();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reportError", () => {
  it("posts the report with the page address, kept alive across a reload", () => {
    const { fetchMock, reports } = stubFetch();

    reportError({ kind: "render", message: "Boom", stack: "Error: Boom" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/client-errors",
      expect.objectContaining({ method: "POST", keepalive: true, headers: { "Content-Type": "application/json" } }),
    );
    expect(reports()).toEqual([{ kind: "render", message: "Boom", stack: "Error: Boom", page: window.location.href }]);
  });

  it("trims fields to the server's limits and fills in an empty message", () => {
    const { reports } = stubFetch();

    reportError({ kind: "uncaught", message: "m".repeat(3000), stack: "s".repeat(30_000) });
    reportError({ kind: "uncaught", message: "" });

    const [long, empty] = reports();
    expect(long?.message).toHaveLength(2000);
    expect(long?.stack).toHaveLength(20_000);
    expect(empty?.message).toBe("Unknown error");
  });

  it("sends at most 10 reports a minute, and sends again once the minute has passed", () => {
    vi.useFakeTimers({ now: new Date("2026-10-01T12:00:00Z") });
    const { fetchMock } = stubFetch();

    for (let i = 0; i < 12; i++) reportError({ kind: "uncaught", message: `Error ${String(i)}` });
    expect(fetchMock).toHaveBeenCalledTimes(10);

    vi.advanceTimersByTime(59_000);
    reportError({ kind: "uncaught", message: "still limited" });
    expect(fetchMock).toHaveBeenCalledTimes(10);

    vi.advanceTimersByTime(1000);
    reportError({ kind: "uncaught", message: "allowed again" });
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  it("ignores a failed send without reporting it again", async () => {
    const { fetchMock } = stubFetch(Promise.reject(new TypeError("Failed to fetch")));
    const stop = installErrorReporting();

    reportError({ kind: "uncaught", message: "Boom" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    stop();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("installErrorReporting", () => {
  it("reports uncaught errors and unhandled rejections, until stopped", () => {
    const { reports } = stubFetch();
    const stop = installErrorReporting();

    const error = new Error("Uncaught boom");
    window.dispatchEvent(new ErrorEvent("error", { error, message: error.message }));
    const rejection = Object.assign(new Event("unhandledrejection"), { reason: "Rejected boom" });
    window.dispatchEvent(rejection);
    stop();
    window.dispatchEvent(new ErrorEvent("error", { message: "after stop" }));

    expect(reports()).toEqual([
      { kind: "uncaught", message: "Uncaught boom", stack: error.stack, page: window.location.href },
      { kind: "unhandledRejection", message: "Rejected boom", page: window.location.href },
    ]);
  });
});

describe("describeError", () => {
  it("takes the message and stack of an Error, and turns anything else into text", () => {
    const error = new Error("x");
    expect(describeError(error)).toEqual({ message: "x", stack: error.stack });
    expect(describeError("plain")).toEqual({ message: "plain" });
    expect(describeError(42)).toEqual({ message: "42" });
  });
});
