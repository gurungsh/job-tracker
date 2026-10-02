import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";
import { stubMatchMedia } from "../support/matchMedia.ts";

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

afterEach(() => {
  vi.unstubAllGlobals();
});

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

async function renderNarrow(narrow = true) {
  installFakeServer([acme]);
  const media = stubMatchMedia(narrow);
  render(
    <MemoryRouter initialEntries={["/"]}>
      <App />
      <Where />
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: /Acme Corp/ });
  return media;
}

const menuButton = () => screen.getByRole("button", { name: "Menu" });
const drawer = () => screen.queryByRole("dialog", { name: "Menu" });
const sidebarLinks = () => within(screen.getByRole("navigation", { name: "Stages" })).getAllByRole("link");

describe("the sidebar on a narrow screen (spec 014, AC-8, AC-9, AC-10)", () => {
  it("is out of the page until the menu button opens it, and the button says whether it is open (AC-8)", async () => {
    await renderNarrow();

    expect(screen.queryByRole("navigation", { name: "Stages" })).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(menuButton().getAttribute("aria-controls")).toBe("app-drawer");

    await userEvent.click(menuButton());

    expect(drawer()).toBeTruthy();
    expect(drawer()?.id).toBe("app-drawer");
    expect(menuButton().getAttribute("aria-expanded")).toBe("true");
    expect(sidebarLinks()).toHaveLength(9);
  });

  it("has no menu button on a wide screen, where the sidebar is always there (AC-8)", async () => {
    await renderNarrow(false);

    expect(screen.queryByRole("button", { name: "Menu" })).toBeNull();
    expect(screen.getByRole("navigation", { name: "Stages" })).toBeTruthy();
    expect(drawer()).toBeNull();
  });

  it("closes with the menu button, and focus stays on it (AC-9)", async () => {
    await renderNarrow();
    await userEvent.click(menuButton());

    await userEvent.click(menuButton());

    expect(drawer()).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menuButton());
  });

  it("closes with Escape, and focus goes back to the menu button (AC-9)", async () => {
    await renderNarrow();
    await userEvent.click(menuButton());

    await userEvent.keyboard("{Escape}");

    expect(drawer()).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it("closes when I click outside it, on the backdrop, and focus goes back to the menu button (AC-9)", async () => {
    await renderNarrow();
    await userEvent.click(menuButton());

    await userEvent.click(document.querySelector(".drawer-backdrop") as HTMLElement);

    expect(drawer()).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe("/");
    expect(document.activeElement).toBe(menuButton());
  });

  it("closes after I choose an entry, opens its table, and focus goes to the page (AC-9)", async () => {
    await renderNarrow();
    await userEvent.click(menuButton());

    await userEvent.click(within(drawer() as HTMLElement).getByRole("link", { name: /^Applied/ }));

    expect(drawer()).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied");
    expect(document.activeElement).toBe(screen.getByRole("main"));
    expect(await screen.findByRole("table")).toBeTruthy();
  });

  it("opens with Enter on the menu button, and starts with focus inside the drawer (AC-9, AC-10)", async () => {
    await renderNarrow();

    menuButton().focus();
    await userEvent.keyboard("{Enter}");

    expect(drawer()?.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(sidebarLinks()[0]);
  });

  it("keeps Tab inside the open drawer, and has no sidebar links to tab to when it is closed (AC-10)", async () => {
    await renderNarrow();
    expect(screen.queryAllByRole("link", { name: /Wishlist|Applied|All applications/ })).toHaveLength(0);
    await userEvent.click(menuButton());

    for (let i = 0; i < 25; i += 1) {
      await userEvent.tab();
      expect(drawer()?.contains(document.activeElement), `tab ${String(i)}`).toBe(true);
    }
    for (let i = 0; i < 25; i += 1) {
      await userEvent.tab({ shift: true });
      expect(drawer()?.contains(document.activeElement), `shift tab ${String(i)}`).toBe(true);
    }
  });

  it("reaches the app name, the menu button, and the theme toggle with Tab when the drawer is closed (AC-10)", async () => {
    await renderNarrow();

    const reached = new Set<Element>();
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      reached.add(document.activeElement as Element);
    }

    expect(reached.has(menuButton())).toBe(true);
    expect(reached.has(screen.getByRole("link", { name: "Job Tracker" }))).toBe(true);
    expect(reached.has(screen.getByRole("button", { name: /theme/ }))).toBe(true);
  });

  it("closes when the screen becomes wide, and comes back closed when it narrows again (edge case)", async () => {
    const media = await renderNarrow();
    await userEvent.click(menuButton());

    media.setNarrow(false);

    expect(screen.queryByRole("button", { name: "Menu" })).toBeNull();
    expect(drawer()).toBeNull();
    expect(screen.getByRole("navigation", { name: "Stages" })).toBeTruthy();

    media.setNarrow(true);

    expect(drawer()).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Stages" })).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByRole("button", { name: /Acme Corp/ })).toBeTruthy();
  });
});
