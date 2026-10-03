import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

function renderAt(path: string, narrow = false) {
  installFakeServer([acme]);
  window.matchMedia = ((query: string) => ({
    matches: narrow && query.includes("max-width"),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("the User Guide link in the header (spec 020)", () => {
  it("shows the text, an icon, and sits before the theme switch (AC-1)", async () => {
    renderAt("/");
    const link = await screen.findByRole("link", { name: "User Guide" });

    expect(link.querySelector("svg")).not.toBeNull();
    expect(link.textContent).toBe("User Guide");
    const theme = screen.getByRole("button", { name: /theme/i });
    expect(link.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows only the icon on a narrow screen, and keeps its name (AC-1)", async () => {
    renderAt("/", true);
    const link = await screen.findByRole("link", { name: "User Guide" });

    expect(link.textContent).toBe("");
    expect(link.getAttribute("aria-label")).toBe("User Guide");
  });

  it("opens the guide from the board, and the back link returns to it (AC-2, AC-6)", async () => {
    renderAt("/");
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));

    expect(await screen.findByRole("heading", { level: 2, name: "User Guide" })).toBeTruthy();
    await userEvent.click(screen.getByRole("link", { name: "Back to board" }));
    expect(await screen.findByRole("link", { name: "User Guide" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "User Guide" })).toBeNull();
  });

  it("leads back to the table with its filters, and to an application's page (AC-6)", async () => {
    renderAt("/table?q=acme");
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));
    expect((await screen.findByRole("link", { name: "Back to table" })).getAttribute("href")).toBe("/table?q=acme");
  });

  it("leads back to an application's page", async () => {
    renderAt(`/applications/${String(acme.id)}`);
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));
    expect((await screen.findByRole("link", { name: "Back to application" })).getAttribute("href")).toBe(
      `/applications/${String(acme.id)}`,
    );
  });

  it("is the current page on the guide, and choosing it there keeps the way back (AC-7, AC-6)", async () => {
    renderAt("/table?q=acme");
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));
    const link = screen.getByRole("link", { name: "User Guide" });
    expect(link.getAttribute("aria-current")).toBe("page");

    await userEvent.click(link);
    expect(screen.getByRole("link", { name: "Back to table" }).getAttribute("href")).toBe("/table?q=acme");
  });

  it("is not marked as the current page elsewhere (AC-7)", async () => {
    renderAt("/");
    expect((await screen.findByRole("link", { name: "User Guide" })).getAttribute("aria-current")).toBeNull();
  });
});
