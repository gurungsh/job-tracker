import fs from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  );
}

const stages = () => screen.getByRole("navigation", { name: "Stages" });

describe("the app shell (spec 014)", () => {
  it.each([
    ["the board", "/"],
    ["the table", "/table"],
    ["an application's page", `/applications/${String(acme.id)}`],
    ["a page for an application that doesn't exist", "/applications/9999"],
  ])("has the sidebar and the header on %s (AC-1, AC-6, AC-12)", async (_name, path) => {
    installFakeServer([acme]);
    renderAt(path);

    expect(await within(stages()).findByText("All applications")).toBeTruthy();
    expect(within(stages()).getAllByRole("link")).toHaveLength(9);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(within(heading).getByRole("link", { name: "Job Tracker" }).getAttribute("href")).toBe("/");
    expect(screen.getByRole("button", { name: /theme/ })).toBeTruthy();
  });

  it("puts the sidebar beside the page's main area, not inside it", async () => {
    installFakeServer([acme]);
    renderAt("/");
    await screen.findByRole("button", { name: /Acme Corp/ });

    const main = screen.getByRole("main");
    expect(main.contains(stages())).toBe(false);
    expect(main.parentElement?.contains(stages())).toBe(true);
    expect(main.getAttribute("tabindex")).toBe("-1");
  });

  it("opens the board from the app name, from the table and from an application's page (AC-6)", async () => {
    installFakeServer([acme]);
    renderAt("/table?stage=applied");
    await screen.findByRole("table");

    await userEvent.click(screen.getByRole("link", { name: "Job Tracker" }));

    expect(screen.getByTestId("where").textContent).toBe("/");
    expect(await screen.findByRole("region", { name: "Applied" })).toBeTruthy();
  });

  it("shows the sidebar's entries while the applications are still loading, without counts (AC-7)", () => {
    installFakeServer([acme]);
    renderAt("/");

    expect(within(stages()).getAllByRole("link")).toHaveLength(9);
    expect(document.querySelectorAll(".sidebar-count")).toHaveLength(0);
  });

  it("keeps the page working beside the sidebar: the Add button, and a card opening its page (AC-12)", async () => {
    installFakeServer([acme]);
    renderAt("/");

    await userEvent.click(await screen.findByRole("button", { name: "Add application" }));
    expect(screen.getByRole("dialog", { name: "Add application" })).toBeTruthy();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("button", { name: /Acme Corp/ }));

    expect(await screen.findByRole("heading", { level: 2, name: "Engineer" })).toBeTruthy();
    expect(within(stages()).getAllByRole("link")).toHaveLength(9);
  });

  it("reaches the app name, the theme toggle, and every sidebar entry with Tab (AC-10)", async () => {
    installFakeServer([acme]);
    renderAt("/");
    await screen.findByRole("button", { name: /Acme Corp/ });

    const reached = new Set<Element>();
    for (let i = 0; i < 20; i += 1) {
      await userEvent.tab();
      reached.add(document.activeElement as Element);
    }

    expect(reached.has(screen.getByRole("link", { name: "Job Tracker" }))).toBe(true);
    expect(reached.has(screen.getByRole("button", { name: /theme/ }))).toBe(true);
    for (const link of within(stages()).getAllByRole("link")) expect(reached.has(link), link.textContent).toBe(true);
  });

  it("opens an entry's table with Enter (AC-10)", async () => {
    installFakeServer([acme]);
    renderAt("/");
    await screen.findByRole("button", { name: /Acme Corp/ });

    within(stages()).getByRole("link", { name: /^Applied/ }).focus();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied");
  });
});

describe("the app shell's layout (spec 014, AC-12)", () => {
  const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", "AppShell.css"), "utf8");

  it("is at least as tall as the window, and the body fills what is left, so the sidebar's column reaches the bottom", () => {
    expect(/\.app\s*{[^}]*min-height:\s*100vh/.test(css)).toBe(true);
    expect(/\.app > \.app-body\s*{[^}]*flex:\s*1/.test(css)).toBe(true);
  });
});

