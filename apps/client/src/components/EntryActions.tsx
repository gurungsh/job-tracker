import { Pencil, X } from "lucide-react";
import "./EntryActions.css";

const NAME_MAX = 40;

type EntryActionsProps = {
  /** What the entry is, such as "requirement", "entry", or "contact". It names both buttons for screen readers. */
  what: string;
  /** The entry's text or name, cut short to name the buttons. */
  text: string;
  onEdit: () => void;
  onDelete: () => void;
};

/**
 * The two controls every requirement, timeline entry, and person has: a pencil that edits and a ✕ that deletes (spec 016,
 * AC-4). Neither has text, so each is named for what it acts on, and shows a one-word label on hover and on keyboard
 * focus. Asking before deleting is left to the box that owns the entry.
 */
export function EntryActions({ what, text, onEdit, onDelete }: EntryActionsProps) {
  const short = text.length > NAME_MAX ? `${text.slice(0, NAME_MAX).trimEnd()}…` : text;
  return (
    <span className="entry-actions">
      <button
        type="button"
        className="icon-button icon-button--edit"
        aria-label={`Edit ${what}: ${short}`}
        data-tip="Edit"
        onClick={onEdit}
      >
        <Pencil size={16} aria-hidden="true" />
      </button>
      {/* The last button in the row opens its label toward the left, so the card's edge never cuts it off. */}
      <button
        type="button"
        className="icon-button"
        aria-label={`Delete ${what}: ${short}`}
        data-tip="Delete"
        data-tip-end=""
        onClick={onDelete}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </span>
  );
}
