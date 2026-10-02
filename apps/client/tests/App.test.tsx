import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppAt } from "./support/render.tsx";
import { installFakeServer } from "./support/fakeServer.ts";

describe("App", () => {
  it("renders the Job Tracker heading and the board", async () => {
    installFakeServer();

    render(<AppAt />);

    expect(screen.getByRole("heading", { level: 1, name: "Job Tracker" })).toBeTruthy();
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
  });

  it("shows the board for the main address and for an address that isn't a view (spec 012, AC-1)", async () => {
    installFakeServer();

    render(<AppAt path="/nowhere" />);

    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
  });
});
