import fs from "node:fs";
import path from "node:path";
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

/** Opens Acme's page, where the requirements are a card of their own (specs 013 and 016). */
async function openPage(server = installFakeServer([acme])) {
  render(<AppAt path={`/applications/${String(acme.id)}`} />);
  await screen.findByRole("button", { name: "Add requirement" });
  return server;
}

const section = () => within(screen.getByRole("region", { name: "Requirements" }));

/** Opens the add form from "+ Add" in the card's heading (spec 016, AC-6), or finds it if it is already open. */
async function openAddForm() {
  if (!screen.queryByRole("form", { name: "Add requirement" })) {
    await userEvent.click(screen.getByRole("button", { name: "Add requirement" }));
  }
  return screen.findByRole("form", { name: "Add requirement" });
}
const addForm = () => within(screen.getByRole("form", { name: "Add requirement" }));
const items = () => section().queryAllByRole("listitem");
const texts = () => items().map((item) => item.querySelector(".requirement-text")?.textContent);
const summary = () => document.querySelector(".requirements-summary")?.textContent;

async function addItem(text: string, kind?: "Required" | "Preferred") {
  await openAddForm();
  const form = addForm();
  if (kind) await userEvent.selectOptions(form.getByLabelText("Kind"), kind);
  await userEvent.type(form.getByLabelText("Text"), text);
  await userEvent.click(form.getByRole("button", { name: "Save" }));
}

