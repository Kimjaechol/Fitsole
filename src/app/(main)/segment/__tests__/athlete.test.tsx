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

import AthleteSegmentPage from "@/app/(main)/segment/athlete/page";

describe("/segment/athlete page (D-05)", () => {
  it("references SALTED smart insole kit rental program", () => {
    const { container } = render(<AthleteSegmentPage />);
    const text = container.textContent ?? "";
    expect(text).toMatch(/SALTED/i);
    expect(text.toLowerCase()).toContain("smart insole kit");
  });

  it("links to the athlete-prefiltered catalog", () => {
    render(<AthleteSegmentPage />);
    const catalogLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href")?.includes("segment=athlete"));
    expect(catalogLinks.length).toBeGreaterThan(0);
  });

  it("links to the gait scan flow", () => {
    render(<AthleteSegmentPage />);
    const scanLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href") === "/scan");
    expect(scanLinks.length).toBeGreaterThan(0);
  });
});
