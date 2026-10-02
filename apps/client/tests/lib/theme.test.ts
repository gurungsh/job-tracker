import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_KEY, currentTheme, readStoredTheme, systemTheme, useTheme } from "../../src/lib/theme.ts";
import { stubDevice } from "../support/theme.ts";

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

afterEach(() => {
  vi.restoreAllMocks();
});

const showing = () => document.documentElement.getAttribute("data-theme");

describe("readStoredTheme and systemTheme", () => {
  it("read a valid saved choice and the device setting (AC-2, AC-4)", () => {
    stubDevice(true);
    expect(systemTheme()).toBe("dark");
    expect(readStoredTheme()).toBeNull();

    window.localStorage.setItem(THEME_KEY, "light");
    expect(readStoredTheme()).toBe("light");
  });

  it("treat a bad saved value, and blocked storage, as no choice (AC-7)", () => {
    window.localStorage.setItem(THEME_KEY, "purple");
    expect(readStoredTheme()).toBeNull();

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredTheme()).toBeNull();
  });

  it("say light when the browser has no matchMedia (AC-7)", () => {
    vi.stubGlobal("matchMedia", undefined);

    expect(systemTheme()).toBe("light");
  });
});

describe("currentTheme", () => {
  it("reads what the early script set, and falls back to the same rules (AC-2, AC-4)", () => {
    stubDevice(true);
    expect(currentTheme()).toBe("dark");

    window.localStorage.setItem(THEME_KEY, "light");
    expect(currentTheme()).toBe("light");

    document.documentElement.setAttribute("data-theme", "dark");
    expect(currentTheme()).toBe("dark");
  });
});

describe("useTheme", () => {
  it("starts with the theme showing, and flips it, saves it, and applies it on toggle (AC-3, AC-4)", () => {
    stubDevice(false);
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe("dark");
    expect(showing()).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");

    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("makes a choice opposite to what is showing when it was following the device (edge case)", () => {
    stubDevice(true);
    document.documentElement.setAttribute("data-theme", "dark");
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggle();
    });

    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("follows device changes until a choice is made, then stops (AC-6)", () => {
    const device = stubDevice(false);
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useTheme());

    act(() => {
      device.setDark(true);
    });
    expect(result.current.theme).toBe("dark");
    expect(showing()).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBeNull();

    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("light");
    act(() => {
      device.setDark(false);
      device.setDark(true);
    });
    expect(result.current.theme).toBe("light");
    expect(showing()).toBe("light");
  });

  it("ignores device changes when a choice was already saved (AC-6)", () => {
    const device = stubDevice(false);
    window.localStorage.setItem(THEME_KEY, "light");
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useTheme());

    act(() => {
      device.setDark(true);
    });

    expect(result.current.theme).toBe("light");
    expect(showing()).toBe("light");
  });

  it("still switches, for this visit, when storage is blocked (AC-7)", () => {
    const device = stubDevice(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggle();
    });
    expect(result.current.theme).toBe("dark");
    expect(showing()).toBe("dark");

    // The choice holds against device changes for the rest of the visit.
    act(() => {
      device.setDark(true);
      device.setDark(false);
    });
    expect(result.current.theme).toBe("dark");
  });

  it("stops listening to the device when it is unmounted", () => {
    const device = stubDevice(false);
    document.documentElement.setAttribute("data-theme", "light");
    const { unmount } = renderHook(() => useTheme());
    unmount();

    device.setDark(true);

    expect(showing()).toBe("light");
  });

  it("works when the browser has no matchMedia (AC-7)", () => {
    vi.stubGlobal("matchMedia", undefined);
    document.documentElement.setAttribute("data-theme", "light");
    const { result } = renderHook(() => useTheme());

    act(() => {
      result.current.toggle();
    });

    expect(result.current.theme).toBe("dark");
  });
});
