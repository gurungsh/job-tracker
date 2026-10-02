import { describe, expect, it } from "vitest";
import { type TableQuery, parseTableQuery, toSearchParams } from "../../src/lib/tableQuery.ts";

const empty: TableQuery = { search: "", stages: [], workModes: [], employmentTypes: [], sort: null };

describe("parseTableQuery (spec 012, AC-13, AC-14)", () => {
  it("is empty for an address with no parameters", () => {
    expect(parseTableQuery(new URLSearchParams())).toEqual(empty);
  });

  it("reads the search, filters, and sort", () => {
    const params = new URLSearchParams("q=acme&stage=applied&stage=offer&mode=remote&type=contract&sort=pay&dir=desc");
    expect(parseTableQuery(params)).toEqual({
      search: "acme",
      stages: ["applied", "offer"],
      workModes: ["remote"],
      employmentTypes: ["contract"],
      sort: { column: "pay", direction: "desc" },
    });
  });

  it("keeps stages in board order and counts a repeated value once", () => {
    const params = new URLSearchParams("stage=offer&stage=applied&stage=offer");
    expect(parseTableQuery(params).stages).toEqual(["applied", "offer"]);
  });

  it("drops values that are not valid and keeps the rest (AC-14)", () => {
    const params = new URLSearchParams("stage=bogus&stage=applied&mode=moon&type=&sort=nope&dir=up&q=x");
    expect(parseTableQuery(params)).toEqual({ ...empty, search: "x", stages: ["applied"] });
  });

  it("sorts ascending when the direction is missing or not valid", () => {
    expect(parseTableQuery(new URLSearchParams("sort=company")).sort).toEqual({ column: "company", direction: "asc" });
    expect(parseTableQuery(new URLSearchParams("sort=company&dir=sideways")).sort).toEqual({
      column: "company",
      direction: "asc",
    });
  });

  it("ignores a direction without a sort column", () => {
    expect(parseTableQuery(new URLSearchParams("dir=desc")).sort).toBeNull();
  });
});

describe("toSearchParams", () => {
  it("writes nothing for an empty query", () => {
    expect(toSearchParams(empty).toString()).toBe("");
  });

  it("writes only what is set", () => {
    const query: TableQuery = {
      search: "C++ dev",
      stages: ["applied", "offer"],
      workModes: [],
      employmentTypes: ["contract"],
      sort: { column: "age", direction: "asc" },
    };
    const params = toSearchParams(query);
    expect(params.get("q")).toBe("C++ dev");
    expect(params.getAll("stage")).toEqual(["applied", "offer"]);
    expect(params.has("mode")).toBe(false);
    expect(params.getAll("type")).toEqual(["contract"]);
    expect(params.get("sort")).toBe("age");
    expect(params.get("dir")).toBe("asc");
  });

  it("round-trips through parseTableQuery", () => {
    const query: TableQuery = {
      search: "  spaced ",
      stages: ["screening"],
      workModes: ["hybrid", "remote"],
      employmentTypes: ["full_time"],
      sort: { column: "next", direction: "desc" },
    };
    expect(parseTableQuery(new URLSearchParams(toSearchParams(query).toString()))).toEqual(query);
  });
});
