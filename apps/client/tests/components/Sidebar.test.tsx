import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../../src/components/Sidebar.tsx";
import { ApplicationsProvider } from "../../src/lib/useApplications.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const noop = () => undefined;

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderSidebar(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ApplicationsProvider>
        <Sidebar onAdd={noop} />
        <Where />
      </ApplicationsProvider>
    </MemoryRouter>,
  );
}

const SAMPLE = () => [
  application({ companyName: "Acme", jobTitle: "A", stage: "applied" }),
  application({ companyName: "Globex", jobTitle: "B", stage: "applied" }),
  application({ companyName: "Initech", jobTitle: "C", stage: "offer" }),
  application({ companyName: "Hooli", jobTitle: "D", stage: "rejected" }),
  application({ companyName: "Umbrella", jobTitle: "E", stage: "accepted" }),
];

const nav = () => within(screen.getByRole("navigation", { name: "Stages" }));
const entries = () => nav().getAllByRole("link");
const current = () => entries().filter((link) => link.getAttribute("aria-current") === "page").map((link) => link.textContent);

describe("Sidebar entries (spec 014, AC-1, AC-2)", () => {
  it("lists All applications, then the eight stages in board order, with their counts", async () => {
    installFakeServer(SAMPLE());
    renderSidebar();

    await nav().findByText("5");

    expect(entries().map((link) => link.textContent)).toEqual([
      "All applications5",
      "Wishlist0",
      "Applied2",
      "Screening0",
      "Interviewing0",
      "Offer1",
      "Accepted1",
      "Rejected1",
      "Withdrawn0",
    ]);
  });

  it("counts closed stages, and shows 0 everywhere with no applications", async () => {
    installFakeServer([]);
    renderSidebar();

    await nav().findAllByText("0");

    expect(entries().every((link) => link.querySelector(".sidebar-count")?.textContent === "0")).toBe(true);
  });

  it("gives each stage its icon and its stage color, and All applications an icon too", async () => {
    installFakeServer(SAMPLE());
    renderSidebar();
    await nav().findByText("5");

    for (const link of entries()) expect(link.querySelector("svg"), link.textContent).not.toBeNull();
    expect(entries().slice(1).map((link) => link.getAttribute("data-stage"))).toEqual([
      "wishlist", "applied", "screening", "interviewing", "offer", "accepted", "rejected", "withdrawn",
    ]);
    expect(entries()[0]?.hasAttribute("data-stage")).toBe(false);
  });

  it("writes a count in the thousands with a comma, in the same entry", async () => {
    installFakeServer(Array.from({ length: 1234 }, (_, i) => application({ companyName: `Co ${String(i)}`, jobTitle: "J", stage: "applied" })));
    renderSidebar();

    expect((await nav().findAllByText("1,234")).length).toBe(2);
  });

  it("links each entry to the table: All applications with nothing set, a stage with only that stage", async () => {
    installFakeServer(SAMPLE());
    renderSidebar();
    await nav().findByText("5");

    expect(entries().map((link) => link.getAttribute("href"))).toEqual([
      "/table",
      "/table?stage=wishlist",
      "/table?stage=applied",
      "/table?stage=screening",
      "/table?stage=interviewing",
      "/table?stage=offer",
      "/table?stage=accepted",
      "/table?stage=rejected",
      "/table?stage=withdrawn",
    ]);
  });
});

describe("Sidebar before the list is there (spec 014, AC-7)", () => {
  it("shows the entries without counts while loading, and the counts once loaded", async () => {
    installFakeServer(SAMPLE());
    renderSidebar();

    expect(entries()).toHaveLength(9);
    expect(document.querySelectorAll(".sidebar-count")).toHaveLength(0);

    await nav().findByText("5");
    expect(document.querySelectorAll(".sidebar-count")).toHaveLength(9);
  });

  it("shows the entries, working, without counts when the list can't be loaded", async () => {
    const server = installFakeServer(SAMPLE());
    server.setOffline(true);
    renderSidebar();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(entries()).toHaveLength(9);
    expect(document.querySelectorAll(".sidebar-count")).toHaveLength(0);
    await userEvent.click(nav().getByRole("link", { name: "Offer" }));
    expect(screen.getByTestId("where").textContent).toBe("/table?stage=offer");
  });
});

