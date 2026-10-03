import { describe, expect, it } from "vitest";
import { originState, readGuideOrigin, readOrigin } from "../../src/lib/viewOrigin.ts";

describe("originState", () => {
  it("keeps the path and the search, so the table's filters come back (spec 013, AC-8)", () => {
    expect(originState({ pathname: "/table", search: "?stage=applied&sort=pay" })).toEqual({
      from: "/table?stage=applied&sort=pay",
    });
    expect(originState({ pathname: "/", search: "" })).toEqual({ from: "/" });
  });
});

describe("readOrigin", () => {
  it("goes back to the table with its search, labeled for the table (spec 013, AC-8, AC-9)", () => {
    expect(readOrigin({ from: "/table?q=acme&dir=desc&sort=pay" })).toEqual({
      path: "/table?q=acme&dir=desc&sort=pay",
      label: "Back to table",
    });
    expect(readOrigin({ from: "/table" })).toEqual({ path: "/table", label: "Back to table" });
  });

  it("goes back to the board, labeled for the board (spec 013, AC-9)", () => {
    expect(readOrigin({ from: "/" })).toEqual({ path: "/", label: "Back to board" });
  });

  it("goes to the board when the state is missing or isn't a view (spec 013, AC-9, AC-10)", () => {
    const board = { path: "/", label: "Back to board" };
    for (const state of [null, undefined, "table", {}, { from: 3 }, { from: "/guide" }, { from: "//evil.example" }, { from: "https://evil.example" }, { from: "/tables" }, { from: "/applications/4" }]) {
      expect(readOrigin(state), JSON.stringify(state)).toEqual(board);
    }
  });
});

describe("readGuideOrigin", () => {
  it("goes back to the table with its search, the board, or an application's page (spec 020, AC-6)", () => {
    expect(readGuideOrigin({ from: "/table?q=acme&sort=pay" })).toEqual({ path: "/table?q=acme&sort=pay", label: "Back to table" });
    expect(readGuideOrigin({ from: "/?x=1" })).toEqual({ path: "/?x=1", label: "Back to board" });
    expect(readGuideOrigin({ from: "/applications/12" })).toEqual({ path: "/applications/12", label: "Back to application" });
  });

  it("goes to the board when the state is missing or isn't one of those (spec 020, AC-6)", () => {
    const board = { path: "/", label: "Back to board" };
    for (const state of [null, undefined, {}, { from: 3 }, { from: "/guide" }, { from: "/applications/x" }, { from: "/applications/4/edit" }, { from: "//evil.example" }, { from: "https://evil.example" }]) {
      expect(readGuideOrigin(state), JSON.stringify(state)).toEqual(board);
    }
  });
});
