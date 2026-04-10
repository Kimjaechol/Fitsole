import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import { SiteFooter } from "@/components/layout/site-footer";

describe("SiteFooter (D-09)", () => {
  it("renders '90일 만족 보장' badge", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/90일 만족 보장/)).toBeInTheDocument();
  });

  it("links the 90-day guarantee badge to /guarantee", () => {
    const { container } = render(<SiteFooter />);
    const guaranteeLinks = Array.from(container.querySelectorAll("a")).filter(
      (a) => a.getAttribute("href") === "/guarantee"
    );
    expect(guaranteeLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders navigation links to /faq, /guarantee, /remake-policy, /support", () => {
    const { container } = render(<SiteFooter />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain("/faq");
    expect(hrefs).toContain("/guarantee");
    expect(hrefs).toContain("/remake-policy");
    expect(hrefs).toContain("/support");
  });

  it("renders the /stores/gangnam link per CONTEXT.md", () => {
    const { container } = render(<SiteFooter />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain("/stores/gangnam");
  });
});
