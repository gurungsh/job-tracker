import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import html from "../../index.html?raw";
import script from "../../public/theme-init.js?raw";
import { stubDevice } from "../support/theme.ts";

/** Runs the early script on its own, as the browser does before the app loads. */
function runScript(): string | null {
  document.documentElement.removeAttribute("data-theme");
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call -- runs the real file, as the browser does
  new Function(script)();
  return document.documentElement.getAttribute("data-theme");
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute("data-theme");
});

describe("theme-init.js", () => {
  it("follows the device when nothing is saved (AC-2)", () => {
    stubDevice(true);
    expect(runScript()).toBe("dark");

    stubDevice(false);
    expect(runScript()).toBe("light");
  });

  it("uses a saved choice over the device (AC-4)", () => {
    stubDevice(true);
    window.localStorage.setItem("job-tracker-theme", "light");
    expect(runScript()).toBe("light");

    stubDevice(false);
    window.localStorage.setItem("job-tracker-theme", "dark");
    expect(runScript()).toBe("dark");
  });

  it("ignores a saved value that isn't a theme (AC-7)", () => {
    stubDevice(true);
    window.localStorage.setItem("job-tracker-theme", "purple");

    expect(runScript()).toBe("dark");
  });

  it("follows the device when storage is blocked (AC-7)", () => {
    stubDevice(true);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(runScript()).toBe("dark");
  });

  it("falls back to light when the browser can't say what the device uses (AC-7)", () => {
    vi.stubGlobal("matchMedia", undefined);

    expect(runScript()).toBe("light");
  });

  it("is loaded by the page before the app's own script (AC-5)", () => {
    expect(html.indexOf('<script src="/theme-init.js"></script>')).toBeGreaterThan(-1);
    expect(html.indexOf("/theme-init.js")).toBeLessThan(html.indexOf("/src/main.tsx"));
    // A classic script with no defer or async, so it finishes before the first paint.
    expect(html).not.toMatch(/<script[^>]*theme-init[^>]*(defer|async|type="module")/);
  });
});
