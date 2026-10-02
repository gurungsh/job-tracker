import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../src/App.tsx";
import { ApplicationsProvider, useApplicationsStore } from "../../src/lib/useApplications.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
const globex = application({ companyName: "Globex", jobTitle: "Designer", stage: "offer" });
const initech = application({ companyName: "Initech", jobTitle: "Analyst", stage: "wishlist", nextStepDue: "2026-01-01" });

function Probe() {
  const { state, replaceApplication, removeApplication, reload } = useApplicationsStore();
  return (
    <div>
      <p data-testid="list">
        {state.status === "ready" ? state.applications.map((a) => `${a.jobTitle}:${a.stage}`).join(",") : state.status}
      </p>
      <button
        type="button"
        onClick={() => {
          if (state.status === "ready") replaceApplication({ ...acme, stage: "rejected" });
        }}
      >
        Replace
      </button>
      <button
        type="button"
        onClick={() => {
          removeApplication(acme.id);
        }}
      >
        Remove
      </button>
      <button type="button" onClick={reload}>
        Reload
      </button>
    </div>
  );
}

describe("ApplicationsProvider (spec 014, AC-3)", () => {
  it("loads the list once for everything under it", async () => {
    const server = installFakeServer([acme, globex]);

    render(
      <ApplicationsProvider>
        <Probe />
        <Probe />
      </ApplicationsProvider>,
    );

    expect(screen.getAllByTestId("list")[0]?.textContent).toBe("loading");
    await waitFor(() => {
      expect(screen.getAllByTestId("list")[1]?.textContent).toBe("Engineer:applied,Designer:offer");
    });
    expect(server.requests.filter((r) => r.path === "/api/applications")).toHaveLength(1);
  });

  it("swaps and removes one application without loading again", async () => {
    const server = installFakeServer([acme, globex]);
    render(
      <ApplicationsProvider>
        <Probe />
      </ApplicationsProvider>,
    );
    await screen.findByText("Engineer:applied,Designer:offer");

    await userEvent.click(screen.getByRole("button", { name: "Replace" }));
    expect(screen.getByTestId("list").textContent).toBe("Designer:offer,Engineer:rejected"); // replacing sorts the list into board order, newest first

    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByTestId("list").textContent).toBe("Designer:offer");
    expect(server.requests.filter((r) => r.path === "/api/applications")).toHaveLength(1);
  });

  it("keeps the old list showing while it loads again", async () => {
    installFakeServer([acme]);
    render(
      <ApplicationsProvider>
        <Probe />
      </ApplicationsProvider>,
    );
    await screen.findByText("Engineer:applied");

    await userEvent.click(screen.getByRole("button", { name: "Reload" }));

    expect(screen.getByTestId("list").textContent).toBe("Engineer:applied");
  });

  it("says when it is used without a provider", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow("needs an ApplicationsProvider");

    error.mockRestore();
  });
});

describe("loading the list again when a view opens (spec 014, plan)", () => {
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

  it("loads once on landing on the board, and again when coming back to it", async () => {
    const server = installFakeServer([acme]);
    const loads = () => server.requests.filter((r) => r.method === "GET" && r.path === "/api/applications").length;
    render(
      <MemoryRouter initialEntries={["/", `/applications/${String(acme.id)}`]} initialIndex={1}>
        <App />
        <BackButton />
      </MemoryRouter>,
    );
    await screen.findByRole("heading", { level: 2, name: "Engineer" });
    await waitFor(() => {
      expect(loads()).toBe(1);
    });

    await userEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByRole("region", { name: "Applied" })).toBeTruthy();
    await waitFor(() => {
      expect(loads()).toBe(2);
    });
  });

  it("loads only once when the board is the first thing opened", async () => {
    const server = installFakeServer([acme]);
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole("button", { name: /^(?!Archive|Restore).*Acme Corp/ });

    expect(server.requests.filter((r) => r.method === "GET" && r.path === "/api/applications")).toHaveLength(1);
  });
});

describe("adding an application to the shared list (spec 015, AC-4, AC-9)", () => {
  function AddProbe({ added }: { added: ReturnType<typeof application> }) {
    const { state, addApplication } = useApplicationsStore();
    return (
      <div>
        <p data-testid="list">
          {state.status === "ready" ? state.applications.map((a) => `${a.jobTitle}:${a.stage}`).join(",") : state.status}
        </p>
        <p data-testid="companies">{state.status === "ready" ? state.companies.map((c) => c.name).join(",") : ""}</p>
        <button
          type="button"
          onClick={() => {
            addApplication(added);
          }}
        >
          Add
        </button>
      </div>
    );
  }

  it("puts it in the list in board order and makes no request", async () => {
    const server = installFakeServer([acme, globex]);
    render(
      <ApplicationsProvider>
        <AddProbe added={initech} />
      </ApplicationsProvider>,
    );
    await screen.findByText("Engineer:applied,Designer:offer");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    // Due dates come first, so the one with a due date leads, then newest first.
    expect(screen.getByTestId("list").textContent).toBe("Analyst:wishlist,Designer:offer,Engineer:applied");
    expect(server.requests.filter((r) => r.path === "/api/applications")).toHaveLength(1);
  });

  it("offers a new company as a suggestion, in name order, and a known company once", async () => {
    installFakeServer([acme, globex], ["Acme Corp", "Globex"]);
    const sameCompany = { ...application({ companyName: "Globex", jobTitle: "Second" }), companyId: 2 };
    const { unmount } = render(
      <ApplicationsProvider>
        <AddProbe added={{ ...initech, companyId: 9 }} />
      </ApplicationsProvider>,
    );
    await screen.findByText("Acme Corp,Globex");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("companies").textContent).toBe("Acme Corp,Globex,Initech");
    unmount();

    installFakeServer([acme, globex], ["Acme Corp", "Globex"]);
    render(
      <ApplicationsProvider>
        <AddProbe added={sameCompany} />
      </ApplicationsProvider>,
    );
    await screen.findByText("Acme Corp,Globex");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByTestId("companies").textContent).toBe("Acme Corp,Globex");
  });

  it("leaves a list that isn't ready alone", async () => {
    const server = installFakeServer([acme]);
    server.setOffline(true);
    render(
      <ApplicationsProvider>
        <AddProbe added={initech} />
      </ApplicationsProvider>,
    );
    await screen.findByText("error");

    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByTestId("list").textContent).toBe("error");
  });
});
