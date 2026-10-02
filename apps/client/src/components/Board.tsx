import { type Application, type Company, STAGE_LABELS, STAGES, isClosedStage } from "@job-tracker/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { ApplicationPanel } from "./ApplicationPanel.tsx";
import { Card } from "./Card.tsx";
import { localToday } from "../lib/dates.ts";
import "./Board.css";

type Loaded = { applications: Application[]; companies: Company[] };
type LoadState = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Loaded);

export function Board() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // The side panel: closed, adding, or editing one application.
  const [panel, setPanel] = useState<{ application?: Application } | null>(null);
  // Bumped to load the board again, for example after a save.
  const [loadCount, setLoadCount] = useState(0);
  const reload = useCallback(() => {
    setLoadCount((count) => count + 1);
  }, []);
  const closePanel = useCallback(() => {
    setPanel(null);
  }, []);

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

  if (state.status === "loading") return <p className="board-status">Loading…</p>;

  if (state.status === "error") {
    return (
      <div className="board-status" role="alert">
        <p>Couldn't load your applications. {state.message}</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: "loading" });
            reload();
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const today = localToday();
  const openApplication = (application: Application) => {
    setPanel({ application });
  };

  return (
    <>
      <div className="board-toolbar">
        <button
          type="button"
          className="primary"
          onClick={() => {
            setPanel({});
          }}
        >
          Add application
        </button>
      </div>
      {state.applications.length === 0 && (
        <p className="board-empty">No applications yet. Add your first one to get started.</p>
      )}
      <div className="board">
        {STAGES.map((stage) => {
          // The server sends applications already in board order (spec 002, AC-4).
          const cards = state.applications.filter((application) => application.stage === stage);
          const label = STAGE_LABELS[stage];
          return (
            <section
              key={stage}
              aria-label={label}
              className={isClosedStage(stage) ? "column column--closed" : "column"}
            >
              <h2 className="column-header">
                <span>{label}</span> <span className="column-count">{cards.length}</span>
              </h2>
              <div className="column-cards">
                {cards.map((application) => (
                  <Card key={application.id} application={application} today={today} onOpen={openApplication} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
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
