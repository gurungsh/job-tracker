import type { Application } from "@job-tracker/shared";
import { formatDate, isOverdue } from "../lib/dates.ts";
import "./Card.css";

type CardProps = {
  application: Application;
  today: string;
  onOpen: (application: Application) => void;
  /** Whether the card is being dragged right now (spec 006, AC-3). */
  dragging: boolean;
  /** False while a move is being saved. */
  draggable: boolean;
  onDragStart: (application: Application) => void;
  onDragEnd: () => void;
};

export function Card({ application, today, onOpen, dragging, draggable, onDragStart, onDragEnd }: CardProps) {
  const { companyName, jobTitle, nextStep, nextStepDue } = application;
  const overdue = nextStepDue !== null && isOverdue(nextStepDue, today);

  return (
    <button
      type="button"
      className={dragging ? "card card--dragging" : "card"}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        // Firefox won't start a drag without some data.
        event.dataTransfer.setData("text/plain", String(application.id));
        onDragStart(application);
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        onOpen(application);
      }}
    >
      <span className="card-company">{companyName}</span>
      <span className="card-title">{jobTitle}</span>
      {(nextStep ?? nextStepDue) && (
        <span className="card-next">
          {nextStep && <span className="card-next-step">{nextStep}</span>}
          {nextStepDue && (
            <span className={overdue ? "card-due card-due--overdue" : "card-due"}>
              {overdue && <strong>Overdue</strong>} {formatDate(nextStepDue)}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
