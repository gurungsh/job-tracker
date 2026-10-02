import { type ReactNode, useId } from "react";
import "./SectionCard.css";

type SectionCardProps = {
  title: string;
  /** Something at the right of the heading, such as a "+ Add" button. */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * One box on an application's page: a bordered card with a small uppercase heading (spec 016, AC-1). It is a region
 * named by its heading, so screen readers and tests find each box by its title.
 */
export function SectionCard({ title, action, className, children }: SectionCardProps) {
  const id = useId();
  return (
    <section className={className ? `section-card ${className}` : "section-card"} aria-labelledby={id}>
      <header className="section-card-header">
        <h3 id={id}>{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}
