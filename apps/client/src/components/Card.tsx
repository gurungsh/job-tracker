import type { Application, Stage } from "@job-tracker/shared";
import { Clock } from "lucide-react";
import type { DragEvent } from "react";
import { daysInStage, formatDate, isOverdue, shortTimeInStage } from "../lib/dates.ts";
import { jobSummary } from "../lib/jobSummary.ts";
import { compactSalary } from "../lib/salary.ts";
import { ArchiveButton } from "./ArchiveButton.tsx";
import { CardMenu } from "./CardMenu.tsx";
import { CompanyAvatar } from "./CompanyAvatar.tsx";
import "./Card.css";

type CardProps = {
  application: Application;
  today: string;
  onOpen: (application: Application) => void;
  /** Archives the application without opening it (spec 017, AC-2). */
  onArchive: (application: Application) => void;
  /** Moves the application to another stage from the card's menu (spec 018, AC-8). */
  onMove: (application: Application, stage: Stage) => void;
  /** Whether the card is being dragged right now (spec 006, AC-3). */
  dragging: boolean;
  /** False while a move is being saved. */
  draggable: boolean;
  /** Reports the card's height so the board can size the placeholder (spec 019, AC-2). */
  onDragStart: (application: Application, height: number) => void;
  onDragEnd: () => void;
};

/** Gives the browser a styled copy of the card to carry under the pointer (spec 019, AC-1). */
function showDragCopy(event: DragEvent<HTMLElement>) {
  // jsdom and some browsers have no setDragImage; they keep the default image.
  if (typeof event.dataTransfer.setDragImage !== "function") return;
  const card = event.currentTarget;
  const box = card.getBoundingClientRect();
  const copy = card.cloneNode(true) as HTMLElement;
  copy.classList.add("card-drag-image");
  copy.classList.remove("card--dragging");
  copy.style.width = `${String(box.width)}px`;
  document.body.appendChild(copy);
  event.dataTransfer.setDragImage(copy, event.clientX - box.left, event.clientY - box.top);
  // The browser takes its snapshot during the event, so the clone can go right after.
  setTimeout(() => {
    copy.remove();
  }, 0);
}

export function Card({ application, today, onOpen, onArchive, onMove, dragging, draggable, onDragStart, onDragEnd }: CardProps) {
  const { companyName, jobTitle, nextStep, nextStepDue } = application;
  const overdue = nextStepDue !== null && isOverdue(nextStepDue, today);
  const details = jobSummary(application);
  const pay = compactSalary(application.salaryMin, application.salaryMax, application.salaryPeriod);

  return (
    <div className="card-wrap">
    <button
      type="button"
      className={dragging ? "card card--dragging" : "card"}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        // Firefox won't start a drag without some data.
        event.dataTransfer.setData("text/plain", String(application.id));
        showDragCopy(event);
        onDragStart(application, event.currentTarget.getBoundingClientRect().height);
      }}
      onDragEnd={onDragEnd}
      onClick={() => {
        onOpen(application);
      }}
    >
      <span className="card-header">
        <CompanyAvatar name={companyName} />
        <span className="card-company">{companyName}</span>
      </span>
      <span className="card-title">{jobTitle}</span>
      {details && <span className="card-details">{details}</span>}
      {pay && <span className="card-pay">{pay}</span>}
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
      <span className="card-footer">
        <span className="card-age" title="Time in this stage">
          <Clock size={14} aria-hidden="true" /> {shortTimeInStage(daysInStage(application.stageChangedAt))}
        </span>
      </span>
    </button>
    <CardMenu application={application} onMove={onMove} disabled={!draggable} />
    <ArchiveButton application={application} onClick={onArchive} />
    </div>
  );
}
