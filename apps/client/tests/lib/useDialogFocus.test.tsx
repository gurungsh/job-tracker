import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useDialogFocus } from "../../src/lib/useDialogFocus.ts";

function Dialog({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  const props = useDialogFocus<HTMLDivElement>();
  return (
    <div role="dialog" aria-label="Test dialog" {...props}>
      <button type="button">First</button>
      <button type="button" disabled>
        Disabled
      </button>
      <button type="button" onClick={onClose}>
        Last
      </button>
      {children}
    </div>
  );
}

function Page() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      <button type="button">Behind</button>
      {open && (
        <Dialog
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

describe("useDialogFocus (spec 013, AC-16)", () => {
  it("moves focus into the dialog when it opens, and back to the opener when it closes", async () => {
    render(<Page />);
    const opener = screen.getByRole("button", { name: "Open" });

    await userEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));

    await userEvent.click(screen.getByRole("button", { name: "Last" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("wraps Tab and Shift+Tab inside the dialog, skipping disabled controls", async () => {
    render(<Page />);
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Last" }));
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Last" }));
  });

  it("leaves focus alone when something inside already has it", () => {
    function Autofocus() {
      const props = useDialogFocus<HTMLDivElement>();
      return (
        <div role="dialog" aria-label="Autofocus" {...props}>
          <button type="button">One</button>
          <input aria-label="Name" autoFocus />
        </div>
      );
    }
    render(<Autofocus />);

    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
  });

  it("keeps a dialog on top of another dialog trapping focus on its own", async () => {
    function Stack() {
      return (
        <>
          <Dialog onClose={() => undefined} />
          <div role="alertdialog">
            <Inner />
          </div>
        </>
      );
    }
    function Inner() {
      const props = useDialogFocus<HTMLDivElement>();
      return (
        <div {...props} aria-label="Inner">
          <button type="button">Cancel</button>
          <button type="button">Confirm</button>
        </div>
      );
    }
    render(<Stack />);

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
    await userEvent.tab();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });
});
