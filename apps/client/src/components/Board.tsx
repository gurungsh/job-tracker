import { type Application, type Company, STAGE_LABELS, STAGES, type Stage, isClosedStage } from "@job-tracker/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api.ts";
import { applicationToInput, sortForBoard } from "../lib/applicationInput.ts";
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
  // Drag and drop (spec 006): the card being dragged, the column it's over, applications being saved, and the last failure.
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);

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

  // Swaps one application in the loaded board, keeping board order.
  const replaceApplication = (replacement: Application) => {
    setState((current) =>
      current.status === "ready"
        ? {
            ...current,
            applications: sortForBoard(current.applications.map((a) => (a.id === replacement.id ? replacement : a))),
          }
        : current,
    );
  };

  // Moves a card now and saves it, putting it back if the save fails (spec 006, AC-1, AC-5).
  const moveApplication = (application: Application, stage: Stage) => {
    setMoveError(null);
    setPendingIds((ids) => [...ids, application.id]);
    if (panel?.application?.id === application.id) setPanel(null);
    replaceApplication({ ...application, stage });
    api.updateApplication(application.id, applicationToInput(application, { stage })).then(
      (saved) => {
        replaceApplication(saved);
      },
      (error: unknown) => {
        replaceApplication(application);
        const reason = error instanceof Error ? error.message : String(error);
        setMoveError(`Couldn't move ${application.jobTitle} to ${STAGE_LABELS[stage]}. ${reason}`);
      },
    ).finally(() => {
      setPendingIds((ids) => ids.filter((id) => id !== application.id));
    });
  };

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
  const draggedApplication = state.applications.find((a) => a.id === dragging);
  // Only a card from this board, over another column, can be dropped (AC-3, AC-4).
  const canDropOn = (stage: Stage) => draggedApplication !== undefined && draggedApplication.stage !== stage;
  const endDrag = () => {
    setDragging(null);
    setOverStage(null);
  };
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
      {moveError && (
        <div className="board-error" role="alert">
          <span>{moveError}</span>
          <button
            type="button"
            onClick={() => {
              setMoveError(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
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
              className={[
                "column",
                isClosedStage(stage) && "column--closed",
                overStage === stage && "column--drop-target",
              ]
                .filter(Boolean)
                .join(" ")}
              onDragOver={(event) => {
                if (!canDropOn(stage)) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOverStage(stage);
              }}
              onDragLeave={(event) => {
                // Moving between a column's children also fires this. Only clear when leaving the column itself.
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setOverStage((current) => (current === stage ? null : current));
                }
              }}
              onDrop={(event) => {
                if (!canDropOn(stage)) return;
                event.preventDefault();
                endDrag();
                if (draggedApplication) moveApplication(draggedApplication, stage);
              }}
            >
              <h2 className="column-header">
                <span>{label}</span> <span className="column-count">{cards.length}</span>
              </h2>
              <div className="column-cards">
                {cards.map((application) => (
                  <Card
                    key={application.id}
                    application={application}
                    today={today}
                    onOpen={openApplication}
                    dragging={dragging === application.id}
                    draggable={!pendingIds.includes(application.id)}
                    onDragStart={(dragged) => {
                      setDragging(dragged.id);
                    }}
                    onDragEnd={endDrag}
                  />
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
