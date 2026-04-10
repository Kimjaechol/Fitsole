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

import GeneralSegmentPage from "@/app/(main)/segment/general/page";

describe("/segment/general page (D-03)", () => {
  it("renders without throwing and emphasizes comfort", () => {
    const { container } = render(<GeneralSegmentPage />);
    expect(container.textContent ?? "").toMatch(/편안/);
  });

  it("links to the general-prefiltered catalog", () => {
    render(<GeneralSegmentPage />);
    const catalogLinks = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("href")?.includes("segment=general"));
    expect(catalogLinks.length).toBeGreaterThan(0);
  });
});