describe("the Requirements section", () => {
  it("says there are no requirements, shows no counts, and offers + Add instead of an open form (AC-2, AC-6)", async () => {
    await openPage();

    expect(screen.getByText("No requirements yet. Use + Add to list the items from the posting.")).toBeTruthy();
    expect(summary()).toBeUndefined();
    expect(screen.queryByRole("form", { name: "Add requirement" })).toBeNull();

    await openAddForm();
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

    await openPage(server);
    await section().findAllByRole("listitem");

    expect(texts()).toEqual(["req 1", "req 2", "pref 1"]);
    expect(summary()).toBe("1/2 required met");
    expect(screen.getAllByRole<HTMLInputElement>("checkbox").map((box) => box.checked)).toEqual([true, false, true]);
    expect(screen.queryByText("someone else's")).toBeNull();
  });

  it("adds an item unmet in its group, closes the form, and offers the same kind next time (AC-6)", async () => {
    const server = await openPage();

    await addItem("Rust", "Preferred");

    await waitFor(() => {
      expect(texts()).toEqual(["Rust"]);
    });
    expect(server.requirements).toEqual([expect.objectContaining({ applicationId: acme.id, text: "Rust", kind: "preferred", met: false })]);
    expect(screen.getByRole<HTMLInputElement>("checkbox").checked).toBe(false);
    expect(screen.queryByRole("form", { name: "Add requirement" })).toBeNull();
    expect(summary()).toBeUndefined();

    await openAddForm();
    expect(addForm().getByLabelText<HTMLTextAreaElement>("Text").value).toBe("");
    expect(addForm().getByLabelText<HTMLSelectElement>("Kind").value).toBe("preferred");
  });

  it("puts a new required item above the preferred ones (AC-3, AC-4)", async () => {
    await openPage();

    await addItem("Nice to have", "Preferred");
    await waitFor(() => {
      expect(texts()).toEqual(["Nice to have"]);
    });
    await openAddForm();
    await userEvent.selectOptions(addForm().getByLabelText("Kind"), "Required");
    await userEvent.type(addForm().getByLabelText("Text"), "Must have");
    await userEvent.click(addForm().getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(texts()).toEqual(["Must have", "Nice to have"]);
    });
    expect(summary()).toBe("0/1 required met");
  });

  it("explains empty and too-long text next to the field, and sends nothing (AC-9)", async () => {
    const server = await openPage();
    await openAddForm();

    await userEvent.click(addForm().getByRole("button", { name: "Save" }));
    expect(addForm().getByText("Text is required")).toBeTruthy();

    await userEvent.click(addForm().getByLabelText("Text"));
    await userEvent.paste("x".repeat(501));
    await userEvent.click(addForm().getByRole("button", { name: "Save" }));
    expect(addForm().getByText("Text must be 500 characters or fewer")).toBeTruthy();
    expect(server.requests.filter((request) => request.method === "POST")).toHaveLength(0);
  });

  it("keeps what I typed when adding fails, and says why (AC-13)", async () => {
    const server = await openPage();
    await openAddForm();
    await userEvent.type(addForm().getByLabelText("Text"), "Keep me");
    server.setOffline(true);

    await userEvent.click(addForm().getByRole("button", { name: "Save" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't save the requirement");
    expect(alert.textContent).toContain("Can't reach the server");
    expect(addForm().getByLabelText<HTMLTextAreaElement>("Text").value).toBe("Keep me");
  });

  it("shows an error with a way to try again when loading fails (AC-13)", async () => {
    const server = installFakeServer([acme]);
    let down = true;
    server.override((method, path) =>
      down && method === "GET" && path.endsWith("/requirements")
        ? new Response(JSON.stringify({ error: "Service down" }), { status: 503 })
        : undefined,
    );
    render(<AppAt path={`/applications/${String(acme.id)}`} />);

    const alert = await within(await screen.findByRole("region", { name: "Requirements" })).findByRole("alert");
    expect(alert.textContent).toContain("Couldn't load the requirements");

    down = false;
    await userEvent.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("button", { name: "Add requirement" })).toBeTruthy();
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
    await openPage(server);
    await section().findAllByRole("listitem");
    expect(summary()).toBe("0/2 required met");

    await userEvent.click(screen.getByRole("checkbox", { name: "First" }));

    await waitFor(() => {
      expect(summary()).toBe("1/2 required met");
    });
    expect(server.requirements[0]).toMatchObject({ text: "First", met: true });
    expect(texts()).toEqual(["First", "Second", "Third"]);

    await userEvent.click(screen.getByRole("checkbox", { name: "First" }));
    await waitFor(() => {
      expect(server.requirements[0]?.met).toBe(false);
    });
    expect(summary()).toBe("0/2 required met");
  });

  it("sends the whole item when checking, so the text and kind are kept (AC-5)", async () => {
    const server = withItems();
    await openPage(server);

    await userEvent.click(await screen.findByRole("checkbox", { name: "Third" }));

    await waitFor(() => {
      expect(server.requests.find((request) => request.method === "PUT")?.body).toEqual({ text: "Third", kind: "preferred", met: true });
    });
  });

  it("leaves the box as it was, and says why, when saving fails (AC-13)", async () => {
    const server = withItems();
    await openPage(server);
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
    await openPage(server);
    await section().findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
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
    // Only preferred ones are left, which never count, so there is no line (spec 016, AC-3).
    expect(summary()).toBeUndefined();
  });

  it("discards changes on Cancel (AC-7)", async () => {
    const server = withItems();
    await openPage(server);
    await section().findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    await userEvent.type(within(screen.getByRole("form", { name: "Edit requirement" })).getByLabelText("Text"), " more");
    await userEvent.click(within(screen.getByRole("form", { name: "Edit requirement" })).getByRole("button", { name: "Cancel" }));

    expect(texts()).toEqual(["Go", "Rust"]);
    expect(server.requirements[0]?.text).toBe("Go");
  });

  it("explains an emptied text when editing (AC-9)", async () => {
    const server = withItems();
    await openPage(server);
    await section().findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    const form = within(screen.getByRole("form", { name: "Edit requirement" }));
    await userEvent.clear(form.getByLabelText("Text"));
    await userEvent.click(form.getByRole("button", { name: "Save" }));

    expect(form.getByText("Text is required")).toBeTruthy();
    expect(server.requests.filter((request) => request.method === "PUT")).toHaveLength(0);
  });

  it("deletes only after I confirm, and updates the counts (AC-8)", async () => {
    const server = withItems();
    await openPage(server);
    await section().findAllByRole("listitem");
    const deleteFirst = () => userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Delete/ }));

    await deleteFirst();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    expect(server.requirements).toHaveLength(2);

    await deleteFirst();
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(texts()).toEqual(["Rust"]);
    });
    expect(server.requirements).toHaveLength(1);
    expect(summary()).toBeUndefined();
  });

  it("says why a delete failed and keeps the item (AC-13)", async () => {
    const server = withItems();
    await openPage(server);
    await section().findAllByRole("listitem");
    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Delete/ }));
    server.setOffline(true);

    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Couldn't delete the requirement");
    expect(texts()).toEqual(["Go", "Rust"]);
  });
});

