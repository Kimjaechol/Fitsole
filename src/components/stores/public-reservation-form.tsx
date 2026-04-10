"use client";

/**
 * PublicReservationForm — TEMPORARY STUB for Task 1.
 *
 * Task 2 (06-03 Plan) replaces this with a full client-side form that
 * POSTs to /api/reservations. Leaving a stub lets the store page render
 * and the Task 1 test suite run without a circular dependency on Task 2.
 */

export function PublicReservationForm() {
  return (
    <section
      id="reservation-form"
      className="px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-3 text-2xl font-bold text-[#0F172A] md:text-3xl">
          방문 예약
        </h2>
        <p className="text-sm text-slate-600">예약 폼을 준비 중입니다.</p>
      </div>
    </section>
  );
}
