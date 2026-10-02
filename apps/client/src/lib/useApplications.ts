import type { Application, Company } from "@job-tracker/shared";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { api } from "./api.ts";
import { sortForBoard } from "./applicationInput.ts";

type Loaded = { applications: Application[]; companies: Company[] };
export type LoadState = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded);

/** Loads the applications and companies, for the board and the table to share (spec 012, AC-15, AC-17). */
export function useApplications() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // Bumped to load again, for example after a save.
  const [loadCount, setLoadCount] = useState(0);
  const reload = useCallback(() => {
    setLoadCount((count) => count + 1);
  }, []);
  const retry = useCallback(() => {
    setState({ status: "loading" });
    reload();
  }, [reload]);

  useEffect(() => {
    let current = true;
    Promise.all([api.listApplications(), api.listCompanies()]).then(
      ([applications, companies]) => {
        if (current) setState({ status: "ready", applications, companies });
      },
      (error: unknown) => {
        if (current) setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [loadCount]);

  // Swaps one application in the loaded list, keeping board order.
  const replaceApplication = useCallback((replacement: Application) => {
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            applications: sortForBoard(current.applications.map((a) => (a.id === replacement.id ? replacement : a))),
          }
        : current,
    );
  }, []);

  return { state, reload, retry, replaceApplication };
}

/** What the applications page hands to the board and the table. */
export type ApplicationsContext = {
  applications: Application[];
  replaceApplication: (replacement: Application) => void;
  /** Opens the dialog for adding an application (spec 013, AC-13). */
  openAdd: () => void;
};

export function useApplicationsContext(): ApplicationsContext {
  return useOutletContext<ApplicationsContext>();
}
