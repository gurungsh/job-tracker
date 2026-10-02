import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntryActions } from "../../src/components/EntryActions.tsx";

function renderActions(text = "5+ years with Node.js") {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(<EntryActions what="requirement" text={text} onEdit={onEdit} onDelete={onDelete} />);
  return { onEdit, onDelete };
}

const edit = () => screen.getByRole("button", { name: /^Edit requirement:/ });
const cross = () => screen.getByRole("button", { name: /^Delete requirement:/ });

describe("EntryActions (spec 016, AC-4)", () => {
  it("has a pencil that edits and a ✕ that deletes, each with no text and named for what it acts on", () => {
    renderActions();

    expect(screen.getByRole("button", { name: "Edit requirement: 5+ years with Node.js" })).toBe(edit());
    expect(screen.getByRole("button", { name: "Delete requirement: 5+ years with Node.js" })).toBe(cross());
    for (const button of [edit(), cross()]) {
      expect(button.textContent).toBe("");
      expect(button.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(button.classList.contains("icon-button")).toBe(true);
    }
    expect(edit().classList.contains("icon-button--edit")).toBe(true);
    expect(cross().classList.contains("icon-button--edit")).toBe(false);
  });

  it("gives each button a one-word label for hover and focus, and the ✕'s opens toward the left", () => {
    renderActions();

    expect(edit().getAttribute("data-tip")).toBe("Edit");
    expect(cross().getAttribute("data-tip")).toBe("Delete");
    expect(edit().hasAttribute("data-tip-end")).toBe(false);
    expect(cross().hasAttribute("data-tip-end")).toBe(true);
  });

  it("cuts a long text short in both names, with an ellipsis", () => {
    renderActions("A very long requirement that goes on and on and on well past the limit for a name");

    expect(edit().getAttribute("aria-label")).toBe("Edit requirement: A very long requirement that goes on and…");
    expect(cross().getAttribute("aria-label")).toBe("Delete requirement: A very long requirement that goes on and…");
  });

  it("leaves a text at the limit whole", () => {
    const text = "x".repeat(40);
    renderActions(text);

    expect(screen.getByRole("button", { name: `Edit requirement: ${text}` })).toBeTruthy();
    expect(screen.getByRole("button", { name: `Delete requirement: ${text}` })).toBeTruthy();
  });

  it("calls the right handler on a click, on Enter, and on Space", async () => {
    const { onEdit, onDelete } = renderActions();

    await userEvent.click(edit());
    await userEvent.click(cross());
    edit().focus();
    await userEvent.keyboard("{Enter}");
    cross().focus();
    await userEvent.keyboard(" ");

    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(onDelete).toHaveBeenCalledTimes(2);
  });

  it("is reached with Tab, the pencil first and then the ✕", async () => {
    renderActions();

    await userEvent.tab();
    expect(document.activeElement).toBe(edit());
    await userEvent.tab();
    expect(document.activeElement).toBe(cross());
  });
});

describe("the hover and focus label (spec 016, AC-4; CSS)", () => {
  const css = fs.readFileSync(path.join(import.meta.dirname, "..", "..", "src", "styles", "global.css"), "utf8");

  it("shows on hover and on keyboard focus, so it isn't for mouse users only", () => {
    expect(css).toMatch(/\[data-tip\]:hover::after,\s*\[data-tip\]:focus-visible::after\s*{[^}]*visibility:\s*visible/);
  });

  it("is hidden until then, doesn't catch the pointer, and reads its text from the attribute", () => {
    expect(css).toMatch(/\[data-tip\]::after\s*{[^}]*content:\s*attr\(data-tip\)[^}]*visibility:\s*hidden[^}]*pointer-events:\s*none/);
  });

  it("is --bg on --text, a checked pair reversed, and lines up with the right edge at the end of a row", () => {
    expect(css).toMatch(/\[data-tip\]::after\s*{[^}]*color:\s*var\(--bg\)[^}]*background:\s*var\(--text\)/);
    expect(css).toMatch(/\[data-tip\]\[data-tip-end\]::after\s*{[^}]*right:\s*0[^}]*left:\s*auto/);
  });

  it("hovers the pencil in ordinary colors and the ✕ in the danger pair", () => {
    expect(css).toMatch(/button\.icon-button\.icon-button--edit:hover\s*{[^}]*color:\s*var\(--text\)[^}]*background:\s*var\(--column-bg\)/);
    expect(css).toMatch(/button\.icon-button:hover\s*{[^}]*color:\s*var\(--danger\)[^}]*background:\s*var\(--danger-bg\)/);
  });
});
