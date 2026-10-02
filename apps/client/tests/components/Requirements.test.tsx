import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppAt } from "../support/render.tsx";
import { application, installFakeServer, requirement } from "../support/fakeServer.ts";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 13, 9, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

const acme = application({ companyName: "Acme Corp", jobTitle: "Engineer", stage: "applied" });

async function openTab(server = installFakeServer([acme])) {
  render(<AppAt />);
  await userEvent.click(await screen.findByRole("button", { name: /Acme Corp/ }));
  await userEvent.click(screen.getByRole("tab", { name: "Requirements" }));
  await screen.findByRole("form", { name: "Add requirement" });
  return server;
}

const addForm = () => within(screen.getByRole("form", { name: "Add requirement" }));
const items = () => screen.queryAllByRole("listitem");
const texts = () => items().map((item) => item.querySelector(".requirement-text")?.textContent);
const summary = () => document.querySelector(".requirements-summary")?.textContent;

async function addItem(text: string, kind?: "Required" | "Preferred") {
  const form = addForm();
  if (kind) await userEvent.selectOptions(form.getByLabelText("Kind"), kind);
  await userEvent.type(form.getByLabelText("Text"), text);
  await userEvent.click(form.getByRole("button", { name: "Add requirement" }));
}

describe("the Requirements tab", () => {
  it("is the fourth tab for an existing application, and absent for a new one (AC-1)", async () => {
    installFakeServer([acme]);
    render(<AppAt />);

    await userEvent.click(await screen.findByRole("button", { name: /Acme Corp/ }));
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Details", "Timeline", "Contacts", "Requirements"]);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    await userEvent.click(screen.getByRole("button", { name: "Add application" }));
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("says there are no requirements, shows no counts, and offers the form (AC-2, AC-12)", async () => {
    await openTab();

    expect(screen.getByText(/No requirements yet/)).toBeTruthy();
    expect(summary()).toBeUndefined();
    expect(addForm().getByLabelText<HTMLSelectElement>("Kind").value).toBe("required");
  });

  it("lists required items first, then preferred, each in the order added, with a summary (AC-4, AC-6)", async () => {
    const server = installFakeServer([acme]);
    server.requirements.push(
      requirement({ applicationId: acme.id, text: "pref 1", kind: "preferred", met: true }),
      requirement({ applicationId: acme.id, text: "req 1", kind: "required", met: true }),
      requirement({ applicationId: acme.id, text: "req 2", kind: "required" }),
      requirement({ applicationId: acme.id + 1, text: "someone else's" }),
    );

    await openTab(server);
    await screen.findAllByRole("listitem");

    expect(texts()).toEqual(["req 1", "req 2", "pref 1"]);
    expect(summary()).toBe("Required: 1 of 2 met · Preferred: 1 of 1 met");
    expect(screen.getAllByRole<HTMLInputElement>("checkbox").map((box) => box.checked)).toEqual([true, false, true]);
    expect(screen.queryByText("someone else's")).toBeNull();
  });

  it("adds an item unmet in its group, clears the text, and keeps the kind (AC-3)", async () => {
    const server = await openTab();

    await addItem("Rust", "Preferred");

    await waitFor(() => {
      expect(texts()).toEqual(["Rust"]);
    });
    expect(server.requirements).toEqual([expect.objectContaining({ applicationId: acme.id, text: "Rust", kind: "preferred", met: false })]);
    expect(screen.getByRole<HTMLInputElement>("checkbox").checked).toBe(false);
    expect(addForm().getByLabelText<HTMLTextAreaElement>("Text").value).toBe("");
    expect(addForm().getByLabelText<HTMLSelectElement>("Kind").value).toBe("preferred");
    expect(summary()).toBe("Preferred: 0 of 1 met");
  });

  it("puts a new required item above the preferred ones (AC-3, AC-4)", async () => {
    await openTab();

    await addItem("Nice to have", "Preferred");
    await waitFor(() => {
      expect(texts()).toEqual(["Nice to have"]);
    });
    await userEvent.selectOptions(addForm().getByLabelText("Kind"), "Required");
    await userEvent.type(addForm().getByLabelText("Text"), "Must have");
    await userEvent.click(addForm().getByRole("button", { name: "Add requirement" }));

    await waitFor(() => {
      expect(texts()).toEqual(["Must have", "Nice to have"]);
    });
    expect(summary()).toBe("Required: 0 of 1 met · Preferred: 0 of 1 met");
  });

  it("explains empty and too-long text next to the field, and sends nothing (AC-9)", async () => {
    const server = await openTab();

    await userEvent.click(addForm().getByRole("button", { name: "Add requirement" }));
    expect(addForm().getByText("Text is required")).toBeTruthy();

    await userEvent.click(addForm().getByLabelText("Text"));
    await userEvent.paste("x".repeat(501));
    await userEvent.click(addForm().getByRole("button", { name: "Add requirement" }));
    expect(addForm().getByText("Text must be 500 characters or fewer")).toBeTruthy();
    expect(server.requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("keeps what I typed when adding fails, and says why (AC-13)", async () => {
    const server = await openTab();
    await userEvent.type(addForm().getByLabelText("Text"), "Keep me");
    server.setOffline(true);

    await userEvent.click(addForm().getByRole("button", { name: "Add requirement" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't save the requirement");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(addForm().getByLabelText<HTMLTextAreaElement>("Text").value).toBe("Keep me");
  });

  it("shows an error with a way to try again when loading fails (AC-13)", async () => {
    const server = installFakeServer([acme]);
    render(<AppAt />);
    await userEvent.click(await screen.findByRole("button", { name: /Acme Corp/ }));
    server.setOffline(true);
    await userEvent.click(screen.getByRole("tab", { name: "Requirements" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the requirements");

    server.setOffline(false);
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("form", { name: "Add requirement" })).toBeTruthy();
  });

  it("keeps unsaved Details changes when switching to Requirements and back (AC-14)", async () => {
    await openTab();
    await userEvent.click(screen.getByRole("tab", { name: "Details" }));
    await userEvent.type(screen.getByLabelText("Job title"), " II");
    await userEvent.click(screen.getByRole("tab", { name: "Requirements" }));
    expect(screen.queryByRole("textbox", { name: "Job title" })).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Details" }));

    expect(screen.getByLabelText<HTMLInputElement>("Job title").value).toBe("Engineer II");
  });
});

describe("checking items", () => {
  function withItems() {
    const server = installFakeServer([acme]);
    server.requirements.push(
      requirement({ applicationId: acme.id, text: "First", kind: "required" }),
      requirement({ applicationId: acme.id, text: "Second", kind: "required" }),
      requirement({ applicationId: acme.id, text: "Third", kind: "preferred" }),
    );
    return server;
  }

  it("checks and unchecks an item, keeps it in place, and updates the summary (AC-5, AC-6)", async () => {
    const server = withItems();
    await openTab(server);
    await screen.findAllByRole("listitem");
    expect(summary()).toBe("Required: 0 of 2 met · Preferred: 0 of 1 met");

    await userEvent.click(screen.getByRole("checkbox", { name: "First" }));

    await waitFor(() => {
      expect(summary()).toBe("Required: 1 of 2 met · Preferred: 0 of 1 met");
    });
    expect(server.requirements[0]).toMatchObject({ text: "First", met: true });
    expect(texts()).toEqual(["First", "Second", "Third"]);

    await userEvent.click(screen.getByRole("checkbox", { name: "First" }));
    await waitFor(() => {
      expect(server.requirements[0]?.met).toBe(false);
    });
    expect(summary()).toBe("Required: 0 of 2 met · Preferred: 0 of 1 met");
  });

  it("sends the whole item when checking, so the text and kind are kept (AC-5)", async () => {
    const server = withItems();
    await openTab(server);

    await userEvent.click(await screen.findByRole("checkbox", { name: "Third" }));

    await waitFor(() => {
      expect(server.requests.find((request) => request.method === "PUT")?.body).toEqual({ text: "Third", kind: "preferred", met: true });
    });
  });

  it("leaves the box as it was, and says why, when saving fails (AC-13)", async () => {
    const server = withItems();
    await openTab(server);
    const box = await screen.findByRole<HTMLInputElement>("checkbox", { name: "First" });
    server.setOffline(true);

    await userEvent.click(box);

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain('Couldn\'t update "First"');
    expect(box.checked).toBe(false);
    expect(box.disabled).toBe(false);
    expect(server.requirements[0]?.met).toBe(false);
  });
});

describe("editing and deleting", () => {
  function withItems() {
    const server = installFakeServer([acme]);
    server.requirements.push(
      requirement({ applicationId: acme.id, text: "Go", kind: "required", met: true }),
      requirement({ applicationId: acme.id, text: "Rust", kind: "preferred" }),
    );
    return server;
  }

  it("changes the text and kind, keeps whether it is met, and moves it to the other group (AC-7)", async () => {
    const server = withItems();
    await openTab(server);
    await screen.findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    const form = within(screen.getByRole("form", { name: "Edit requirement" }));
    expect(form.getByLabelText<HTMLTextAreaElement>("Text").value).toBe("Go");
    await userEvent.clear(form.getByLabelText("Text"));
    await userEvent.type(form.getByLabelText("Text"), "Golang");
    await userEvent.selectOptions(form.getByLabelText("Kind"), "Preferred");
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("form", { name: "Edit requirement" })).toBeNull();
    });
    expect(server.requirements[0]).toMatchObject({ text: "Golang", kind: "preferred", met: true });
    expect(texts()).toEqual(["Golang", "Rust"]);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Golang" }).checked).toBe(true);
    expect(summary()).toBe("Preferred: 1 of 2 met");
  });

  it("discards changes on Cancel (AC-7)", async () => {
    const server = withItems();
    await openTab(server);
    await screen.findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit requirement" })).getByLabelText("Text"), " more");
    await userEvent.click(within(screen.getByRole("form", { name: "Edit requirement" })).getByRole("button", { name: "Cancel" }));

    expect(texts()).toEqual(["Go", "Rust"]);
    expect(server.requirements[0]?.text).toBe("Go");
  });

  it("explains an emptied text when editing (AC-9)", async () => {
    const server = withItems();
    await openTab(server);
    await screen.findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: "Edit" }));
    const form = within(screen.getByRole("form", { name: "Edit requirement" }));
    await userEvent.clear(form.getByLabelText("Text"));
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    expect(form.getByText("Text is required")).toBeTruthy();
    expect(server.requests.filter((request) => request.method === "PUT")).toHaveLength(0);
  });

  it("deletes only after I confirm, and updates the counts (AC-8)", async () => {
    const server = withItems();
    await openTab(server);
    await screen.findAllByRole("listitem");
    const deleteFirst = () => userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: "Delete" }));

    await deleteFirst();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(server.requirements).toHaveLength(2);

    await deleteFirst();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(texts()).toEqual(["Rust"]);
    });
    expect(server.requirements).toHaveLength(1);
    expect(summary()).toBe("Preferred: 0 of 1 met");
  });

  it("says why a delete failed and keeps the item (AC-13)", async () => {
    const server = withItems();
    await openTab(server);
    await screen.findAllByRole("listitem");
    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: "Delete" }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't delete the requirement");
    expect(texts()).toEqual(["Go", "Rust"]);
  });
});
