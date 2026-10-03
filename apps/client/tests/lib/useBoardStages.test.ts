import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BOARD_STAGES_KEY, DEFAULT_BOARD_STAGES, readBoardStages, useBoardStages } from "../../src/lib/useBoardStages.ts";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readBoardStages", () => {
  it("defaults to every stage but the closed ones (AC-1)", () => {
    expect(readBoardStages()).toEqual(["wishlist", "applied", "screening", "interviewing", "offer"]);
  });

  it("reads a saved choice in board order, ignoring unknown stages (AC-5)", () => {
    window.localStorage.setItem(BOARD_STAGES_KEY, JSON.stringify(["rejected", "bogus", "applied"]));
    expect(readBoardStages()).toEqual(["applied", "rejected"]);
  });

  it.each(["not json", "{}", "[]", '["bogus"]', "42"])("falls back to the default for %s (AC-6)", (saved) => {
    window.localStorage.setItem(BOARD_STAGES_KEY, saved);
    expect(readBoardStages()).toEqual(DEFAULT_BOARD_STAGES);
  });

  it("falls back to the default when storage throws (AC-6)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readBoardStages()).toEqual(DEFAULT_BOARD_STAGES);
  });
});

describe("useBoardStages", () => {
  it("saves a choice in board order and reads it back on the next render (AC-5)", () => {
    const first = renderHook(() => useBoardStages());
    act(() => {
      first.result.current[1](["rejected", "applied"]);
    });
    expect(first.result.current[0]).toEqual(["applied", "rejected"]);
    expect(window.localStorage.getItem(BOARD_STAGES_KEY)).toBe('["applied","rejected"]');

    expect(renderHook(() => useBoardStages()).result.current[0]).toEqual(["applied", "rejected"]);
  });

  it("ignores a choice that leaves no stage (AC-4)", () => {
    const { result } = renderHook(() => useBoardStages());
    act(() => {
      result.current[1]([]);
    });
    expect(result.current[0]).toEqual(DEFAULT_BOARD_STAGES);
    expect(window.localStorage.getItem(BOARD_STAGES_KEY)).toBeNull();
  });

  it("keeps the choice until reload when storage is blocked (AC-6)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useBoardStages());
    act(() => {
      result.current[1](["offer"]);
    });
    expect(result.current[0]).toEqual(["offer"]);
  });
});
