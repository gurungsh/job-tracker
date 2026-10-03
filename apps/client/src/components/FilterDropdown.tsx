import type { LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import "./FilterDropdown.css";

type FilterDropdownProps<T extends string> = {
  label: string;
  /** An icon shown in front of the label. */
  icon?: LucideIcon;
  options: readonly { value: T; label: string }[];
  selected: readonly T[];
  onChange: (selected: T[]) => void;
  /** What Deselect All does when clearing isn't allowed, such as the board's stages (spec 021, AC-7). */
  onDeselectAll?: () => void;
};

/** A button that opens a list of checkboxes, one per value (spec 012, AC-7, AC-8, AC-22), with a Select All / Deselect All button (spec 021, AC-5, AC-6). */
export function FilterDropdown<T extends string>({ label, icon: Icon, options, selected, onChange, onDeselectAll }: FilterDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();

  // A click anywhere else closes the list.
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

  const toggle = (value: T) => {
    // Keep the order of `options`, however the boxes are checked.
    const next = options.map((option) => option.value).filter((v) => (v === value ? !selected.includes(v) : selected.includes(v)));
    onChange(next);
  };

  const allSelected = options.every((option) => selected.includes(option.value));
  const toggleAll = () => {
    if (!allSelected) onChange(options.map((option) => option.value));
    else if (onDeselectAll) onDeselectAll();
    else onChange([]);
  };

  return (
    <div
      className="filter-dropdown"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        // Tabbing out of the list closes it. A click on a checkbox can report no related element in some browsers, so that is ignored here.
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={button}
        className="filter-dropdown-button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        {Icon && <Icon size={16} aria-hidden="true" />}
        {label}
        {selected.length > 0 && (
          <>
            {" "}
            <span className="filter-dropdown-count">{selected.length}</span>
          </>
        )}
      </button>
      {open && (
        <div className="filter-dropdown-list" id={listId} role="group" aria-label={label}>
          <button type="button" className="filter-dropdown-all" onClick={toggleAll}>
            {allSelected ? "Deselect All" : "Select All"}
          </button>
          {options.map((option) => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => {
                  toggle(option.value);
                }}
              />{" "}
              {option.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
