import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function column(stage: string) {
  return screen.getByRole("region", { name: stage });
}

function dataTransfer() {
  return { effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: vi.fn(), types: [] as string[] };
}

async function card(name: RegExp) {
  return screen.findByRole("button", { name: (accessible) => name.test(accessible) && !/^(Archive|Restore|Move):/.test(accessible) });
}

/** The column's children in order, as "slot" or the card's text. */
function layout(stage: string) {
  const list = column(stage).querySelector(".column-cards") as HTMLElement;
  return Array.from(list.children).map((child) => (child.classList.contains("card-placeholder") ? "slot" : child.textContent));
}

function slots() {
  return document.querySelectorAll(".card-placeholder");
}

const apps = () => [
  application({ companyName: "Early", jobTitle: "A", stage: "applied", nextStepDue: "2026-10-02" }),
  application({ companyName: "Late", jobTitle: "B", stage: "applied", nextStepDue: "2026-12-01" }),
  application({ companyName: "Moving", jobTitle: "C", stage: "wishlist", nextStepDue: "2026-11-01" }),
];

describe("Board drag preview (spec 019)", () => {
  it("shows a dashed slot where the card would land, and in an empty column (AC-2)", async () => {
    installFakeServer(apps());
    render(<AppAt />);

    fireEvent.dragStart(await card(/Moving/), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });

    expect(slots()).toHaveLength(1);
    expect(layout("Applied")).toEqual([expect.stringContaining("Early"), "slot", expect.stringContaining("Late")]);
    expect(slots()[0]?.getAttribute("aria-hidden")).toBe("true");

    fireEvent.dragOver(column("Screening"), { dataTransfer: dataTransfer() });
    expect(layout("Screening")).toEqual(["slot"]);
  });

  it("moves the slot between columns and clears it on leaving, never showing two (AC-3)", async () => {
    installFakeServer(apps());
    render(<AppAt />);

    fireEvent.dragStart(await card(/Moving/), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Screening"), { dataTransfer: dataTransfer() });
    expect(slots()).toHaveLength(1);
    expect(layout("Applied")).not.toContain("slot");

    fireEvent.dragLeave(column("Screening"), { relatedTarget: document.body });
    expect(slots()).toHaveLength(0);
  });

  it("shows no slot over the card's own column (AC-4)", async () => {
    const server = installFakeServer(apps());
    render(<AppAt />);

    fireEvent.dragStart(await card(/Moving/), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Wishlist"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Wishlist"), { dataTransfer: dataTransfer() });

    expect(slots()).toHaveLength(0);
    expect(server.requests.filter((request) => request.method === "PUT")).toHaveLength(0);
  });

  it("replaces the slot with the card at the same place on drop (AC-5)", async () => {
    const server = installFakeServer(apps());
    render(<AppAt />);

    fireEvent.dragStart(await card(/Moving/), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    expect(slots()).toHaveLength(0);
    expect(layout("Applied")).toEqual([expect.stringContaining("Early"), expect.stringContaining("Moving"), expect.stringContaining("Late")]);
    await waitFor(() => {
      expect(server.requests.filter((request) => request.method === "PUT")).toHaveLength(1);
    });
  });

  it("clears the slot on cancel, and saves nothing (AC-6)", async () => {
    const server = installFakeServer(apps());
    render(<AppAt />);

    const dragged = await card(/Moving/);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    expect(slots()).toHaveLength(1);
    fireEvent.dragEnd(dragged);

    expect(slots()).toHaveLength(0);
    expect(server.requests.filter((request) => request.method === "PUT")).toHaveLength(0);
  });

  it("leaves no slot after a failed save, and puts the card back (AC-7)", async () => {
    const server = installFakeServer(apps());
    render(<AppAt />);

    const dragged = await card(/Moving/);
    server.setOffline(true);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(slots()).toHaveLength(0);
    expect(within(column("Wishlist")).getByRole("button", { name: /^(?!Archive|Restore|Move).*Moving/ })).toBeTruthy();
  });
});
