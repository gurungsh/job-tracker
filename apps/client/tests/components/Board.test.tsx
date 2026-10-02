import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STAGE_LABELS, STAGES } from "@job-tracker/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

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

    render(<AppAt />);

    const regions = await screen.findAllByRole("region");
    expect(regions.map((region) => region.getAttribute("aria-label"))).toEqual(STAGES.map((stage) => STAGE_LABELS[stage]));
    expect(within(column("Applied")).getByText("2", { selector: ".column-count" })).toBeTruthy();
    expect(within(column("Wishlist")).getByText("0", { selector: ".column-count" })).toBeTruthy();
    const closed = regions.filter((region) => region.classList.contains("column--closed"));
    expect(closed.map((region) => region.getAttribute("aria-label"))).toEqual(["Accepted", "Rejected", "Withdrawn"]);
  });

  it("invites me to add an application when there are none (AC-2)", async () => {
    installFakeServer();

    render(<AppAt />);

    const message = await screen.findByText("No applications yet. Use the Add application button in the sidebar to add your first one.");
    expect(message.textContent).not.toMatch(/board/i);
    // The button it points to is really in the sidebar (spec 015, AC-7).
    expect(screen.getByRole("button", { name: "Add application" }).closest(".app-sidebar")).not.toBeNull();
    expect(screen.getAllByRole("region")).toHaveLength(8);
  });

  it("shows the company, title, next step, and due date on a card, and marks it overdue (AC-3)", async () => {
    installFakeServer([
      application({ companyName: "Acme", jobTitle: "Engineer", nextStep: "Send portfolio", nextStepDue: "2026-09-30" }),
      application({ companyName: "Globex", jobTitle: "Designer", nextStep: "Call back", nextStepDue: "2026-10-01" }),
    ]);

    render(<AppAt />);

    const overdue = await screen.findByRole("button", { name: /^(?!Archive|Restore).*Acme/ });
    expect(overdue.textContent).toContain("Engineer");
    expect(overdue.textContent).toContain("Send portfolio");
    expect(overdue.textContent).toContain("Sep 30, 2026");
    expect(within(overdue).getByText("Overdue")).toBeTruthy();

    const dueToday = screen.getByRole("button", { name: /^(?!Archive|Restore).*Globex/ });
    expect(dueToday.textContent).toContain("Oct 1, 2026");
    expect(within(dueToday).queryByText("Overdue")).toBeNull();
  });

  it("keeps the server's order within a column (AC-4)", async () => {
    installFakeServer([
      application({ companyName: "First", jobTitle: "A", nextStepDue: "2026-10-02" }),
      application({ companyName: "Second", jobTitle: "B" }),
    ]);

    render(<AppAt />);

    await screen.findByRole("button", { name: /^(?!Archive|Restore).*First/ });
    const cards = within(column("Wishlist")).getAllByRole("button", { name: (accessible) => !/^(Archive|Restore):/.test(accessible) });
    expect(cards.map((card) => card.textContent)).toEqual([expect.stringContaining("First"), expect.stringContaining("Second")]);
  });

  it("shows an error with a way to try again when loading fails (AC-5)", async () => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer" })]);
    server.setOffline(true);

    render(<AppAt />);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(screen.queryByRole("region")).toBeNull();

    server.setOffline(false);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("button", { name: /^(?!Archive|Restore).*Acme/ })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows each column's stage icon, name, and count in the stage's own color (spec 011, AC-1)", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "offer" })]);

    render(<AppAt />);

    const regions = await screen.findAllByRole("region");
    expect(regions.map((region) => region.getAttribute("data-stage"))).toEqual([...STAGES]);
    const icons = regions.map((region) => region.querySelector(".column-header svg")?.getAttribute("class"));
    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(STAGES.length);
    const offer = column("Offer").querySelector(".column-header");
    expect(offer?.textContent.replace(/\s+/g, " ").trim()).toBe("Offer 1");
    expect(offer?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("doesn't repeat a column's stage on its cards (spec 011, AC-2)", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "screening" })]);

    render(<AppAt />);

    const card = await screen.findByRole("button", { name: /^(?!Archive|Restore).*Acme/ });
    expect(within(column("Screening")).getByRole("button", { name: /^(?!Archive|Restore).*Acme/ })).toBe(card);
    expect(card.querySelector(".stage-badge")).toBeNull();
    expect(within(card).queryByText("Screening")).toBeNull();
  });
});
