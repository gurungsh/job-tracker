import type { CSSProperties } from "react";
import { companyHue, companyInitials } from "../lib/companyAvatar.ts";
import "./CompanyAvatar.css";

/** The company's initials on a color taken from its name. Decorative: the name is written next to it (spec 011, AC-3, AC-5). */
export function CompanyAvatar({ name }: { name: string }) {
  return (
    <span className="company-avatar" style={{ "--hue": companyHue(name) } as CSSProperties} aria-hidden="true">
      {companyInitials(name)}
    </span>
  );
}
