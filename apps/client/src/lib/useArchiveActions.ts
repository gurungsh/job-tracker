import type { Application } from "@job-tracker/shared";
import { useCallback, useState } from "react";
import { api } from "./api.ts";
import { useApplicationsStore } from "./useApplications.tsx";

/**
 * Archives and restores applications from a card, a row, or the page, showing the change at once and putting it back with
 * a message if the save fails (spec 017, AC-2, AC-5).
 */
export function useArchiveActions() {
  const { replaceApplication } = useApplicationsStore();
  const [error, setError] = useState<string | null>(null);

  const change = useCallback(
    (application: Application, archived: boolean) => {
      setError(null);
      replaceApplication({ ...application, archivedAt: archived ? new Date().toISOString() : null });
      const saved = archived ? api.archiveApplication(application.id) : api.restoreApplication(application.id);
      saved.then(replaceApplication, (failure: unknown) => {
        replaceApplication(application);
        const reason = failure instanceof Error ? failure.message : String(failure);
        setError(`Couldn't ${archived ? "archive" : "restore"} ${application.jobTitle}. ${reason}`);
      });
    },
    [replaceApplication],
  );

  const archive = useCallback((application: Application) => {
    change(application, true);
  }, [change]);
  const restore = useCallback((application: Application) => {
    change(application, false);
  }, [change]);
  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return { archive, restore, error, dismissError };
}
