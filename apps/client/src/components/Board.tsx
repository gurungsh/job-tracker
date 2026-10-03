import { type Application, STAGE_LABELS, STAGES, type Stage, isClosedStage } from "@job-tracker/shared";
import { Fragment, useState } from "react";
import { api } from "../lib/api.ts";
import { applicationToInput, boardIndex } from "../lib/applicationInput.ts";
import { useArchiveActions } from "../lib/useArchiveActions.ts";
import { STAGE_ICONS } from "../lib/stageIcons.ts";
import { useApplicationsContext } from "../lib/useApplications.tsx";
import { useBoardStages } from "../lib/useBoardStages.ts";
import { useOpenApplication } from "../lib/useOpenApplication.ts";
import { Card } from "./Card.tsx";
import { FilterDropdown } from "./FilterDropdown.tsx";
import { localToday } from "../lib/dates.ts";
import "./Board.css";

export function Board() {
  const { applications, replaceApplication } = useApplicationsContext();
  const openApplication = useOpenApplication();
  const { archive, error: archiveError, dismissError } = useArchiveActions();
  // Drag and drop (spec 006): the card being dragged, the column it's over, applications being saved, and the last failure.
  const [dragging, setDragging] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  // The dragged card's height, so the placeholder is the size of the card (spec 019, AC-2).
  const [dragHeight, setDragHeight] = useState(0);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  // Says where a card went when it left the board for a hidden stage (spec 018, AC-9).
  const [notice, setNotice] = useState<string | null>(null);
  // The stages the board shows, remembered in the browser (spec 018, AC-1, AC-5).
  const [shownStages, setShownStages, resetShownStages] = useBoardStages();

  // Moves a card now and saves it, putting it back if the save fails (spec 006, AC-1, AC-5).
  // Resolves to whether the save worked, so a caller can say where the card went (spec 018, AC-9).
  const moveApplication = (application: Application, stage: Stage): Promise<boolean> => {
    setMoveError(null);
    setNotice(null);
    setPendingIds((ids) => [...ids, application.id]);
    replaceApplication({ ...application, stage });
    return api
      .updateApplication(application.id, applicationToInput(application, { stage }))
      .then(
        (saved) => {
          replaceApplication(saved);
          return true;
        },
        (error: unknown) => {
          replaceApplication(application);
          const reason = error instanceof Error ? error.message : String(error);
          setMoveError(`Couldn't move ${application.jobTitle} to ${STAGE_LABELS[stage]}. ${reason}`);
          return false;
        },
      )
      .finally(() => {
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
      {(moveError ?? archiveError) && (
        <div className="board-error" role="alert">
          <span>{moveError ?? archiveError}</span>
          <button
            type="button"
            onClick={() => {
              setMoveError(null);
              dismissError();
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {notice && (
        <div className="board-notice" role="status">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => {
              setNotice(null);
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      {applications.length === 0 && (
        <p className="board-empty">No applications yet. Use the Add application button in the sidebar to add your first one.</p>
      )}
      <div className="board-filters">
        <FilterDropdown
          label="Stages"
          options={STAGES.map((stage) => ({ value: stage, label: STAGE_LABELS[stage] }))}
          selected={shownStages}
          onChange={setShownStages}
          onDeselectAll={resetShownStages}
        />
      </div>
      <div className="board">
        {shownStages.map((stage) => {
          // The server sends applications already in board order (spec 002, AC-4).
          const cards = applications.filter((application) => application.stage === stage);
          const label = STAGE_LABELS[stage];
          // Where the dragged card would land in this column, while it is over it (spec 019, AC-2, AC-3).
          const slot = overStage === stage && draggedApplication ? boardIndex(cards, draggedApplication) : -1;
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
                if (draggedApplication) void moveApplication(draggedApplication, stage);
              }}
            >
              <h2 className="column-header">
                <span className="column-title">
                  <StageIcon size={16} aria-hidden="true" /> <span>{label}</span>
                </span>{" "}
                <span className="column-count">{cards.length}</span>
              </h2>
              <div className="column-cards">
                {cards.map((application, index) => (
                  <Fragment key={application.id}>
                  {index === slot && <div className="card-placeholder" aria-hidden="true" style={{ height: dragHeight }} />}
                  <Card
                    application={application}
                    today={today}
                    onOpen={openApplication}
                    onArchive={archive}
                    onMove={(moved, stage) => {
                      void moveApplication(moved, stage).then((saved) => {
                        if (saved && !shownStages.includes(stage)) {
                          setNotice(`Moved ${moved.jobTitle} to ${STAGE_LABELS[stage]}.`);
                        }
                      });
                    }}
                    dragging={dragging === application.id}
                    draggable={!pendingIds.includes(application.id)}
                    onDragStart={(dragged, height) => {
                      setDragging(dragged.id);
                      setDragHeight(height);
                    }}
                    onDragEnd={endDrag}
                  />
                  </Fragment>
                ))}
                {slot === cards.length && <div className="card-placeholder" aria-hidden="true" style={{ height: dragHeight }} />}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
