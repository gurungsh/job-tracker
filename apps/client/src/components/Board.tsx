import { type Application, STAGE_LABELS, STAGES, type Stage, isClosedStage } from "@job-tracker/shared";
import { useState } from "react";
import { api } from "../lib/api.ts";
import { applicationToInput } from "../lib/applicationInput.ts";
import { STAGE_ICONS } from "../lib/stageIcons.ts";
import { useApplicationsContext } from "../lib/useApplications.tsx";
import { useOpenApplication } from "../lib/useOpenApplication.ts";
import { Card } from "./Card.tsx";
import { localToday } from "../lib/dates.ts";
import "./Board.css";

export function Board() {
  const { applications, replaceApplication } = useApplicationsContext();
  const openApplication = useOpenApplication();
  // Drag and drop (spec 006): the card being dragged, the column it's over, applications being saved, and the last failure.
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Moves a card now and saves it, putting it back if the save fails (spec 006, AC-1, AC-5).
  const moveApplication = (application: Application, stage: Stage) => {
    setMoveError(null);
    setPendingIds((ids) => [...ids, application.id]);
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

  const today = localToday();
  const draggedApplication = applications.find((a) => a.id === dragging);
  // Only a card from this board, over another column, can be dropped (AC-3, AC-4).
  const canDropOn = (stage: Stage) => draggedApplication !== undefined && draggedApplication.stage !== stage;
  const endDrag = () => {
    setDragging(null);
    setOverStage(null);
  };

  return (
    <>
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
      {applications.length === 0 && (
        <p className="board-empty">No applications yet. Use the Add application button in the sidebar to add your first one.</p>
      )}
      <div className="board">
        {STAGES.map((stage) => {
          // The server sends applications already in board order (spec 002, AC-4).
          const cards = applications.filter((application) => application.stage === stage);
          const label = STAGE_LABELS[stage];
          const StageIcon = STAGE_ICONS[stage];
          return (
            <section
              key={stage}
              aria-label={label}
              data-stage={stage}
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
                <span className="column-title">
                  <StageIcon size={16} aria-hidden="true" /> <span>{label}</span>
                </span>{" "}
                <span className="column-count">{cards.length}</span>
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
    </>
  );
}
