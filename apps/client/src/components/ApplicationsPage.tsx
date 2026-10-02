import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { type ApplicationsContext, useApplicationsStore } from "../lib/useApplications.tsx";
import { ApplicationDialog } from "./ApplicationDialog.tsx";
import { ViewSwitch } from "./ViewSwitch.tsx";
import "./Board.css";

/** Loads the applications once for the board and the table, and owns the dialog for adding an application. */
export function ApplicationsPage() {
  const { state, reload, retry, replaceApplication } = useApplicationsStore();
  // The list now outlives the views. Coming back to one after it was loaded asks for it again, quietly, with the old
  // list still showing, so a change made elsewhere shows up as it did before the list was shared (spec 014, plan).
  const loadedOnMount = useRef(state.status === "ready");
  useEffect(() => {
    if (loadedOnMount.current) reload();
  }, [reload]);
  const [adding, setAdding] = useState(false);
  const openAdd = useCallback(() => {
    setAdding(true);
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

  const context: ApplicationsContext = { applications: state.applications, replaceApplication, openAdd };

  return (
    <>
      <div className="view-bar">
        <ViewSwitch />
      </div>
      <Outlet context={context} />
      {adding && (
        <ApplicationDialog
          companies={state.companies}
          onSaved={() => {
            setAdding(false);
            reload();
          }}
          onClose={() => {
            setAdding(false);
          }}
        />
      )}
    </>
  );
}
