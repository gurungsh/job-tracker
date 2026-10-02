import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompanyAvatar } from "../../src/components/CompanyAvatar.tsx";
import { companyHue } from "../../src/lib/companyAvatar.ts";

function badge(name: string): HTMLElement {
  const { container } = render(<CompanyAvatar name={name} />);
  return container.querySelector<HTMLElement>(".company-avatar") as HTMLElement;
}

describe("CompanyAvatar (spec 011, AC-3, AC-5)", () => {
  it("shows the initials, hidden from screen readers because the name is written beside it", () => {
    const element = badge("Bank of America");

    expect(element.textContent).toBe("BA");
    expect(element.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes its hue from the name, the same for any capitals", () => {
    expect(badge("Acme Corp").style.getPropertyValue("--hue")).toBe(String(companyHue("Acme Corp")));
    expect(badge("ACME CORP").style.getPropertyValue("--hue")).toBe(badge("acme corp").style.getPropertyValue("--hue"));
  });
});
