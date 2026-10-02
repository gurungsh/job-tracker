import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { FilterDropdown } from "../../src/components/FilterDropdown.tsx";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

function Harness({ initial = [] }: { initial?: ("a" | "b" | "c")[] }) {
  const [selected, setSelected] = useState(initial);
  return (
    <>
      <FilterDropdown label="Letters" options={options} selected={selected} onChange={setSelected} />
      <output>{selected.join(",")}</output>
      <button type="button">Elsewhere</button>
    </>
  );
}

describe("FilterDropdown (spec 012, AC-7, AC-8, AC-22)", () => {
  it("is closed to start, and opens and closes from its button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Letters" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("checkbox")).toBeNull();

    await user.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getAllByRole("checkbox").map((box) => box.parentElement?.textContent.trim())).toEqual(["Alpha", "Beta", "Gamma"]);

    await user.click(button);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("checks values in the order of the options and shows how many are chosen", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Letters" }));

    await user.click(screen.getByRole("checkbox", { name: "Gamma" }));
    await user.click(screen.getByRole("checkbox", { name: "Alpha" }));

    expect(screen.getByRole("status").textContent).toBe("a,c");
    expect(screen.getByRole("button", { name: "Letters 2" })).toBeTruthy();

    await user.click(screen.getByRole("checkbox", { name: "Gamma" }));
    expect(screen.getByRole("status").textContent).toBe("a");
  });

  it("shows the values that are already chosen", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["b"]} />);
    await user.click(screen.getByRole("button", { name: "Letters 1" }));
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Beta" }).checked).toBe(true);
    expect(screen.getByRole<HTMLInputElement>("checkbox", { name: "Alpha" }).checked).toBe(false);
  });

  it("closes on Escape and puts focus back on the button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Letters" }));
    await user.click(screen.getByRole("checkbox", { name: "Alpha" }));

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Letters 1" }));
  });

  it("closes on a click outside and when Tab leaves the list", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const button = screen.getByRole("button", { name: "Letters" });

    await user.click(button);
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("checkbox")).toBeNull();

    await user.click(button);
    await user.tab(); // Alpha
    await user.tab(); // Beta
    await user.tab(); // Gamma
    await user.tab(); // Leaves the dropdown, to "Elsewhere"
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("works from the keyboard alone: Enter opens it and Space checks a box", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.tab();
    await user.keyboard(" ");
    expect(screen.getByRole("status").textContent).toBe("a");
  });
});
