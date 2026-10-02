import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";
import { ViewSwitch } from "../../src/components/ViewSwitch.tsx";
import { App } from "../../src/App.tsx";
import { installFakeServer } from "../support/fakeServer.ts";
import { AppAt } from "../support/render.tsx";

function Where() {
  const { pathname, search } = useLocation();
  return <output>{pathname + search}</output>;
}

function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        void navigate(-1);
      }}
    >
      Back
    </button>
  );
}

describe("ViewSwitch (spec 012, AC-1, AC-2, AC-15)", () => {
  it("marks the current view and keeps the query string on both links", () => {
    render(
      <MemoryRouter initialEntries={["/table?q=acme&stage=applied"]}>
        <ViewSwitch />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Table" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Kanban" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Kanban" }).getAttribute("href")).toBe("/?q=acme&stage=applied");
    expect(screen.getByRole("link", { name: "Table" }).getAttribute("href")).toBe("/table?q=acme&stage=applied");
  });

  it("starts on Kanban at the main address (AC-1)", async () => {
    installFakeServer();

    render(<AppAt />);

    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kanban" }).getAttribute("aria-current")).toBe("page");
  });

  it("switches views, and Back returns to the previous one (AC-2)", async () => {
    installFakeServer();
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
        <Where />
        <BackButton />
      </MemoryRouter>,
    );
    await screen.findByRole("region", { name: "Wishlist" });

    await user.click(screen.getByRole("link", { name: "Table" }));
    expect(screen.queryByRole("region", { name: "Wishlist" })).toBeNull();
    expect(screen.getByRole("link", { name: "Table" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("status").textContent).toBe("/table");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("/");

    await user.click(screen.getByRole("link", { name: "Table" }));
    await user.click(screen.getByRole("link", { name: "Kanban" }));
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Kanban" }).getAttribute("aria-current")).toBe("page");
  });
});