describe("Sidebar opening the table (spec 014, AC-4)", () => {
  it("opens only that stage from a table with a search, filters, and sort, clearing the rest", async () => {
    installFakeServer(SAMPLE());
    renderSidebar("/table?q=acme&type=contract&mode=remote&sort=pay&dir=desc&stage=offer");

    await userEvent.click(nav().getByRole("link", { name: /^Applied/ }));

    expect(screen.getByTestId("where").textContent).toBe("/table?stage=applied");
  });

  it("opens the table with nothing set from All applications", async () => {
    installFakeServer(SAMPLE());
    renderSidebar("/table?q=acme&stage=offer&sort=company&dir=asc");

    await userEvent.click(nav().getByRole("link", { name: /^All applications/ }));

    expect(screen.getByTestId("where").textContent).toBe("/table");
  });

  it("opens the table from the board and from an application's page", async () => {
    installFakeServer(SAMPLE());
    renderSidebar("/applications/101");

    await userEvent.click(nav().getByRole("link", { name: /^Screening/ }));

    expect(screen.getByTestId("where").textContent).toBe("/table?stage=screening");
  });
});

describe("Sidebar's selected entry (spec 014, AC-5)", () => {
  it("selects the stage when the table's stage filter has exactly that one, whatever else is set", () => {
    installFakeServer(SAMPLE());
    renderSidebar("/table?stage=applied&q=acme&mode=remote&sort=pay&dir=asc");

    expect(current()).toEqual(["Applied"]);
  });

  it("selects All applications when no stage is chosen, even with a search or other filters", () => {
    installFakeServer(SAMPLE());
    renderSidebar("/table?q=acme&mode=remote");

    expect(current()).toEqual(["All applications"]);
  });

  it("selects nothing when two or more stages are chosen", () => {
    installFakeServer(SAMPLE());
    renderSidebar("/table?stage=applied&stage=offer");

    expect(current()).toEqual([]);
  });

  it("selects nothing on the board or on an application's page", () => {
    installFakeServer(SAMPLE());
    const { unmount } = render(
      <MemoryRouter initialEntries={["/"]}>
        <ApplicationsProvider>
          <Sidebar onAdd={noop} />
        </ApplicationsProvider>
      </MemoryRouter>,
    );
    expect(current()).toEqual([]);
    unmount();

    renderSidebar("/applications/101?stage=applied");
    expect(current()).toEqual([]);
  });

  it("selects nothing for a stage the table doesn't know, and counts a repeated stage once", () => {
    installFakeServer(SAMPLE());
    const { unmount } = render(
      <MemoryRouter initialEntries={["/table?stage=nonsense"]}>
        <ApplicationsProvider>
          <Sidebar onAdd={noop} />
        </ApplicationsProvider>
      </MemoryRouter>,
    );
    expect(current()).toEqual(["All applications"]);
    unmount();

    renderSidebar("/table?stage=offer&stage=offer");
    expect(current()).toEqual(["Offer"]);
  });
});

describe("Sidebar's Add application button (spec 015, AC-1, AC-8, AC-10)", () => {
  function renderWithAdd(onAdd = vi.fn()) {
    installFakeServer(SAMPLE());
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ApplicationsProvider>
          <Sidebar onAdd={onAdd} />
        </ApplicationsProvider>
      </MemoryRouter>,
    );
    return onAdd;
  }
  const addButton = () => screen.getByRole("button", { name: "Add application" });

  it("is the first thing in the sidebar, above All applications, and outside the Stages navigation (AC-1)", () => {
    renderWithAdd();
    const sidebar = addButton().parentElement as HTMLElement;

    expect(sidebar.firstElementChild).toBe(addButton());
    expect(sidebar.children[1]).toBe(screen.getByRole("navigation", { name: "Stages" }));
    expect(screen.getByRole("navigation", { name: "Stages" }).contains(addButton())).toBe(false);
    expect(addButton().compareDocumentPosition(screen.getByRole("link", { name: /^All applications/ }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("has a plus icon, the primary button style, and a name that is only its label (AC-1, AC-10)", () => {
    renderWithAdd();

    expect(addButton().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(addButton().classList.contains("primary")).toBe(true);
    expect(addButton().textContent).toBe("Add application");
  });

  it("calls onAdd when I click it, or press Enter or Space on it (AC-8)", async () => {
    const onAdd = renderWithAdd();

    await userEvent.click(addButton());
    addButton().focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onAdd).toHaveBeenCalledTimes(3);
  });

  it("comes before the stage links in tab order (AC-8)", async () => {
    renderWithAdd();

    await userEvent.tab();
    expect(document.activeElement).toBe(addButton());
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: /^All applications/ }));
  });
});
