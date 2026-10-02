import type { Application, Company } from "@job-tracker/shared";
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router";
import { api } from "./api.ts";
import { sortForBoard } from "./applicationInput.ts";

type Loaded = { applications: Application[]; companies: Company[] };
export type LoadState = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded);

/** Loads the applications and companies, for the whole app to share (spec 012, AC-15, AC-17, and spec 014, AC-3). */
function useApplications() {
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

  // Takes one application out of the loaded list, after it is deleted.
  const removeApplication = useCallback((id: number) => {
    setState((current) =>
      current.status === "ready"
        ? { ...current, applications: current.applications.filter((a) => a.id !== id) }
        : current,
    );
  }, []);

  return useMemo(
    () => ({ state, reload, retry, replaceApplication, removeApplication }),
    [state, reload, retry, replaceApplication, removeApplication],
  );
}

type ApplicationsStore = ReturnType<typeof useApplications>;

const StoreContext = createContext<ApplicationsStore | null>(null);

/**
 * Holds the one list of applications for the whole app, so the board, the table, an application's page, and the
 * sidebar's counts all read and change the same one (spec 014, AC-3).
 */
export function ApplicationsProvider({ children }: { children: ReactNode }) {
  return <StoreContext value={useApplications()}>{children}</StoreContext>;
}

export function useApplicationsStore(): ApplicationsStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useApplicationsStore needs an ApplicationsProvider around it");
  return store;
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
