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

  it("opens the guide from the board, and choosing the highlighted button again returns to it (spec 021, AC-8, AC-9)", async () => {
    renderAt("/");
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));

    expect(await screen.findByRole("heading", { level: 2, name: "User Guide" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /^Back to/ })).toBeNull();
    expect(screen.getByRole("link", { name: "User Guide" }).getAttribute("aria-current")).toBe("page");

    await userEvent.click(screen.getByRole("link", { name: "User Guide" }));
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 2, name: "User Guide" })).toBeNull();
    expect(screen.getByRole("link", { name: "User Guide" }).getAttribute("aria-current")).toBeNull();
  });

  it("returns to the table with its filters (AC-9)", async () => {
    renderAt("/table?q=acme");
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));
    expect(screen.getByRole("link", { name: "User Guide" }).getAttribute("href")).toBe("/table?q=acme");
  });

  it("returns to an application's page (AC-9)", async () => {
    renderAt(`/applications/${String(acme.id)}`);
    await userEvent.click(await screen.findByRole("link", { name: "User Guide" }));
    expect(screen.getByRole("link", { name: "User Guide" }).getAttribute("href")).toBe(`/applications/${String(acme.id)}`);
  });

  it("goes to the board when the guide was opened directly (AC-9)", async () => {
    renderAt("/guide");
    expect((await screen.findByRole("link", { name: "User Guide" })).getAttribute("href")).toBe("/");
  });

  it("is not marked as the current page elsewhere (AC-7)", async () => {
    renderAt("/");
    expect((await screen.findByRole("link", { name: "User Guide" })).getAttribute("aria-current")).toBeNull();
  });
});
