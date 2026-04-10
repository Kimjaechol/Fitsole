import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

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
    expect(
      screen.getByRole("heading", { level: 2, name: /측정 정확도/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /^배송$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /반품\/교환/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /^맞춤 인솔$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /^오프라인 매장$/ })
    ).toBeInTheDocument();
  });

  it("renders the page heading '자주 묻는 질문'", () => {
    render(<FAQPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /자주 묻는 질문/ })
    ).toBeInTheDocument();
  });

  it("renders Radix accordion triggers (data-state attribute present)", () => {
    const { container } = render(<FAQPage />);
    // Radix AccordionTrigger renders a <button> with data-state attribute.
    const triggers = container.querySelectorAll("button[data-state]");
    expect(triggers.length).toBeGreaterThanOrEqual(5);
  });
});

describe("/guarantee page (D-09)", () => {
  it("contains '90일 만족 보장' headline", () => {
    render(<GuaranteePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /90일 만족 보장/ })
    ).toBeInTheDocument();
  });

  it("mentions '90일' somewhere on the page", () => {
    render(<GuaranteePage />);
    expect(screen.getAllByText(/90일/).length).toBeGreaterThanOrEqual(1);
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
  it("contains '무료 재제작' as H1", () => {
    render(<RemakePolicyPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /무료 재제작/ })
    ).toBeInTheDocument();
  });

  it("describes the remake process steps", () => {
    render(<RemakePolicyPage />);
    // Process steps titles are h3 elements with unique section names.
    expect(
      screen.getByRole("heading", { level: 3, name: /^문의 접수$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: /^원인 분석$/ })
    ).toBeInTheDocument();
    // "재제작" appears multiple times — H1, section heading, step heading.
    expect(screen.getAllByText(/재제작/).length).toBeGreaterThanOrEqual(2);
  });
});
