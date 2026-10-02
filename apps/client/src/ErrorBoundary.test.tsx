import type { ClientErrorReport } from "@job-tracker/shared";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { resetErrorReporting } from "./errorReporting.ts";
import { installFakeServer } from "./testing/fakeServer.ts";

function Crash(): never {
  throw new Error("secret details");
}

beforeEach(() => {
  resetErrorReporting();
});

describe("ErrorBoundary", () => {
  it("shows its children when nothing crashes", () => {
    render(
      <ErrorBoundary>
        <p>The board</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("The board")).toBeDefined();
  });

  it("shows only a short message and Reload when rendering crashes, and reports the crash", async () => {
    const server = installFakeServer();
    const reload = vi.fn();
    // React logs caught render errors to the console.
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary reload={reload}>
        <Crash />
      </ErrorBoundary>,
    );

    const screenText = screen.getByRole("alert").textContent;
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeDefined();
    expect(screenText).toContain("The app hit an unexpected error.");
    expect(screenText).not.toContain("secret details");

    const reports = server.requests.filter((r) => r.path === "/api/client-errors").map((r) => r.body as ClientErrorReport);
    expect(reports).toEqual([
      expect.objectContaining({
        kind: "render",
        message: "secret details",
        stack: expect.stringContaining("Crash") as unknown,
      }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
});
