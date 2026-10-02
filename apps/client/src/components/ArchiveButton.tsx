import type { Application } from "@job-tracker/shared";
import { Archive, ArchiveRestore } from "lucide-react";
import "./ArchiveButton.css";

/**
 * The icon button on a card or a row that archives an application, or restores it in the Archived view (spec 017, AC-2,
 * AC-5). It has no text, so it is named for the application it acts on, and shows a one-word label on hover and focus.
 */
export function ArchiveButton({
  application,
  restore = false,
  onClick,
}: {
  application: Application;
  restore?: boolean;
  onClick: (application: Application) => void;
}) {
  const verb = restore ? "Restore" : "Archive";
  const Icon = restore ? ArchiveRestore : Archive;
  return (
    <button
      type="button"
      className="icon-button archive-button"
      aria-label={`${verb}: ${application.jobTitle} at ${application.companyName}`}
      data-tip={verb}
      data-tip-end=""
      onClick={(event) => {
        // The card or row opens the application too, and this keeps it from doing so.
        event.stopPropagation();
        onClick(application);
      }}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
