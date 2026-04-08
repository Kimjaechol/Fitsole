import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  },
}));

import LandingPage from "@/app/(main)/page";

describe("Landing Page", () => {
  it("renders hero headline", () => {
    render(<LandingPage />);
    expect(
      screen.getByText("당신의 발에 꼭 맞는 인솔, 과학이 설계합니다")
    ).toBeInTheDocument();
  });

  it("renders primary CTA button", () => {
    render(<LandingPage />);
    const ctaElements = screen.getAllByText("내 발에 맞는 신발 찾기");
    expect(ctaElements.length).toBeGreaterThanOrEqual(1);
  });

  it("renders all 3 value column titles", () => {
    render(<LandingPage />);
    expect(screen.getAllByText("정밀 발 측정").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("맞춤 인솔 설계").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("완벽한 착용감").length).toBeGreaterThanOrEqual(1);
  });

  it("renders all 3 process steps", () => {
    render(<LandingPage />);
    // "발 측정" also appears as substring in value column "정밀 발 측정"
    // process step labels are standalone text nodes
    const scanTexts = screen.getAllByText("발 측정");
    expect(scanTexts.length).toBeGreaterThanOrEqual(1);
    const designTexts = screen.getAllByText("인솔 설계");
    expect(designTexts.length).toBeGreaterThanOrEqual(1);
    const deliveryTexts = screen.getAllByText("배송 완료");
    expect(deliveryTexts.length).toBeGreaterThanOrEqual(1);
  });

  it("renders bottom CTA", () => {
    render(<LandingPage />);
    const ctaElements = screen.getAllByText("지금 시작하기");
    expect(ctaElements.length).toBeGreaterThanOrEqual(1);
  });
});
