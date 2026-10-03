import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppAt } from "../support/render.tsx";
import { activity, application, contact, installFakeServer, requirement } from "../support/fakeServer.ts";

const archivedAt = "2026-10-02T09:00:00.000Z";

function setup(archived: boolean) {
  const wonka = application({ companyName: "Wonka", jobTitle: "Chocolatier", archivedAt: archived ? archivedAt : null });
  const server = installFakeServer([wonka]);
  server.requirements.push(
    requirement({ applicationId: wonka.id, text: "Taste test", kind: "required" }),
    requirement({ applicationId: wonka.id, text: "Whimsy", kind: "preferred", met: true }),
  );
  server.activities.push(activity({ applicationId: wonka.id, text: "Phone screen", type: "call" }));
  server.contacts.push(contact({ companyId: wonka.companyId, name: "Willy", role: "Founder", email: "willy@wonka.example" }));
  return { wonka, server };
}

async function open(app: { id: number }) {
  render(<AppAt path={`/applications/${String(app.id)}`} />);
  await screen.findByText("Taste test");
  await screen.findByText("Phone screen");
  await within(await screen.findByRole("region", { name: "Contacts" })).findByText("Willy");
}

const region = (name: string) => within(screen.getByRole("region", { name }));

describe("an archived application's page is read-only (spec 017, AC-6)", () => {
  it("shows every requirement, entry, and person, with nothing to add, edit, delete, or tick", async () => {
    const { wonka } = setup(true);
    await open(wonka);

    expect(region("Requirements").getByText("Whimsy")).toBeTruthy();
    expect(region("Timeline").getByText("Phone screen")).toBeTruthy();
    expect(region("Contacts").getByText("Willy")).toBeTruthy();
    expect(region("Contacts").getByRole("link", { name: "willy@wonka.example" })).toBeTruthy();

    for (const checkbox of region("Requirements").getAllByRole("checkbox")) expect((checkbox as HTMLInputElement).disabled).toBe(true);
    for (const name of ["Requirements", "Timeline", "Contacts"]) {
      expect(region(name).queryByRole("button", { name: /^(Add|Edit|Delete|Log)/ }), name).toBeNull();
    }
    expect(screen.queryByRole("form", { name: /^Add/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add requirement" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add contact" })).toBeNull();
  });

  it("makes no request to change anything when a checkbox is clicked", async () => {
    const { wonka, server } = setup(true);
    await open(wonka);
    const before = server.requests.length;

    await userEvent.click(region("Requirements").getByRole("checkbox", { name: "Taste test" }));

    expect(server.requests.slice(before).filter((r) => r.method !== "GET")).toEqual([]);
    expect(server.requirements[0]?.met).toBe(false);
  });

  it("has all the controls on an application that isn't archived", async () => {
    const { wonka } = setup(false);
    await open(wonka);

    expect(region("Requirements").getByRole("button", { name: "Add requirement" })).toBeTruthy();
    expect(region("Requirements").getByRole("button", { name: "Edit requirement: Taste test" })).toBeTruthy();
    expect(region("Timeline").getByRole("form", { name: "Add entry" })).toBeTruthy();
    expect(region("Timeline").getByRole("button", { name: /^Delete entry:/ })).toBeTruthy();
    expect(region("Contacts").getByRole("button", { name: "Add contact" })).toBeTruthy();
    expect(region("Contacts").getByRole("button", { name: /^Edit contact:/ })).toBeTruthy();
  });

  it("gets every control back when it is restored, and loses them again when archived", async () => {
    const { wonka } = setup(true);
    await open(wonka);

    await userEvent.click(screen.getByRole("button", { name: "Restore" }));

    expect(await region("Requirements").findByRole("button", { name: "Add requirement" })).toBeTruthy();
    expect(region("Timeline").getByRole("form", { name: "Add entry" })).toBeTruthy();
    expect(region("Contacts").getByRole("button", { name: "Add contact" })).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Archive" }));

    expect(await screen.findByRole("button", { name: "Restore" })).toBeTruthy();
    expect(region("Requirements").queryByRole("button", { name: "Add requirement" })).toBeNull();
    expect(screen.queryByRole("form", { name: "Add entry" })).toBeNull();
  });

  it("says there is nothing to add, rather than telling me to add, when a box is empty", async () => {
    const wonka = application({ companyName: "Wonka", jobTitle: "Chocolatier", archivedAt });
    installFakeServer([wonka]);
    render(<AppAt path={`/applications/${String(wonka.id)}`} />);

    await screen.findByRole("region", { name: "Requirements" });
    expect(await region("Requirements").findByText("No requirements.")).toBeTruthy();
    expect(region("Timeline").getByText("No entries.")).toBeTruthy();
    expect(region("Contacts").getByText("Nobody recorded yet.")).toBeTruthy();
  });
});
