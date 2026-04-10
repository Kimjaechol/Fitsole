import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Next/link → plain anchor for jsdom.
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

import HealthSegmentPage from "@/app/(main)/segment/health/page";

describe("/segment/health page (D-04)", () => {
  it("renders all four locked condition labels", () => {
    render(<HealthSegmentPage />);
    expect(screen.getByText(/평발/)).toBeInTheDocument();
    expect(screen.getByText(/요족/)).toBeInTheDocument();
    expect(screen.getByText(/무지외반/)).toBeInTheDocument();
    expect(screen.getByText(/족저근막염/)).toBeInTheDocument();
  });

  it("links to the segment-prefiltered catalog", () => {
    render(<HealthSegmentPage />);
    const catalogLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href")?.includes("segment=health"));
    expect(catalogLinks.length).toBeGreaterThan(0);
  });

  it("links to the scanning flow", () => {
    render(<HealthSegmentPage />);
    const scanLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/scan");
    expect(scanLinks.length).toBeGreaterThan(0);
  });
});
