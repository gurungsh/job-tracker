import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderAt(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  );
}

/** The counts as the sidebar shows them, by stage name, with the total under "All applications". */
function counts(): Record<string, string> {
  const nav = screen.getByRole("navigation", { name: "Stages" });
  return Object.fromEntries(
    within(nav)
      .getAllByRole("link")
      .map((link) => [link.querySelector(".sidebar-name")?.textContent ?? "", link.querySelector(".sidebar-count")?.textContent ?? ""]),
  );
}

async function waitForCounts(expected: Record<string, string>) {
  await waitFor(() => {
    expect(counts()).toMatchObject(expected);
  });
}

// jsdom has no drag and drop, so this stands in for the browser's data transfer.
const dataTransfer = () => ({ effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: vi.fn(), types: [] as string[] });

const wish = () => application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "wishlist" });
const other = () => application({ companyName: "Globex", jobTitle: "Designer", stage: "applied" });

describe("the sidebar's counts stay live (spec 014, AC-3)", () => {
  it("count a new application as soon as it is saved, from the board", async () => {
    installFakeServer([wish(), other()]);
    renderAt("/");
    await waitForCounts({ "All applications": "2", Wishlist: "1", Applied: "1" });

    await userEvent.click(await screen.findByRole("button", { name: "Add application" }));
    const dialog = await screen.findByRole("dialog", { name: "Add application" });
    await userEvent.type(within(dialog).getByLabelText("Company"), "Initech");
    await userEvent.type(within(dialog).getByLabelText("Job title"), "Analyst");
    await userEvent.selectOptions(within(dialog).getByLabelText("Stage"), "interviewing");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitForCounts({ "All applications": "3", Wishlist: "1", Applied: "1", Interviewing: "1" });
  });

  it("follow a card dragged to another column, at once", async () => {
    installFakeServer([wish(), other()]);
    renderAt("/");
    await waitForCounts({ Wishlist: "1", Applied: "1" });

    fireEvent.dragStart(await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ }), { dataTransfer: dataTransfer() });
    fireEvent.drop(screen.getByRole("region", { name: "Applied" }), { dataTransfer: dataTransfer() });

    await waitForCounts({ "All applications": "2", Wishlist: "0", Applied: "2" });
  });

  it("put the old counts back when a dragged card can't be saved", async () => {
    const server = installFakeServer([wish(), other()]);
    renderAt("/");
    await waitForCounts({ Wishlist: "1", Applied: "1" });
    server.override((method) => (method === "PUT" ? new Response(JSON.stringify({ error: "Boom" }), { status: 500 }) : undefined));

    fireEvent.dragStart(await screen.findByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ }), { dataTransfer: dataTransfer() });
    fireEvent.drop(screen.getByRole("region", { name: "Applied" }), { dataTransfer: dataTransfer() });

    await screen.findByText(/Couldn't move/);
    await waitForCounts({ Wishlist: "1", Applied: "1" });
  });

  it("follow a stage change made in the edit form on an application's page", async () => {
    const app = wish();
    installFakeServer([app, other()]);
    renderAt(`/applications/${String(app.id)}`);
    await waitForCounts({ Wishlist: "1", Applied: "1" });
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit application" });

    await userEvent.selectOptions(within(dialog).getByLabelText("Stage"), "offer");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitForCounts({ "All applications": "2", Wishlist: "0", Applied: "1", Offer: "1" });
  });

  it("follow the stage menu on an application's page, and go back if the change can't be saved", async () => {
    const app = wish();
    const server = installFakeServer([app, other()]);
    renderAt(`/applications/${String(app.id)}`);
    await waitForCounts({ Wishlist: "1", Applied: "1" });
    const menu = await screen.findByRole("combobox", { name: "Stage" });

    await userEvent.selectOptions(menu, "applied");
    await waitForCounts({ Wishlist: "0", Applied: "2" });

    server.override((method) => (method === "PUT" ? new Response(JSON.stringify({ error: "Boom" }), { status: 500 }) : undefined));
    await userEvent.selectOptions(menu, "rejected");

    await screen.findByRole("alert");
    await waitForCounts({ Applied: "2", Rejected: "0" });
  });

  it("drop an application deleted from its page, and are right on the board it goes back to", async () => {
    const app = wish();
    installFakeServer([app, other()]);
    renderAt(`/applications/${String(app.id)}`);
    await waitForCounts({ "All applications": "2", Wishlist: "1" });
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await screen.findByRole("region", { name: "Wishlist" });
    await waitForCounts({ "All applications": "1", Wishlist: "0", Applied: "1" });
    expect(screen.queryByRole("button", { name: /^(?!Archive|Restore|Move).*Acme Corp/ })).toBeNull();
  });

  it("are the same on every screen I move to afterward", async () => {
    const app = wish();
    installFakeServer([app, other()]);
    renderAt(`/applications/${String(app.id)}`);
    await waitForCounts({ Wishlist: "1", Applied: "1" });
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Stage" }), "applied");
    await waitForCounts({ Wishlist: "0", Applied: "2" });

    await userEvent.click(screen.getByRole("link", { name: "Back to board" }));
    await screen.findByRole("region", { name: "Applied" });
    expect(counts()).toMatchObject({ Wishlist: "0", Applied: "2" });

    await userEvent.click(screen.getByRole("link", { name: "Table" }));
    await screen.findByRole("table");
    expect(counts()).toMatchObject({ Wishlist: "0", Applied: "2" });
  });
});

describe("the sidebar from the real screens (spec 014, AC-4, AC-5)", () => {
  it("opens one stage from a filtered table, and then selects it", async () => {
    installFakeServer([wish(), other()]);
    renderAt("/table?q=acme&mode=remote&sort=company&dir=desc");
    await waitForCounts({ Wishlist: "1" });

    await userEvent.click(within(screen.getByRole("navigation", { name: "Stages" })).getByRole("link", { name: /^Applied/ }));

    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied");
    const selected = within(screen.getByRole("navigation", { name: "Stages" })).getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
    expect(selected.map((l) => l.querySelector(".sidebar-name")?.textContent)).toEqual(["Applied"]);
    expect(await screen.findByText("Designer")).toBeTruthy();
    expect(screen.queryByText("Engineer")).toBeNull();
  });

  it("keeps counts that ignore the table's filters, while the table narrows to its rows", async () => {
    installFakeServer([wish(), other()]);
    renderAt("/table?stage=applied");

    await waitForCounts({ "All applications": "2", Wishlist: "1", Applied: "1" });
    expect((await screen.findAllByRole("row")).length).toBe(2);
  });
});
