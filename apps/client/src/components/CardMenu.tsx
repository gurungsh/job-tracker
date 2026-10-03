import { type Application, STAGE_LABELS, STAGES, type Stage } from "@job-tracker/shared";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { STAGE_ICONS } from "../lib/stageIcons.ts";
import "./CardMenu.css";

type CardMenuProps = {
  application: Application;
  /** Moves the application to the stage picked (spec 018, AC-8). */
  onMove: (application: Application, stage: Stage) => void;
  /** True while a move is being saved. */
  disabled?: boolean;
};

/**
 * The "⋯" button on a card, with a "Move to" list of the other stages (spec 018, AC-7, AC-10, AC-11, AC-12). It sits
 * beside the card, not inside it, so it can't open the application or start a drag.
 */
export function CardMenu({ application, onMove, disabled = false }: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();
  const stages = STAGES.filter((stage) => stage !== application.stage);

  // Opening puts focus on the first stage.
  useEffect(() => {
    if (open) items.current[0]?.focus();
  }, [open]);

  // A click anywhere else closes the menu.
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => {
      document.removeEventListener("mousedown", close);
    };
  }, [open]);

  const closeAndFocusButton = () => {
    setOpen(false);
    button.current?.focus();
  };

  const focusItem = (index: number) => {
    items.current[(index + stages.length) % stages.length]?.focus();
  };

  const onMenuKeyDown = (event: React.KeyboardEvent) => {
    const current = items.current.findIndex((item) => item === document.activeElement);
    switch (event.key) {
      case "ArrowDown":
        focusItem(current + 1);
        break;
      case "ArrowUp":
        focusItem(current - 1);
        break;
      case "Home":
        focusItem(0);
        break;
      case "End":
        focusItem(stages.length - 1);
        break;
      case "Escape":
        event.stopPropagation();
        closeAndFocusButton();
        break;
      case "Tab":
        closeAndFocusButton();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className="card-menu" ref={root}>
      <button
        type="button"
        ref={button}
        className="icon-button card-menu-button"
        aria-label={`Move: ${application.jobTitle} at ${application.companyName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        disabled={disabled}
        onClick={(event) => {
          // The card is a sibling, but a click here must never reach anything that opens the application.
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="card-menu-list" id={menuId} role="menu" aria-label="Move to" onKeyDown={onMenuKeyDown}>
          <div className="card-menu-heading" aria-hidden="true">
            Move to
          </div>
          {stages.map((stage, index) => {
            const StageIcon = STAGE_ICONS[stage];
            return (
              <button
                key={stage}
                type="button"
                role="menuitem"
                data-stage={stage}
                ref={(element) => {
                  items.current[index] = element;
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setOpen(false);
                  onMove(application, stage);
                }}
              >
                <StageIcon size={16} aria-hidden="true" /> {STAGE_LABELS[stage]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
