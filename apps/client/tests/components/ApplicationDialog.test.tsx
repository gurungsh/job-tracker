import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationDialog } from "../../src/components/ApplicationDialog.tsx";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

async function openAddDialog() {
  await userEvent.click(await screen.findByRole("button", { name: "Add application" }));
  return screen.getByRole("dialog", { name: "Add application" });
}

describe("adding an application", () => {
  it("adds a card to Wishlist from just a company and a job title (AC-6)", async () => {
    const server = installFakeServer();
    render(<AppAt />);
    const panel = await openAddDialog();

    await userEvent.type(within(panel).getByLabelText("Company"), "Acme Corp");
    await userEvent.type(within(panel).getByLabelText("Job title"), "Engineer");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    const wishlist = screen.getByRole("region", { name: "Wishlist" });
    expect(await within(wishlist).findByRole("button", { name: /^(?!Archive|Restore).*Acme Corp/ })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(server.requests.find((r) => r.method === "POST")?.body).toMatchObject({
      companyName: "Acme Corp",
      jobTitle: "Engineer",
      stage: "wishlist",
    });
  });

  it("says which required field is missing and sends nothing (AC-7)", async () => {
    const server = installFakeServer();
    render(<AppAt />);
    const panel = await openAddDialog();

    await userEvent.type(within(panel).getByLabelText("Job title"), "   ");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    expect(within(panel).getByText("Company is required")).toBeTruthy();
    expect(within(panel).getByText("Job title is required")).toBeTruthy();
    expect(within(panel).getByLabelText("Company").getAttribute("aria-invalid")).toBe("true");
    expect(server.requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("explains other rule breaks next to the field (AC-20)", async () => {
    installFakeServer();
    render(<AppAt />);
    const panel = await openAddDialog();

    await userEvent.type(within(panel).getByLabelText("Company"), "Acme");
    await userEvent.click(within(panel).getByLabelText("Job title"));
    await userEvent.paste("x".repeat(201));
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    const title = within(panel).getByLabelText("Job title");
    const errorId = title.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(errorId)?.textContent).toBe("Job title must be 200 characters or fewer");
  });

  it("shows field errors returned by the server (AC-21)", async () => {
    const server = installFakeServer();
    server.override((method) => {
      if (method !== "POST") return undefined;
      return new Response(JSON.stringify({ error: "Invalid application", fields: { jobTitle: "Server says no" } }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    });
    render(<AppAt />);
    const panel = await openAddDialog();

    await userEvent.type(within(panel).getByLabelText("Company"), "Acme");
    await userEvent.type(within(panel).getByLabelText("Job title"), "Engineer");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    expect(await within(panel).findByText("Server says no")).toBeTruthy();
  });

  it("keeps the dialog and my input when saving fails", async () => {
    const server = installFakeServer();
    render(<AppAt />);
    const panel = await openAddDialog();
    await userEvent.type(within(panel).getByLabelText("Company"), "Acme");
    await userEvent.type(within(panel).getByLabelText("Job title"), "Engineer");

    server.setOffline(true);
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    expect((await within(panel).findByRole("alert")).textContent).toContain("Can't reach the server");
    expect(within(panel).getByLabelText<HTMLInputElement>("Company").value).toBe("Acme");
    expect(within(panel).getByLabelText<HTMLInputElement>("Job title").value).toBe("Engineer");
  });

  it("suggests existing companies (AC-17)", async () => {
    installFakeServer([application({ companyName: "Acme Corp", jobTitle: "A" })], ["Acme Corp", "Globex"]);
    render(<AppAt />);
    const panel = await openAddDialog();

    const company = within(panel).getByLabelText("Company");
    const datalist = document.getElementById(company.getAttribute("list") ?? "");
    expect([...(datalist?.querySelectorAll("option") ?? [])].map((option) => option.value)).toEqual(["Acme Corp", "Globex"]);
  });
});

describe("the application dialog (spec 013, AC-6, AC-13, AC-16)", () => {
  it("is a modal that keeps Tab inside, and gives focus back to the Add button when it closes", async () => {
    installFakeServer();
    render(<AppAt />);
    const addButton = await screen.findByRole("button", { name: "Add application" });
    await userEvent.click(addButton);
    const dialog = screen.getByRole("dialog", { name: "Add application" });

    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.contains(document.activeElement)).toBe(true);
    for (let i = 0; i < 40; i += 1) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(addButton);
  });

  it("edits an application: filled with its values, and calls onSaved after saving", async () => {
    const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", location: "Austin, TX" });
    installFakeServer([acme]);
    const onSaved = vi.fn();
    render(<ApplicationDialog application={acme} companies={[]} onSaved={onSaved} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "Edit application" });

    expect(within(dialog).getByLabelText<HTMLInputElement>("Location").value).toBe("Austin, TX");
    await userEvent.type(within(dialog).getByLabelText("Job title"), " II");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await vi.waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    expect(within(dialog).queryByRole("button", { name: "Delete" })).toBeNull();
    expect(within(dialog).queryByRole("tab")).toBeNull();
  });
});
