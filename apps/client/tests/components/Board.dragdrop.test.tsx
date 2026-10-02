import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// jsdom has no drag and drop, so this stands in for the browser's data transfer.
function dataTransfer() {
  return { effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: vi.fn(), types: [] as string[] };
}

async function card(name: RegExp) {
  return screen.findByRole("button", { name: (accessible) => name.test(accessible) && !/^(Archive|Restore):/.test(accessible) });
}

function updates(server: ReturnType<typeof installFakeServer>) {
  return server.requests.filter((request) => request.method === "PUT");
}

describe("Board drag and drop", () => {
  it("moves a card to another column in due-date order, and saves it (AC-1, AC-2, AC-6)", async () => {
    const server = installFakeServer([
      application({ companyName: "Early", jobTitle: "A", stage: "applied", nextStepDue: "2026-10-02" }),
      application({ companyName: "Late", jobTitle: "B", stage: "applied", nextStepDue: "2026-12-01" }),
      application({ companyName: "Moving", jobTitle: "C", stage: "wishlist", nextStepDue: "2026-11-01", nextStep: "Call" }),
    ]);
    render(<AppAt />);

    const dragged = await card(/Moving/);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    await waitFor(() => {
      expect(updates(server)).toHaveLength(1);
    });
    const cards = within(column("Applied")).getAllByRole("button", { name: (accessible) => !/^(Archive|Restore):/.test(accessible) });
    expect(cards.map((c) => c.textContent)).toEqual([
      expect.stringContaining("Early"),
      expect.stringContaining("Moving"),
      expect.stringContaining("Late"),
    ]);
    expect(within(column("Applied")).getByText("3", { selector: ".column-count" })).toBeTruthy();
    expect(within(column("Wishlist")).getByText("0", { selector: ".column-count" })).toBeTruthy();
    expect(updates(server)[0]?.path).toBe(`/api/applications/${String(server.applications[2]?.id)}`);
    expect(updates(server)[0]?.body).toMatchObject({ companyName: "Moving", jobTitle: "C", stage: "applied", nextStep: "Call", nextStepDue: "2026-11-01" });
    expect(server.applications[2]?.stage).toBe("applied");
    // The card sits in the new column, and its time in stage starts again (spec 011, AC-10).
    const moved = within(column("Applied")).getByRole("button", { name: /^(?!Archive|Restore).*Moving/ });
    expect(moved.querySelector(".card-age")?.textContent.trim()).toBe("Today");
    expect(moved.querySelector(".stage-badge")).toBeNull();
  });

  it.each(["Accepted", "Rejected", "Withdrawn"])("saves a drop into %s without asking (AC-6)", async (label) => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "offer" })]);
    render(<AppAt />);

    fireEvent.dragStart(await card(/Acme/), { dataTransfer: dataTransfer() });
    fireEvent.drop(column(label), { dataTransfer: dataTransfer() });

    await waitFor(() => {
      expect(updates(server)).toHaveLength(1);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(column(label)).getByRole("button", { name: /^(?!Archive|Restore).*Acme/ })).toBeTruthy();
  });

  it("highlights the column under the card and dims the card, then clears both (AC-3)", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "wishlist" })]);
    render(<AppAt />);

    const dragged = await card(/Acme/);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    expect(dragged.classList.contains("card--dragging")).toBe(true);

    fireEvent.dragOver(column("Wishlist"), { dataTransfer: dataTransfer() });
    expect(column("Wishlist").classList.contains("column--drop-target")).toBe(false);
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    expect(column("Applied").classList.contains("column--drop-target")).toBe(true);

    fireEvent.dragEnd(dragged);
    expect(column("Applied").classList.contains("column--drop-target")).toBe(false);
    expect(screen.getByRole("button", { name: /^(?!Archive|Restore).*Acme/ }).classList.contains("card--dragging")).toBe(false);
  });

  it("clears the highlight when the drop completes (AC-3)", async () => {
    installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer" })]);
    render(<AppAt />);

    fireEvent.dragStart(await card(/Acme/), { dataTransfer: dataTransfer() });
    fireEvent.dragOver(column("Applied"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    await waitFor(() => {
      expect(column("Applied").classList.contains("column--drop-target")).toBe(false);
    });
  });

  it("does nothing when dropped on its own column, or when nothing from the board is dragged (AC-4)", async () => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" })]);
    render(<AppAt />);

    const dragged = await card(/Acme/);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });
    fireEvent.dragEnd(dragged);
    // Something dragged in from outside the board.
    fireEvent.dragOver(column("Offer"), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Offer"), { dataTransfer: dataTransfer() });

    expect(updates(server)).toHaveLength(0);
    expect(column("Offer").classList.contains("column--drop-target")).toBe(false);
    expect(within(column("Applied")).getByRole("button", { name: /^(?!Archive|Restore).*Acme/ })).toBeTruthy();
  });

  it("puts the card back and explains when the save fails, until dismissed (AC-5)", async () => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "wishlist" })]);
    render(<AppAt />);

    const dragged = await card(/Acme/);
    server.setOffline(true);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't move Engineer to Applied");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(within(column("Wishlist")).getByRole("button", { name: /^(?!Archive|Restore).*Acme/ })).toBeTruthy();
    expect(within(column("Applied")).queryByRole("button")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("clears an old failure message when I move another card (AC-5)", async () => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "wishlist" })]);
    render(<AppAt />);

    const dragged = await card(/Acme/);
    server.setOffline(true);
    fireEvent.dragStart(dragged, { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });
    await screen.findByRole("alert");

    server.setOffline(false);
    fireEvent.dragStart(screen.getByRole("button", { name: /^(?!Archive|Restore).*Acme/ }), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
    expect(within(column("Applied")).getByRole("button", { name: /^(?!Archive|Restore).*Acme/ })).toBeTruthy();
  });

  it("can't drag a card again while it is being saved (edge case)", async () => {
    const server = installFakeServer([application({ companyName: "Acme", jobTitle: "Engineer", stage: "wishlist" })]);
    let finish: () => void = () => undefined;
    server.override((method) => {
      if (method !== "PUT") return undefined;
      // Hold the save until the test lets it finish.
      return new Promise<Response>((resolve) => {
        finish = () => {
          resolve(new Response(JSON.stringify({ ...server.applications[0], stage: "applied" }), { status: 200 }));
        };
      }) as unknown as Response;
    });
    render(<AppAt />);

    fireEvent.dragStart(await card(/Acme/), { dataTransfer: dataTransfer() });
    fireEvent.drop(column("Applied"), { dataTransfer: dataTransfer() });

    expect(screen.getByRole("button", { name: /^(?!Archive|Restore).*Acme/ }).getAttribute("draggable")).toBe("false");
    await act(async () => {
      finish();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^(?!Archive|Restore).*Acme/ }).getAttribute("draggable")).toBe("true");
    });
  });
});
