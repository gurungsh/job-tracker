import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NARROW_QUERY, useMediaQuery } from "../../src/lib/useMediaQuery.ts";
import { stubMatchMedia } from "../support/matchMedia.ts";

function Probe() {
  return <p>{useMediaQuery(NARROW_QUERY) ? "narrow" : "wide"}</p>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMediaQuery (spec 014, AC-8)", () => {
  it("reads as wide where matchMedia doesn't exist", () => {
    render(<Probe />);

    expect(screen.getByText("wide")).toBeTruthy();
  });

  it("reads the query, asking about the narrow width", () => {
    const { matchMedia } = stubMatchMedia(true);
    render(<Probe />);

    expect(screen.getByText("narrow")).toBeTruthy();
    expect(matchMedia).toHaveBeenCalledWith("(max-width: 52rem)");
  });

  it("follows the window as it is resized across the width", () => {
    const media = stubMatchMedia(false);
    render(<Probe />);
    expect(screen.getByText("wide")).toBeTruthy();

    media.setNarrow(true);
    expect(screen.getByText("narrow")).toBeTruthy();

    media.setNarrow(false);
    expect(screen.getByText("wide")).toBeTruthy();
  });
});