describe("the Requirements card's look and controls (spec 016, AC-1, AC-3, AC-4, AC-5, AC-6)", () => {
  function withItems() {
    const server = installFakeServer([acme]);
    server.requirements.push(
      requirement({ applicationId: acme.id, text: "5+ years with Node.js", kind: "required" }),
      requirement({ applicationId: acme.id, text: "PostgreSQL tuning", kind: "required" }),
      requirement({ applicationId: acme.id, text: "Kafka", kind: "preferred" }),
    );
    return server;
  }

  it("is a card with its own heading, and \"+ Add\" in the heading beside it (AC-1, AC-6)", async () => {
    await openPage(withItems());

    const region = screen.getByRole("region", { name: "Requirements" });
    const add = within(region).getByRole("button", { name: "Add requirement" });
    expect(add.textContent).toBe("+ Add");
    expect(add.parentElement).toBe(within(region).getByRole("heading", { name: "Requirements" }).parentElement);
  });

  it("marks a preferred one \"Nice to have\" and a required one not, without changing the checkbox's name (AC-3)", async () => {
    await openPage(withItems());
    await section().findAllByRole("listitem");

    expect(items().map((item) => item.querySelector(".pill")?.textContent ?? null)).toEqual([null, null, "Nice to have"]);
    expect(screen.getByRole("checkbox", { name: "Kafka" })).toBeTruthy();
  });

  it("has no section-level Edit and no reordering, only one Edit and one ✕ for each requirement (AC-3, AC-4)", async () => {
    await openPage(withItems());
    await section().findAllByRole("listitem");

    expect(section().getAllByRole("button", { name: /^Edit / })).toHaveLength(3);
    expect(section().getAllByRole("button", { name: /^Delete requirement:/ })).toHaveLength(3);
    expect(section().queryByRole("button", { name: /move|up|down/i })).toBeNull();
    for (const item of items()) expect(within(item).getAllByRole("button")).toHaveLength(2);
  });

  it("names each ✕ for the requirement it deletes (AC-4)", async () => {
    await openPage(withItems());
    await section().findAllByRole("listitem");

    expect(section().getAllByRole("button", { name: /^Delete requirement:/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Delete requirement: 5+ years with Node.js",
      "Delete requirement: PostgreSQL tuning",
      "Delete requirement: Kafka",
    ]);
  });

  it("asks before deleting with the same wording as before, and Escape deletes nothing (AC-5)", async () => {
    const server = withItems();
    await openPage(server);
    await section().findAllByRole("listitem");

    await userEvent.click(section().getByRole("button", { name: "Delete requirement: Kafka" }));
    const confirm = screen.getByRole("alertdialog", { name: "Delete this requirement?" });
    expect(confirm.textContent).toContain('"Kafka" will be removed from the list.');
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(server.requirements).toHaveLength(3);
  });

  it("hides + Add while the form is open, and Cancel closes it and puts focus back on + Add (AC-6)", async () => {
    await openPage(withItems());
    await openAddForm();

    expect(screen.queryByRole("button", { name: "Add requirement" })).toBeNull();
    expect(addForm().getByRole("button", { name: "Save" })).toBeTruthy();

    await userEvent.click(addForm().getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("form", { name: "Add requirement" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add requirement" }));
  });

  it("keeps a half-typed edit when I choose Edit on another requirement (edge case)", async () => {
    await openPage(withItems());
    await section().findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    await userEvent.type(screen.getByRole("form", { name: "Edit requirement" }).querySelector("textarea") as HTMLElement, " and more");
    await userEvent.click(within(items()[1] as HTMLElement).getByRole("button", { name: /^Edit / }));

    const forms = screen.getAllByRole("form", { name: "Edit requirement" });
    expect(forms).toHaveLength(2);
    expect(within(forms[0] as HTMLElement).getByLabelText<HTMLTextAreaElement>("Text").value).toBe("5+ years with Node.js and more");
    expect(within(forms[1] as HTMLElement).getByLabelText<HTMLTextAreaElement>("Text").value).toBe("PostgreSQL tuning");
  });

  it("marks a requirement moved to preferred as 'Nice to have', and the line stops counting it (AC-3)", async () => {
    await openPage(withItems());
    await section().findAllByRole("listitem");
    expect(summary()).toBe("0/2 required met");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    await userEvent.selectOptions(screen.getByLabelText("Kind"), "Preferred");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(summary()).toBe("0/1 required met");
    });
    expect(items().map((item) => item.querySelector(".pill")?.textContent ?? null)).toEqual([null, "Nice to have", "Nice to have"]);
  });
});

describe("the Requirements form: text and kind on one line, without labels (spec 016, AC-6)", () => {
  it("has no visible labels, and the text and the kind are in one row with accessible names", async () => {
    await openPage();
    await openAddForm();
    const form = screen.getByRole("form", { name: "Add requirement" });

    expect(form.querySelectorAll("label")).toHaveLength(0);
    const row = form.querySelector(".requirement-fields") as HTMLElement;
    const text = within(row).getByRole("textbox", { name: "Text" });
    const kind = within(row).getByRole("combobox", { name: "Kind" });
    expect(text.getAttribute("placeholder")).toBe("Requirement");
    expect(text.compareDocumentPosition(kind)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(within(form).getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(within(form).getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("is one line tall, and Enter saves while Shift+Enter makes a new line", async () => {
    const server = await openPage();
    await openAddForm();
    const text = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Text" });
    expect(text.rows).toBe(1);

    await userEvent.type(text, "Line one{Shift>}{Enter}{/Shift}line two");
    expect(text.value).toBe("Line one\nline two");
    expect(server.requests.filter((r) => r.method === "POST")).toHaveLength(0);

    await userEvent.type(text, "{Enter}");

    await waitFor(() => {
      expect(server.requirements).toEqual([expect.objectContaining({ text: "Line one\nline two", kind: "required" })]);
    });
    expect(screen.queryByRole("form", { name: "Add requirement" })).toBeNull();
  });

  it("uses the same one-line form to edit a requirement, and keeps the error next to it", async () => {
    const server = installFakeServer([acme]);
    server.requirements.push(requirement({ applicationId: acme.id, text: "Go", kind: "required" }));
    await openPage(server);
    await section().findAllByRole("listitem");

    await userEvent.click(within(items()[0] as HTMLElement).getByRole("button", { name: /^Edit / }));
    const form = screen.getByRole("form", { name: "Edit requirement" });
    expect(form.querySelectorAll("label")).toHaveLength(0);
    expect(form.querySelector(".requirement-fields")).not.toBeNull();
    await userEvent.clear(within(form).getByRole("textbox", { name: "Text" }));
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));

    expect(within(form).getByText("Text is required")).toBeTruthy();
    expect(within(form).getByRole("textbox", { name: "Text" }).getAttribute("aria-invalid")).toBe("true");
  });

  it("grows the text box to fit a long text, and shrinks it back when the text is cleared", async () => {
    const heights = new Map<string, number>([["short", 40], ["long", 78]]);
    const scrollHeight = vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get");
    await openPage();
    await openAddForm();
    const text = screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Text" });

    scrollHeight.mockImplementation(function (this: HTMLTextAreaElement) {
      return this.value.length > 30 ? (heights.get("long") ?? 0) : (heights.get("short") ?? 0);
    });
    await userEvent.type(text, "A requirement that is long enough to need two lines of text");
    expect(text.style.height).toBe("78px");

    await userEvent.clear(text);
    expect(text.style.height).toBe("40px");
    scrollHeight.mockRestore();
  });

  it("gives the kind a roomy width of its own, and the text the rest of the line (CSS)", () => {
    const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "components", "Requirements.css"), "utf8");

    expect(css).toMatch(/\.requirement-fields select\s*{[^}]*flex:\s*0 0 11rem[^}]*padding:\s*0\.45rem 0\.9rem/);
    expect(css).toMatch(/\.requirement-fields textarea\s*{[^}]*flex:\s*1 1 12rem[^}]*min-width:\s*0/);
    expect(css).not.toContain("field-sizing");
  });
});

