import type { Application } from "@job-tracker/shared";
import { useCallback, useState } from "react";
import { Outlet } from "react-router";
import { type ApplicationsContext, useApplications } from "../lib/useApplications.ts";
import { ApplicationPanel } from "./ApplicationPanel.tsx";
import { ViewSwitch } from "./ViewSwitch.tsx";
import "./Board.css";

/** Loads the applications once for the board and the table, and owns the side panel they both open. */
export function ApplicationsPage() {
  const { state, reload, retry, replaceApplication } = useApplications();
  // The side panel: closed, adding, or editing one application.
  const [panel, setPanel] = useState<{ application?: Application } | null>(null);
  const openPanel = useCallback((application?: Application) => {
    setPanel(application ? { application } : {});
  }, []);
  const closePanel = useCallback(() => {
    setPanel(null);
  }, []);

  if (state.status === "loading") return <p className="board-status">Loading…</p>;
  if (state.status === "error") {
    return (
      <div className="board-status" role="alert">
        <p>Couldn't load your applications. {state.message}</p>
        <button type="button" onClick={retry}>
          Try again
        </button>
      </div>
    );
  }

  const context: ApplicationsContext = {
    applications: state.applications,
    replaceApplication,
    panelApplicationId: panel?.application?.id,
    openPanel,
    closePanel,
  };

  return (
    <>
      <div className="view-bar">
        <ViewSwitch />
      </div>
      <Outlet context={context} />
      {panel && (
        <ApplicationPanel
          key={panel.application?.id ?? "new"}
          application={panel.application}
          companies={state.companies}
          onSaved={() => {
            setPanel(null);
            reload();
          }}
          onDeleted={() => {
            setPanel(null);
            reload();
          }}
          onClose={closePanel}
        />
      )}
    </>
  );
}
