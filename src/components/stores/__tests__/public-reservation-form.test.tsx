import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

// next/navigation stub: useSearchParams returns a stable empty map
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

import { PublicReservationForm } from "@/components/stores/public-reservation-form";

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  mockSearchParams = new URLSearchParams();
});

describe("PublicReservationForm (D-14, OFFL-03)", () => {
  it("wraps in a section with id='reservation-form'", () => {
    const { container } = render(<PublicReservationForm />);
    expect(container.querySelector("#reservation-form")).not.toBeNull();
  });

  it("renders all 3 service type options mapped to enum values", () => {
    const { container } = render(<PublicReservationForm />);
    const select = container.querySelector(
      "select[name='serviceType']"
    ) as HTMLSelectElement | null;
    expect(select).not.toBeNull();
    const values = Array.from(select!.querySelectorAll("option"))
      .map((o) => o.getAttribute("value"))
      .filter((v) => v && v !== "");
    expect(values).toEqual(
      expect.arrayContaining(["measurement", "consultation", "pickup"])
    );
  });

  it("labels the 3 service options with the D-14 Korean labels", () => {
    render(<PublicReservationForm />);
    expect(screen.getByText("일반 측정")).toBeInTheDocument();
    expect(screen.getByText("SALTED 정밀 측정")).toBeInTheDocument();
    expect(screen.getByText("운동선수 키트 대여")).toBeInTheDocument();
  });

  it("POSTs to /api/reservations and shows a success toast on 201", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ reservation: { id: "res-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<PublicReservationForm />);

    fireEvent.change(
      container.querySelector("input[name='customerName']")!,
      { target: { value: "홍길동" } }
    );
    fireEvent.change(
      container.querySelector("input[name='customerPhone']")!,
      { target: { value: "010-1234-5678" } }
    );
    const future = new Date();
    future.setDate(future.getDate() + 3);
    const dateStr = future.toISOString().slice(0, 10);
    fireEvent.change(
      container.querySelector("input[name='reservationDate']")!,
      { target: { value: dateStr } }
    );
    fireEvent.change(
      container.querySelector("select[name='timeSlot']")!,
      { target: { value: "10:00-11:00" } }
    );
    fireEvent.change(
      container.querySelector("select[name='serviceType']")!,
      { target: { value: "measurement" } }
    );

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/reservations");
    expect((options as RequestInit).method).toBe("POST");

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalled();
    });
  });

  it("shows an error toast when the API returns 400 with issues", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: "입력 값이 올바르지 않습니다.",
        issues: [
          { path: "customerName", message: "고객명은 필수입니다." },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<PublicReservationForm />);
    fireEvent.change(
      container.querySelector("input[name='customerName']")!,
      { target: { value: "홍길동" } }
    );
    fireEvent.change(
      container.querySelector("input[name='customerPhone']")!,
      { target: { value: "010-1234-5678" } }
    );
    const future = new Date();
    future.setDate(future.getDate() + 3);
    fireEvent.change(
      container.querySelector("input[name='reservationDate']")!,
      { target: { value: future.toISOString().slice(0, 10) } }
    );
    fireEvent.change(
      container.querySelector("select[name='timeSlot']")!,
      { target: { value: "10:00-11:00" } }
    );
    fireEvent.change(
      container.querySelector("select[name='serviceType']")!,
      { target: { value: "measurement" } }
    );

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
  });

  it("pre-selects serviceType from ?service= search param", () => {
    mockSearchParams = new URLSearchParams("service=pickup");
    const { container } = render(<PublicReservationForm />);
    const select = container.querySelector(
      "select[name='serviceType']"
    ) as HTMLSelectElement;
    expect(select.value).toBe("pickup");
  });
});
