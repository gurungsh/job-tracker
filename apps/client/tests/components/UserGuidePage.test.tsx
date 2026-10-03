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
    ["sidebar", "close an application", "Archived", "Add application"],
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

describe("the guide's back link (spec 020, AC-6)", () => {
  it.each([
    ["the table with its query", "/table?q=acme&sort=pay", "Back to table", "Acme"],
    ["the board", "/", "Back to board", "Wishlist"],
  ])("goes back to %s", async (_name, from, label) => {
    renderGuide({ pathname: "/guide", state: { from } });
    const back = await screen.findByRole("link", { name: label });

    expect(back.getAttribute("href")).toBe(from);
  });

  it("goes back to an application's page", async () => {
    renderGuide({ pathname: "/guide", state: { from: `/applications/${String(acme.id)}` } });

    const back = await screen.findByRole("link", { name: "Back to application" });
    expect(back.getAttribute("href")).toBe(`/applications/${String(acme.id)}`);
  });

  it("goes to the board when opened directly or after a reload (edge case)", async () => {
    renderGuide("/guide");

    const back = await screen.findByRole("link", { name: "Back to board" });
    expect(back.getAttribute("href")).toBe("/");
  });
});
