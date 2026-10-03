import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, type InitialEntry } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

function renderGuide(entry: InitialEntry = "/guide") {
  installFakeServer([acme]);
  render(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>,
  );
}

const contents = () => screen.getByRole("navigation", { name: "Contents" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the user guide page (spec 020)", () => {
  it("is shown at its own address with the heading, inside the shell (AC-2, AC-7)", async () => {
    renderGuide();

    expect(await screen.findByRole("heading", { level: 2, name: "User Guide" })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Stages" })).toBeTruthy();
  });

  it("has a contents entry for each of the seven sections, each pointing at a real section (AC-3, edge case)", async () => {
    renderGuide();
    await screen.findByRole("heading", { level: 2, name: "User Guide" });

    const links = within(contents()).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "The board",
      "The table",
      "The sidebar",
      "Adding and editing an application",
      "An application's page",
      "Archiving",
      "Light and dark themes",
    ]);
    for (const link of links) {
      const section = document.getElementById((link.getAttribute("href") ?? "").slice(1));
      expect(section, link.textContent).not.toBeNull();
      expect(within(section as HTMLElement).getByRole("heading", { level: 3, name: link.textContent })).toBeTruthy();
    }
  });

  it("scrolls to a section when its entry is chosen (AC-4)", async () => {
    renderGuide();
    await screen.findByRole("heading", { level: 2, name: "User Guide" });
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

    await userEvent.click(within(contents()).getByRole("link", { name: "The table" }));

    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("table"));
  });

  it.each([
    ["board", "dragging", "Move to", "stage filter"],
    ["table", "search", "sort", "filter"],
    ["sidebar", "close an application", "Archived", "Add Application"],
    ["adding", "Company", "job title", "website"],
    ["application", "Requirements", "timeline", "Contacts"],
    ["archiving", "Archive", "Restore", "Archived"],
    ["themes", "sun and moon", "dark", "device"],
  ])("describes what to do in the %s section (AC-5)", async (id, ...terms) => {
    renderGuide();
    await screen.findByRole("heading", { level: 2, name: "User Guide" });

    const text = (document.getElementById(id)?.textContent ?? "").toLowerCase();
    for (const term of terms) expect(text, term).toContain(term.toLowerCase());
  });

  it("lists the eight stages in order, and says which close an application (AC-5)", async () => {
    renderGuide();
    await screen.findByRole("heading", { level: 2, name: "User Guide" });

    expect(document.getElementById("sidebar")?.textContent).toContain(
      "Wishlist, Applied, Screening, Interviewing, Offer, Accepted, Rejected, Withdrawn",
    );
  });
});

describe("the guide's text and back link (spec 021, AC-8, AC-13)", () => {
  it("has no back link", async () => {
    renderGuide({ pathname: "/guide", state: { from: "/table" } });
    await screen.findByRole("heading", { level: 2, name: "User Guide" });

    expect(screen.queryByRole("link", { name: /^Back to/ })).toBeNull();
  });

  it("describes Select All, Deselect All, and the view buttons", async () => {
    renderGuide();
    await screen.findByRole("heading", { level: 2, name: "User Guide" });

    expect(screen.getAllByText(/Select All/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Kanban View and Table View/)).toBeTruthy();
  });
});
