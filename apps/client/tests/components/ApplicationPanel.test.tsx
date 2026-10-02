import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 1, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

async function openAddPanel() {
  await userEvent.click(await screen.findByRole("button", { name: "Add application" }));
  return screen.getByRole("dialog", { name: "Add application" });
}

describe("adding an application", () => {
  it("adds a card to Wishlist from just a company and a job title (AC-6)", async () => {
    const server = installFakeServer();
    render(<AppAt />);
    const panel = await openAddPanel();

    await userEvent.type(within(panel).getByLabelText("Company"), "Acme Corp");
    await userEvent.type(within(panel).getByLabelText("Job title"), "Engineer");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    const wishlist = screen.getByRole("region", { name: "Wishlist" });
    expect(await within(wishlist).findByRole("button", { name: /Acme Corp/ })).toBeTruthy();
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
    const panel = await openAddPanel();

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
    const panel = await openAddPanel();

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
    const panel = await openAddPanel();

    await userEvent.type(within(panel).getByLabelText("Company"), "Acme");
    await userEvent.type(within(panel).getByLabelText("Job title"), "Engineer");
    await userEvent.click(within(panel).getByRole("button", { name: "Save" }));

    expect(await within(panel).findByText("Server says no")).toBeTruthy();
  });

  it("keeps the panel and my input when saving fails", async () => {
    const server = installFakeServer();
    render(<AppAt />);
    const panel = await openAddPanel();
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
    const panel = await openAddPanel();

    const company = within(panel).getByLabelText("Company");
    const datalist = document.getElementById(company.getAttribute("list") ?? "");
    expect([...(datalist?.querySelectorAll("option") ?? [])].map((option) => option.value)).toEqual(["Acme Corp", "Globex"]);
  });
});
