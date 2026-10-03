import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.tsx";
import { Card } from "../../src/components/Card.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";
import { AppAt } from "../support/render.tsx";

const archivedAt = "2026-10-02T09:00:00.000Z";

describe("Archive button on a card (spec 017, AC-2)", () => {
  function renderCard(onOpen = vi.fn(), onArchive = vi.fn()) {
    const app = application({ companyName: "Acme", jobTitle: "Engineer" });
    const { container } = render(
      <Card
        application={app}
        today="2026-10-13"
        onOpen={onOpen}
        onArchive={onArchive}
        onMove={() => undefined}
        dragging={false}
        draggable
        onDragStart={() => undefined}
        onDragEnd={() => undefined}
      />,
    );
    return { app, container, onOpen, onArchive };
  }

  it("is named for the application, archives it, and doesn't open it", async () => {
    const { app, onOpen, onArchive } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Archive: Engineer at Acme" }));

    expect(onArchive).toHaveBeenCalledWith(app);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("works with the keyboard", async () => {
    const { onArchive, onOpen } = renderCard();
    screen.getByRole("button", { name: "Archive: Engineer at Acme" }).focus();

    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onArchive).toHaveBeenCalledTimes(2);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("sits beside the draggable card, not inside it, so it can't start a drag", () => {
    const { container } = renderCard();

    const button = screen.getByRole("button", { name: /^Archive:/ });
    expect(container.querySelector(".card")?.contains(button)).toBe(false);
    expect(button.closest("[draggable='true']")).toBeNull();
    expect(button.getAttribute("data-tip")).toBe("Archive");
  });
});

describe("archiving from the board (spec 017, AC-2, AC-3)", () => {
  const sample = () => [
    application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" }),
    application({ companyName: "Globex", jobTitle: "Designer", stage: "applied" }),
  ];

  it("takes the card off the board at once, stays on the board, and saves it", async () => {
    const server = installFakeServer(sample());
    render(
      <MemoryRouter>
        <App />
        <Where />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Archive: Engineer at Acme" }));

    expect(screen.queryByRole("button", { name: /^(?!Archive|Restore|Move).*Acme/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^(?!Archive|Restore|Move).*Globex/ })).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/");
    await waitFor(() => {
      expect(server.requests.some((r) => r.method === "POST" && r.path.endsWith("/archive"))).toBe(true);
    });
    expect(server.applications[0]?.archivedAt).not.toBeNull();
    expect(within(screen.getByRole("region", { name: "Applied" })).getByText("1", { selector: ".column-count" })).toBeTruthy();
  });

  it("puts the card back with a message when it can't be saved", async () => {
    const server = installFakeServer(sample());
    render(<AppAt />);
    const archive = await screen.findByRole("button", { name: "Archive: Engineer at Acme" });
    server.setOffline(true);

    await userEvent.click(archive);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't archive Engineer");
    expect(screen.getByRole("button", { name: /^(?!Archive|Restore|Move).*Acme/ })).toBeTruthy();
  });
});

describe("archiving and restoring from the table (spec 017, AC-2, AC-5)", () => {
  it("archives a row without opening the page, and the row leaves the table", async () => {
    installFakeServer([
      application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" }),
      application({ companyName: "Globex", jobTitle: "Designer", stage: "applied" }),
    ]);
    render(
      <MemoryRouter initialEntries={["/table"]}>
        <App />
        <Where />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Archive: Engineer at Acme" }));

    expect(screen.queryByText("Engineer")).toBeNull();
    expect(screen.getByText("Designer")).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("/table");
  });

  it("shows Restore in the archived view, and a restored application leaves it and returns to the table and counts", async () => {
    const server = installFakeServer([
      application({ companyName: "Acme", jobTitle: "Engineer", stage: "applied" }),
      application({ companyName: "Wonka", jobTitle: "Chocolatier", stage: "rejected", archivedAt }),
    ]);
    render(
      <MemoryRouter initialEntries={["/table?archived=1"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /^Archive:/ })).toBeNull();

    await userEvent.click(await screen.findByRole("button", { name: "Restore: Chocolatier at Wonka" }));

    expect(await screen.findByText("Nothing is archived.")).toBeTruthy();
    expect(server.applications[1]?.archivedAt).toBeNull();
    const nav = within(screen.getByRole("navigation", { name: "Stages" }));
    expect(nav.getByRole("link", { name: /^All applications/ }).textContent).toBe("All applications2");
    expect(nav.getByRole("link", { name: /^Archived/ }).textContent).toBe("Archived0");
    await userEvent.click(nav.getByRole("link", { name: /^All applications/ }));
    expect(await screen.findByText("Chocolatier")).toBeTruthy();
  });
});

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}
