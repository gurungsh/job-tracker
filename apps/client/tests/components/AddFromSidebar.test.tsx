import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { App } from "../../src/App.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

function renderAt(path = "/") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <Where />
    </MemoryRouter>,
  );
}

const acme = () => application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
const globex = () => application({ companyName: "Globex", jobTitle: "Designer", stage: "wishlist" });

const addButtons = () => screen.getAllByRole("button", { name: "Add application" });
const stages = () => within(screen.getByRole("navigation", { name: "Stages" }));
const count = (stage: string) =>
  stages().getByRole("link", { name: new RegExp(`^${stage}`) }).querySelector(".sidebar-count")?.textContent;

async function fillAndSave(company: string, title: string, stage?: string) {
  const dialog = await screen.findByRole("dialog", { name: "Add application" });
  await userEvent.type(within(dialog).getByLabelText("Company"), company);
  await userEvent.type(within(dialog).getByLabelText("Job title"), title);
  if (stage) await userEvent.selectOptions(within(dialog).getByLabelText("Stage"), stage);
  await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
}

describe("the one Add application button (spec 015, AC-1, AC-2)", () => {
  it.each([
    ["the board", "/"],
    ["the table", "/table"],
    ["an application's page", "/applications/1"],
    ["the page for an application that doesn't exist", "/applications/9999"],
  ])("is at the top of the sidebar on %s, and is the only one", async (_name, path) => {
    const app = acme();
    installFakeServer([app]);
    renderAt(path === "/applications/1" ? `/applications/${String(app.id)}` : path);
    await stages().findByText("All applications");

    expect(addButtons()).toHaveLength(1);
    const button = addButtons()[0] as HTMLElement;
    expect(button.closest(".sidebar")?.firstElementChild).toBe(button);
    expect(button.closest(".app-sidebar")).not.toBeNull();
    expect(screen.getByRole("main").contains(button)).toBe(false);
  });

  it("has left the board's toolbar", async () => {
    installFakeServer([acme()]);
    renderAt("/");
    await screen.findByRole("button", { name: /Acme Corp/ });

    expect(document.querySelector(".board-toolbar")).toBeNull();
    expect(within(screen.getByRole("main")).queryByRole("button", { name: "Add application" })).toBeNull();
  });
});

