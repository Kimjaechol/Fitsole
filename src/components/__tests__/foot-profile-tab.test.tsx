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

import { FootProfileTab } from "@/components/profile/foot-profile-tab";

describe("FootProfileTab", () => {
  it("renders empty state title", () => {
    render(<FootProfileTab />);
    expect(
      screen.getByText("아직 발 측정을 하지 않았어요")
    ).toBeInTheDocument();
  });

  it("renders CTA button text", () => {
    render(<FootProfileTab />);
    const elements = screen.getAllByText("발 측정 시작하기");
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it("CTA links to /scan", () => {
    render(<FootProfileTab />);
    const links = screen.getAllByRole("link");
    const scanLink = links.find((link) => link.getAttribute("href") === "/scan");
    expect(scanLink).toBeDefined();
    expect(scanLink).toHaveTextContent("발 측정 시작하기");
  });
});
