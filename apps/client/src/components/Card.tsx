import type { Application } from "@job-tracker/shared";
import { formatDate, isOverdue } from "../lib/dates.ts";
import "./Card.css";

type CardProps = {
  application: Application;
  today: string;
  onOpen: (application: Application) => void;
};

export function Card({ application, today, onOpen }: CardProps) {
  const { companyName, jobTitle, nextStep, nextStepDue } = application;
  const overdue = nextStepDue !== null && isOverdue(nextStepDue, today);

  return (
    <button
      type="button"
      className="card"
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
