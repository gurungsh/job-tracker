import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { STAGE_LABELS, STAGES } from "@job-tracker/shared";
import { describe, expect, it, vi } from "vitest";
import { CardMenu } from "../../src/components/CardMenu.tsx";
import { application } from "../support/fakeServer.ts";

const app = application({ id: 7, companyName: "Acme", jobTitle: "Engineer", stage: "applied" });

function setup(props: Partial<React.ComponentProps<typeof CardMenu>> = {}) {
  const onMove = vi.fn();
  const onCardClick = vi.fn();
  render(
    <div onClick={onCardClick}>
      <button type="button">before</button>
      <CardMenu application={app} onMove={onMove} {...props} />
    </div>,
  );
  return { onMove, onCardClick, button: screen.getByRole("button", { name: "Move: Engineer at Acme" }) };
}

const items = () => screen.getAllByRole("menuitem");

describe("CardMenu (spec 018)", () => {
  it("lists the seven other stages with their icons when opened (AC-7)", async () => {
    const { button } = setup();
    expect(screen.queryByRole("menu")).toBeNull();

    await userEvent.click(button);

    expect(screen.getByRole("menu", { name: "Move to" })).toBeTruthy();
    expect(items().map((item) => item.textContent.trim())).toEqual(STAGES.filter((s) => s !== "applied").map((s) => STAGE_LABELS[s]));
    expect(items().every((item) => item.querySelector("svg") && item.getAttribute("data-stage"))).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("moves to the stage picked and closes (AC-8, AC-10)", async () => {
    const { onMove } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Move:/ }));

    await userEvent.click(screen.getByRole("menuitem", { name: "Offer" }));

    expect(onMove).toHaveBeenCalledWith(app, "offer");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape with focus back on the button, on an outside click, and on Tab (AC-10)", async () => {
    const { button } = setup();

    await userEvent.click(button);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(button);

    await userEvent.click(button);
    await userEvent.click(screen.getByRole("button", { name: "before" }));
    expect(screen.queryByRole("menu")).toBeNull();

    await userEvent.click(button);
    await userEvent.tab();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("doesn't reach what's behind it when clicked (AC-11)", async () => {
    const { button, onCardClick } = setup();

    await userEvent.click(button);
    await userEvent.click(screen.getByRole("menuitem", { name: "Offer" }));

    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("works from the keyboard: Enter opens, arrows, Home and End move, Enter picks (AC-12)", async () => {
    const { button, onMove } = setup();
    button.focus();

    await userEvent.keyboard("{Enter}");
    expect(document.activeElement).toBe(items()[0]);
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(document.activeElement).toBe(items()[2]);
    await userEvent.keyboard("{End}");
    expect(document.activeElement).toBe(items()[6]);
    await userEvent.keyboard("{ArrowDown}");
    expect(document.activeElement).toBe(items()[0]);
    await userEvent.keyboard("{ArrowUp}");
    expect(document.activeElement).toBe(items()[6]);
    await userEvent.keyboard("{Home}{ArrowDown}{Enter}");

    expect(onMove).toHaveBeenCalledWith(app, "screening");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("is disabled while a save is pending", () => {
    const { button } = setup({ disabled: true });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
