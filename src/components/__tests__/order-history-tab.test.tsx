import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { OrderHistoryTab } from "@/components/profile/order-history-tab";

describe("OrderHistoryTab", () => {
  it("renders empty state title", () => {
    render(<OrderHistoryTab />);
    expect(
      screen.getByText("아직 주문 내역이 없어요")
    ).toBeInTheDocument();
  });

  it("renders CTA button text", () => {
    render(<OrderHistoryTab />);
    const elements = screen.getAllByText("상품 둘러보기");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("CTA links to /catalog", () => {
    render(<OrderHistoryTab />);
    const links = screen.getAllByRole("link");
    const catalogLink = links.find((link) => link.getAttribute("href") === "/catalog");
    expect(catalogLink).toBeDefined();
    expect(catalogLink).toHaveTextContent("상품 둘러보기");
  });

  it("renders disabled reorder button", () => {
    render(<OrderHistoryTab />);
    const elements = screen.getAllByText("이전 측정 데이터로 재주문");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("reorder button is disabled (aria-disabled)", () => {
    render(<OrderHistoryTab />);
    const links = screen.getAllByRole("link");
    const reorderLink = links.find(
      (link) => link.textContent?.includes("이전 측정 데이터로 재주문")
    );
    expect(reorderLink).toBeDefined();
    expect(reorderLink).toHaveAttribute("aria-disabled", "true");
  });
});
