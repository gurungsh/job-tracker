import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../src/App.tsx";
import { ThemeToggle } from "../../src/components/ThemeToggle.tsx";
import { THEME_KEY } from "../../src/lib/theme.ts";
import { installFakeServer } from "../support/fakeServer.ts";
import { stubDevice } from "../support/theme.ts";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  stubDevice(false);
});

describe("ThemeToggle", () => {
  it("is named for the theme it will switch to, and says so in text (AC-1)", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Dark theme" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(screen.getByRole("button", { name: "Light theme" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dark theme" })).toBeNull();
  });

  it("switches the whole page and remembers the choice (AC-3, AC-4)", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");

    await userEvent.click(screen.getByRole("button"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("starts in the theme the page is showing, even when the device differs (AC-2, AC-4)", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: "Light theme" })).toBeTruthy();
  });

  it("can be used with the keyboard (AC-1)", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(<ThemeToggle />);

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Dark theme" }));
    await userEvent.keyboard("{Enter}");

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("is in the header, after the app name, on every screen (AC-1)", async () => {
    installFakeServer([]);
    document.documentElement.setAttribute("data-theme", "light");
    render(<App />);

    const header = screen.getByRole("banner");
    const children = [...header.children].map((child) => child.textContent);
    expect(children[0]).toBe("Job Tracker");
    expect(children[1]).toContain("Dark theme");
    expect(await screen.findByRole("button", { name: "Add application" })).toBeTruthy();
  });
});
