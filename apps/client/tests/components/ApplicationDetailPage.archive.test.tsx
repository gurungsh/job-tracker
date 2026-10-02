import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer } from "../support/fakeServer.ts";

const archivedAt = "2026-10-02T09:00:00.000Z";
const pageOf = (app: { id: number }) => `/applications/${String(app.id)}`;

describe("archiving from the detail page (spec 017, AC-1, AC-5, AC-6)", () => {
  it("archives it, stays on the page, and swaps Archive for Restore, with a pill and a note", async () => {
    const acme = application({ companyName: "Acme", jobTitle: "Engineer", stage: "interviewing" });
    const server = installFakeServer([acme]);
    render(<AppAt path={pageOf(acme)} />);
    expect(document.querySelector(".pill--archived")).toBeNull();

    await userEvent.click(await screen.findByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("button", { name: "Restore" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Archive" })).toBeNull();
    expect(document.querySelector(".detail-header .pill--archived")?.textContent).toBe("Archived");
    expect(screen.getByRole("status").textContent).toBe("Archived. Restore to make changes.");
    expect(screen.getByRole("heading", { level: 2, name: "Engineer" })).toBeTruthy();
    expect(server.applications[0]?.archivedAt).not.toBeNull();
    expect(server.applications[0]?.stage).toBe("interviewing");
  });

  it("puts Archive beside Edit and Delete", async () => {
    const acme = application({ companyName: "Acme", jobTitle: "Engineer" });
    installFakeServer([acme]);
    render(<AppAt path={pageOf(acme)} />);

    await screen.findByRole("button", { name: "Archive" });

    const actions = document.querySelector(".detail-actions") as HTMLElement;
    expect(within(actions).getAllByRole("button").map((b) => b.textContent)).toEqual(["Edit", "Archive", "Delete"]);
  });

  it("restores it in the same stage, and the controls come back", async () => {
    const wonka = application({ companyName: "Wonka", jobTitle: "Chocolatier", stage: "offer", archivedAt });
    const server = installFakeServer([wonka]);
    render(<AppAt path={pageOf(wonka)} />);

    await userEvent.click(await screen.findByRole("button", { name: "Restore" }));

    expect(await screen.findByRole("button", { name: "Archive" })).toBeTruthy();
    expect(document.querySelector(".pill--archived")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).value).toBe("offer");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Edit" }).disabled).toBe(false);
    expect(server.applications[0]?.archivedAt).toBeNull();
  });

  it("disables the stage menu and Edit while archived, and keeps Delete working with its confirmation", async () => {
    const wonka = application({ companyName: "Wonka", jobTitle: "Chocolatier", archivedAt });
    const server = installFakeServer([wonka]);
    render(<AppAt path={pageOf(wonka)} />);

    await screen.findByRole("button", { name: "Restore" });
    expect(screen.getByRole<HTMLSelectElement>("combobox", { name: "Stage" }).disabled).toBe(true);
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Edit" }).disabled).toBe(true);
    const del = screen.getByRole<HTMLButtonElement>("button", { name: "Delete" });
    expect(del.disabled).toBe(false);

    await userEvent.click(del);
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(server.applications).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("region", { name: "Wishlist" })).toBeTruthy();
    expect(server.applications).toHaveLength(0);
  });

  it("says so, and changes nothing, when it can't be archived", async () => {
    const acme = application({ companyName: "Acme", jobTitle: "Engineer" });
    const server = installFakeServer([acme]);
    render(<AppAt path={pageOf(acme)} />);
    const archive = await screen.findByRole("button", { name: "Archive" });
    server.setOffline(true);

    await userEvent.click(archive);

    expect((await screen.findByRole("alert")).textContent).toContain("Couldn't archive.");
    expect(screen.getByRole("button", { name: "Archive" })).toBeTruthy();
    expect(document.querySelector(".pill--archived")).toBeNull();
  });
});
