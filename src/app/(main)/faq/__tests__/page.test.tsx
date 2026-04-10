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

import FAQPage from "@/app/(main)/faq/page";
import GuaranteePage from "@/app/(main)/guarantee/page";
import RemakePolicyPage from "@/app/(main)/remake-policy/page";

describe("/faq page (D-07)", () => {
  it("renders all 5 required section titles", () => {
    render(<FAQPage />);
    expect(screen.getByText(/측정 정확도/)).toBeInTheDocument();
    expect(screen.getByText(/배송/)).toBeInTheDocument();
    expect(screen.getByText(/반품\/교환/)).toBeInTheDocument();
    expect(screen.getByText(/맞춤 인솔/)).toBeInTheDocument();
    expect(screen.getByText(/오프라인 매장/)).toBeInTheDocument();
  });

  it("renders the page heading '자주 묻는 질문'", () => {
    render(<FAQPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /자주 묻는 질문/
    );
  });

  it("renders at least one accordion trigger element with Radix semantics", () => {
    const { container } = render(<FAQPage />);
    // Radix AccordionTrigger renders a <button> with data-state attribute.
    const triggers = container.querySelectorAll("[data-state]");
    expect(triggers.length).toBeGreaterThanOrEqual(5);
  });
});

describe("/guarantee page (D-09)", () => {
  it("contains '90일' and '만족 보장'", () => {
    render(<GuaranteePage />);
    expect(screen.getByText(/90일/)).toBeInTheDocument();
    expect(screen.getAllByText(/만족 보장/).length).toBeGreaterThanOrEqual(1);
  });

  it("links to /support and /remake-policy", () => {
    const { container } = render(<GuaranteePage />);
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain("/support");
    expect(hrefs).toContain("/remake-policy");
  });
});

describe("/remake-policy page (D-10)", () => {
  it("contains '무료 재제작'", () => {
    render(<RemakePolicyPage />);
    expect(screen.getByText(/무료 재제작/)).toBeInTheDocument();
  });

  it("describes the remake process steps", () => {
    render(<RemakePolicyPage />);
    expect(screen.getByText(/문의 접수/)).toBeInTheDocument();
    expect(screen.getByText(/원인 분석/)).toBeInTheDocument();
    expect(screen.getByText(/재제작/)).toBeInTheDocument();
  });
});
