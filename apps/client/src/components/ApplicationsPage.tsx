import { useEffect, useRef } from "react";
import { Outlet } from "react-router";
import { type ApplicationsContext, useApplicationsStore } from "../lib/useApplications.tsx";
import { ViewSwitch } from "./ViewSwitch.tsx";
import "./Board.css";

/** Shows the board or the table, with the loading and error states for the list they share. */
export function ApplicationsPage() {
  const { state, reload, retry, replaceApplication } = useApplicationsStore();
  // The list now outlives the views. Coming back to one after it was loaded asks for it again, quietly, with the old
  // list still showing, so a change made elsewhere shows up as it did before the list was shared (spec 014, plan).
  const loadedOnMount = useRef(state.status === "ready");
  useEffect(() => {
    if (loadedOnMount.current) reload();
  }, [reload]);

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

  const context: ApplicationsContext = { applications: state.applications, replaceApplication };

  return (
    <>
      <div className="view-bar">
        <ViewSwitch />
      </div>
      <Outlet context={context} />
    </>
  );
}