describe("opening the form from every screen (spec 015, AC-3)", () => {
  it.each([
    ["the board", () => "/"],
    ["the table", () => "/table?stage=applied"],
    ["an application's page", (id: number) => `/applications/${String(id)}`],
    ["the page for an application that doesn't exist", () => "/applications/9999"],
  ])("opens the Add application form, starting on Wishlist, from %s", async (_name, path) => {
    const app = acme();
    installFakeServer([app]);
    renderAt(path(app.id));
    await stages().findByText("All applications");

    await userEvent.click(addButtons()[0] as HTMLElement);

    const dialog = await screen.findByRole("dialog", { name: "Add application" });
    expect(within(dialog).getByLabelText<HTMLSelectElement>("Stage").value).toBe("wishlist");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("opens one form, not two, when the button is chosen twice quickly", async () => {
    installFakeServer([acme()]);
    renderAt("/");
    await stages().findByText("All applications");
    const button = addButtons()[0] as HTMLElement;

    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.dblClick(button).catch(() => undefined);

    expect(screen.getAllByRole("dialog", { name: "Add application" })).toHaveLength(1);
  });
});

describe("saving a new application and keeping my place (spec 015, AC-4)", () => {
  it("from the board: the card shows in its column and the counts rise at once", async () => {
    installFakeServer([acme(), globex()]);
    renderAt("/");
    await waitFor(() => {
      expect(count("Applied")).toBe("1");
    });

    await userEvent.click(addButtons()[0] as HTMLElement);
    await fillAndSave("Initech", "Analyst", "applied");

    expect(await within(screen.getByRole("region", { name: "Applied" })).findByRole("button", { name: /Initech/ })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(count("Applied")).toBe("2");
    expect(stages().getByRole("link", { name: /^All applications/ }).textContent).toContain("3");
    expect(screen.getByTestId("where").textContent).toBe("/");
  });

  it("from the table: keeps its search, filters, and sort, and shows the row only if it matches", async () => {
    const server = installFakeServer([acme(), globex()]);
    renderAt("/table?q=corp&stage=applied&sort=company&dir=desc");
    await screen.findByRole("table");

    await userEvent.click(addButtons()[0] as HTMLElement);
    await fillAndSave("Corp Labs", "Researcher", "applied");
    await waitFor(() => {
      expect(screen.getAllByRole("row")).toHaveLength(3);
    });
    expect(screen.getByTestId("where").textContent).toBe("/table?q=corp&stage=applied&sort=company&dir=desc");
    expect(screen.getByText("Corp Labs")).toBeTruthy();

    await userEvent.click(addButtons()[0] as HTMLElement);
    await fillAndSave("Elsewhere", "Gardener", "wishlist");
    await waitFor(() => {
      expect(count("Wishlist")).toBe("2");
    });
    expect(screen.queryByText("Elsewhere")).toBeNull();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByTestId("where").textContent).toBe("/table?q=corp&stage=applied&sort=company&dir=desc");
    expect(server.requests.filter((r) => r.method === "POST")).toHaveLength(2);
  });

  it("from an application's page: stays on it, and the counts rise", async () => {
    const app = acme();
    installFakeServer([app, globex()]);
    renderAt(`/applications/${String(app.id)}`);
    await waitFor(() => {
      expect(count("Offer")).toBe("0");
    });

    await userEvent.click(addButtons()[0] as HTMLElement);
    await fillAndSave("Initech", "Analyst", "offer");

    await waitFor(() => {
      expect(count("Offer")).toBe("1");
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByTestId("where").textContent).toBe(`/applications/${String(app.id)}`);
    expect(screen.getByRole("heading", { level: 2, name: "Engineer" })).toBeTruthy();
  });

  it("offers a new company as a suggestion the next time", async () => {
    installFakeServer([acme()], ["Acme Corp"]);
    renderAt("/");
    await waitFor(() => {
      expect(count("Applied")).toBe("1");
    });
    await userEvent.click(addButtons()[0] as HTMLElement);
    await fillAndSave("Initech", "Analyst");
    await screen.findByRole("button", { name: /Initech/ });

    await userEvent.click(addButtons()[0] as HTMLElement);

    const dialog = await screen.findByRole("dialog", { name: "Add application" });
    const list = document.getElementById(within(dialog).getByLabelText("Company").getAttribute("list") ?? "");
    expect([...(list?.querySelectorAll("option") ?? [])].map((o) => o.getAttribute("value"))).toEqual(["Acme Corp", "Initech"]);
  });
});

describe("closing the form (spec 015, AC-5)", () => {
  it("asks before throwing away what was typed, and focus goes back to the Add button", async () => {
    installFakeServer([acme()]);
    renderAt("/");
    await stages().findByText("All applications");
    const button = addButtons()[0] as HTMLElement;
    await userEvent.click(button);
    const dialog = await screen.findByRole("dialog", { name: "Add application" });
    await userEvent.type(within(dialog).getByLabelText("Company"), "Initech");

    await userEvent.keyboard("{Escape}");
    const confirm = screen.getByRole("alertdialog", { name: "Discard changes?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog", { name: "Add application" })).toBeTruthy();

    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("closes at once when nothing was typed, and focus goes back to the Add button", async () => {
    installFakeServer([acme()]);
    renderAt("/table");
    await screen.findByRole("table");
    const button = addButtons()[0] as HTMLElement;
    await userEvent.click(button);
    await screen.findByRole("dialog", { name: "Add application" });

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("sends focus back to the Add button after a save too", async () => {
    installFakeServer([acme()]);
    renderAt("/");
    await stages().findByText("All applications");
    const button = addButtons()[0] as HTMLElement;
    await userEvent.click(button);

    await fillAndSave("Initech", "Analyst");
    await screen.findByRole("button", { name: /Initech/ });

    expect(document.activeElement).toBe(button);
  });
});

describe("adding while the list is loading or has failed (spec 015, AC-9)", () => {
  it("opens a working form while the list is still loading, and the list loads again after saving", async () => {
    const server = installFakeServer([acme()]);
    renderAt("/");

    await userEvent.click(addButtons()[0] as HTMLElement);
    const dialog = await screen.findByRole("dialog", { name: "Add application" });
    const list = document.getElementById(within(dialog).getByLabelText("Company").getAttribute("list") ?? "");
    expect(list?.querySelectorAll("option") ?? []).toHaveLength(0);
    await userEvent.type(within(dialog).getByLabelText("Company"), "Initech");
    await userEvent.type(within(dialog).getByLabelText("Job title"), "Analyst");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("button", { name: /Initech/ })).toBeTruthy();
    await waitFor(() => {
      expect(count("Wishlist")).toBe("1");
    });
    expect(server.requests.some((r) => r.method === "POST")).toBe(true);
  });

  it("opens a working form when the list couldn't be loaded, and loads it again after saving", async () => {
    const server = installFakeServer([acme()]);
    let down = true;
    server.override((method, path) =>
      down && method === "GET" && path === "/api/applications"
        ? new Response(JSON.stringify({ error: "Service down" }), { status: 503 })
        : undefined,
    );
    renderAt("/");
    await screen.findByText(/Couldn't load your applications/);
    expect(document.querySelectorAll(".sidebar-count")).toHaveLength(0);

    await userEvent.click(addButtons()[0] as HTMLElement);
    down = false;
    await fillAndSave("Initech", "Analyst");

    expect(await screen.findByRole("button", { name: /Initech/ })).toBeTruthy();
    await waitFor(() => {
      expect(document.querySelectorAll(".sidebar-count")).toHaveLength(9);
    });
    expect(stages().getByRole("link", { name: /^All applications/ }).textContent).toContain("2");
  });
});
