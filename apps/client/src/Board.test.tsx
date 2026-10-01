import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STAGE_LABELS, STAGES } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "./Board.tsx";
import { application, installFakeServer } from "./testing/fakeServer.ts";

beforeEach(() => {
  // Freeze "today" at Oct. 1, 2026, without freezing timers the UI relies on.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function column(stage: string) {
  return screen.getByRole("region", { name: stage });
}

describe("Board", () => {
  it("shows the eight stage columns in order, with counts and narrower closed columns (AC-1)", async () => {
    installFakeServer([
      application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" }),
      application({ companyName: "Globex", jobTitle: "Designer", stage: "applied" }),
      application({ companyName: "Initech", jobTitle: "Analyst", stage: "rejected" }),
    ]);

    render(<Board />);

    const regions = await screen.findAllByRole("region");
    expect(regions.map((region) => region.getAttribute("aria-label"))).toEqual(STAGES.map((stage) => STAGE_LABELS[stage]));
    expect(within(column("Applied")).getByText("2", { selector: ".column-count" })).toBeTruthy();
    expect(within(column("Wishlist")).getByText("0", { selector: ".column-count" })).toBeTruthy();
    const closed = regions.filter((region) => region.classList.contains("column--closed"));
    expect(closed.map((region) => region.getAttribute("aria-label"))).toEqual(["Accepted", "Rejected", "Withdrawn"]);
  });

  it("invites me to add an application when there are none (AC-2)", async () => {
    installFakeServer();

    render(<Board />);

    expect(await screen.findByText("No applications yet. Add your first one to get started.")).toBeTruthy();
    expect(screen.getAllByRole("region")).toHaveLength(8);
  });

  it("shows the company, title, next step, and due date on a card, and marks it overdue (AC-3)", async () => {
    installFakeServer([
      application({ companyName: "Acme", jobTitle: "Engineer", nextStep: "Send portfolio", nextStepDue: "2026-09-30" }),
      application({ companyName: "Globex", jobTitle: "Designer", nextStep: "Call back", nextStepDue: "2026-10-01" }),
    ]);

    render(<Board />);

    const overdue = await screen.findByRole("button", { name: /Acme/ });
    expect(overdue.textContent).toContain("Engineer");
    expect(overdue.textContent).toContain("Send portfolio");
    expect(overdue.textContent).toContain("Sep 30, 2026");
    expect(within(overdue).getByText("Overdue")).toBeTruthy();

    const dueToday = screen.getByRole("button", { name: /Globex/ });
    expect(dueToday.textContent).toContain("Oct 1, 2026");
    expect(within(dueToday).queryByText("Overdue")).toBeNull();
  });

  it("keeps the server's order within a column (AC-4)", async () => {
    installFakeServer([
      application({ companyName: "First", jobTitle: "A", nextStepDue: "2026-10-02" }),
      application({ companyName: "Second", jobTitle: "B" }),
    ]);

    render(<Board />);

    await screen.findByRole("button", { name: /First/ });
    const cards = within(column("Wishlist")).getAllByRole("button");
    expect(cards.map((card) => card.textContent)).toEqual([expect.stringContaining("First"), expect.stringContaining("Second")]);
  });

  it("shows an error with a way to try again when loading fails (AC-5)", async () => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer" })]);
    server.setOffline(true);

    render(<Board />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(screen.queryByRole("region")).toBeNull();

    server.setOffline(false);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("button", { name: /Acme/ })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
