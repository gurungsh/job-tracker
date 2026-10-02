import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ApplicationDetailPage } from "../../src/components/ApplicationDetailPage.tsx";
import { ApplicationsProvider, useApplicationsStore } from "../../src/lib/useApplications.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

function Probe() {
  const { state } = useApplicationsStore();
  return (
    <p data-testid="list">
      {state.status === "ready" ? state.applications.map((a) => `${a.jobTitle}:${a.stage}`).join(",") : state.status}
    </p>
  );
}

/** The detail page with the shared list's contents written out beside it. */
function renderPage(id: number) {
  render(
    <MemoryRouter initialEntries={[`/applications/${String(id)}`]}>
      <ApplicationsProvider>
        <Probe />
        <Routes>
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="*" element={<p>elsewhere</p>} />
        </Routes>
      </ApplicationsProvider>
    </MemoryRouter>,
  );
}

const list = () => screen.getByTestId("list").textContent;

describe("the detail page keeps the shared list right (spec 014, AC-3)", () => {
  it("shows a new stage in the list as soon as it's chosen, and keeps it once saved", async () => {
    const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
    installFakeServer([acme]);
    renderPage(acme.id);
    await screen.findByRole("combobox", { name: "Stage" });
    expect(list()).toBe("Engineer:applied");

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "interviewing");

    expect(list()).toBe("Engineer:interviewing");
    await within(screen.getByRole("region", { name: "Timeline" })).findByText(/Interviewing/);
    expect(list()).toBe("Engineer:interviewing");
  });

  it("puts the saved stage back in the list when saving the stage fails", async () => {
    const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
    const server = installFakeServer([acme]);
    renderPage(acme.id);
    await screen.findByRole("combobox", { name: "Stage" });
    server.override((method) => (method === "PUT" ? new Response(JSON.stringify({ error: "Boom" }), { status: 400 }) : undefined));

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "offer");

    await screen.findByRole("alert");
    expect(list()).toBe("Engineer:applied");
  });

  it("shows an edit in the list", async () => {
    const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
    installFakeServer([acme]);
    renderPage(acme.id);
    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit application" });

    await userEvent.clear(within(dialog).getByLabelText("Job title"));
    await userEvent.type(within(dialog).getByLabelText("Job title"), "Staff Engineer");
    await userEvent.selectOptions(within(dialog).getByLabelText("Stage"), "offer");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await screen.findByRole("heading", { level: 2, name: "Staff Engineer" });
    expect(list()).toBe("Staff Engineer:offer");
  });

  it("takes a deleted application out of the list", async () => {
    const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
    const globex = application({ companyName: "Globex", jobTitle: "Designer", stage: "offer" });
    installFakeServer([acme, globex]);
    renderPage(acme.id);
    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("elsewhere")).toBeTruthy();
    expect(list()).toBe("Designer:offer");
  });

  it("takes an application out of the list when it turns out to be gone on a stage change", async () => {
    const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });
    const server = installFakeServer([acme]);
    renderPage(acme.id);
    await screen.findByRole("combobox", { name: "Stage" });
    server.applications.length = 0;

    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Stage" }), "offer");

    expect((await screen.findByRole("alert")).textContent).toBe("This application doesn't exist.");
    expect(list()).toBe("");
  });
});
