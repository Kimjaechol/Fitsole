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

import CatalogPage from "@/app/(main)/catalog/page";
import { SEGMENT_LABELS } from "@/lib/types/segment";

/**
 * CatalogPage is a server component that accepts `searchParams`. We render it
 * with plain JSX (synchronous path) since it does not touch Payload in
 * Phase 06 — the Phase 06 contract only covers the segment badge surface.
 */

describe("/catalog ?segment= filter (D-06)", () => {
  it("shows the health segment badge when ?segment=health", async () => {
    const ui = await (CatalogPage as (props: {
      searchParams: Promise<{ segment?: string }>;
    }) => Promise<React.ReactElement>)({
      searchParams: Promise.resolve({ segment: "health" }),
    });
    render(ui);
    expect(
      screen.getByText(new RegExp(SEGMENT_LABELS.health))
    ).toBeInTheDocument();
  });

  it("shows the athlete segment badge when ?segment=athlete", async () => {
    const ui = await (CatalogPage as (props: {
      searchParams: Promise<{ segment?: string }>;
    }) => Promise<React.ReactElement>)({
      searchParams: Promise.resolve({ segment: "athlete" }),
    });
    render(ui);
    expect(
      screen.getByText(new RegExp(SEGMENT_LABELS.athlete))
    ).toBeInTheDocument();
  });

  it("does not render the segment badge when the param is absent (no regression)", async () => {
    const ui = await (CatalogPage as (props: {
      searchParams: Promise<{ segment?: string }>;
    }) => Promise<React.ReactElement>)({
      searchParams: Promise.resolve({}),
    });
    render(ui);
    for (const label of Object.values(SEGMENT_LABELS)) {
      expect(
        screen.queryByText(new RegExp(`${label} 추천 필터`))
      ).not.toBeInTheDocument();
    }
  });

  it("silently ignores unknown segment values (T-06-03)", async () => {
    const ui = await (CatalogPage as (props: {
      searchParams: Promise<{ segment?: string }>;
    }) => Promise<React.ReactElement>)({
      searchParams: Promise.resolve({ segment: "not-real" }),
    });
    render(ui);
    for (const label of Object.values(SEGMENT_LABELS)) {
      expect(
        screen.queryByText(new RegExp(`${label} 추천 필터`))
      ).not.toBeInTheDocument();
    }
  });
});
