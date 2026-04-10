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

// The reservation form is a client component with hooks + fetch; mock it so
// the server-page test can focus on structure.
vi.mock("@/components/stores/public-reservation-form", () => ({
  PublicReservationForm: () => (
    <section id="reservation-form" data-testid="mock-reservation-form">
      예약 폼
    </section>
  ),
}));

import GangnamStorePage from "@/app/(main)/stores/gangnam/page";
import { StoreLocationMap } from "@/components/stores/store-location-map";
import { STORE_GANGNAM } from "@/lib/stores/constants";

describe("/stores/gangnam page (D-11, D-12, OFFL-01)", () => {
  it("contains the store address '강남역 지하상가'", () => {
    render(<GangnamStorePage />);
    expect(screen.getAllByText(/강남역 지하상가/).length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("contains weekday hours '평일 10:00-21:00'", () => {
    render(<GangnamStorePage />);
    expect(screen.getByText(/평일 10:00-21:00/)).toBeInTheDocument();
  });

  it("contains weekend hours '주말 10:00-20:00'", () => {
    render(<GangnamStorePage />);
    expect(screen.getByText(/주말 10:00-20:00/)).toBeInTheDocument();
  });

  it("renders kit rental section with id='kit-rental' (D-15)", () => {
    const { container } = render(<GangnamStorePage />);
    const rental = container.querySelector("#kit-rental");
    expect(rental).not.toBeNull();
  });

  it("mentions SALTED in the kit service section (OFFL-02)", () => {
    render(<GangnamStorePage />);
    expect(screen.getAllByText(/SALTED/).length).toBeGreaterThanOrEqual(1);
  });

  it("mentions '1-2주' rental period in kit rental section (D-15)", () => {
    render(<GangnamStorePage />);
    expect(screen.getByText(/1-2주/)).toBeInTheDocument();
  });

  it("renders the mocked reservation form between kit-service and kit-rental", () => {
    render(<GangnamStorePage />);
    expect(screen.getByTestId("mock-reservation-form")).toBeInTheDocument();
  });
});

describe("StoreLocationMap (D-13)", () => {
  const ORIGINAL_ENV = process.env.KAKAO_MAP_KEY;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.KAKAO_MAP_KEY;
    } else {
      process.env.KAKAO_MAP_KEY = ORIGINAL_ENV;
    }
  });

  it("renders fallback with address text when KAKAO_MAP_KEY is unset", () => {
    delete process.env.KAKAO_MAP_KEY;
    render(<StoreLocationMap info={STORE_GANGNAM} />);
    expect(screen.getByText(/지도 준비 중/)).toBeInTheDocument();
    expect(screen.getByText(STORE_GANGNAM.address)).toBeInTheDocument();
  });

  it("renders an <img> pointing at dapi.kakao.com when KAKAO_MAP_KEY is set", () => {
    process.env.KAKAO_MAP_KEY = "test-key";
    const { container } = render(<StoreLocationMap info={STORE_GANGNAM} />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toContain("dapi.kakao.com");
  });
});
