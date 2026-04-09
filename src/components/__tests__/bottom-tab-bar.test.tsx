import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

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

import { BottomTabBar } from "@/components/layout/bottom-tab-bar";

describe("BottomTabBar", () => {
  it("renders 4 tab labels", () => {
    render(<BottomTabBar />);
    expect(screen.getByText("홈")).toBeInTheDocument();
    expect(screen.getByText("상품")).toBeInTheDocument();
    expect(screen.getByText("측정")).toBeInTheDocument();
    expect(screen.getByText("마이")).toBeInTheDocument();
  });

  it("renders links to correct routes", () => {
    render(<BottomTabBar />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/catalog");
    expect(hrefs).toContain("/scan");
    expect(hrefs).toContain("/mypage");
  });
});
