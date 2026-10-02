import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../src/App.tsx";
import { installFakeServer } from "./support/fakeServer.ts";

describe("App", () => {
  it("renders the Job Tracker heading and the board", async () => {
    installFakeServer();

    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: "Job Tracker" })).toBeTruthy();
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
  });
});
