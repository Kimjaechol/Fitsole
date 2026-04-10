"use client";

/**
 * PublicReservationForm — D-14, OFFL-03.
 *
 * Public client-side reservation form rendered on /stores/gangnam. Posts
 * to /api/reservations (public endpoint created in this plan) which
 * inserts a row with status='pending' into the Phase 5 reservations table.
 *
 * Service type mapping (D-14):
 *   일반 측정        → measurement
 *   SALTED 정밀 측정 → consultation
 *   운동선수 키트 대여 → pickup
 *
 * The three labels shown to the user are mapped to the existing Phase 5
 * ServiceType enum (measurement | consultation | pickup) so no DB schema
 * change is needed. Rationale is captured in the plan + summary.
 *
 * URL query: ?service=pickup prefills the serviceType select so that the
 * athlete kit-rental section's CTA can deep-link to the form with the
 * correct option already selected.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ServiceType = "measurement" | "consultation" | "pickup";

const SERVICE_OPTIONS: Array<{ value: ServiceType; label: string }> = [
  { value: "measurement", label: "일반 측정" },
  { value: "consultation", label: "SALTED 정밀 측정" },
  { value: "pickup", label: "운동선수 키트 대여" },
];

const TIME_SLOTS = [
  "10:00-11:00",
  "11:00-12:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
];

function isServiceType(v: string | null): v is ServiceType {
  return v === "measurement" || v === "consultation" || v === "pickup";
}

export function PublicReservationForm() {
  const searchParams = useSearchParams();
  const initialService = useMemo<ServiceType | "">(() => {
    const raw = searchParams?.get("service") ?? null;
    return isServiceType(raw) ? raw : "";
  }, [searchParams]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType | "">(
    initialService
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Keep select in sync if the param changes after mount (rare, but cheap).
  useEffect(() => {
    if (initialService && !serviceType) {
      setServiceType(initialService);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialService]);

  const today = useMemo(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }, []);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setReservationDate("");
    setTimeSlot("");
    setServiceType("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          reservationDate,
          timeSlot,
          serviceType,
          notes: notes.trim() || null,
        }),
      });

      if (res.status === 201) {
        toast.success("예약 요청이 접수되었습니다. 담당자가 연락드립니다.");
        resetForm();
        return;
      }

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        issues?: Array<{ path: string; message: string }>;
      };
      const firstIssue = body.issues?.[0]?.message;
      toast.error(
        firstIssue ?? body.error ?? "예약 요청 중 오류가 발생했습니다."
      );
    } catch (err) {
      console.error("[PublicReservationForm] submit failed:", err);
      toast.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="reservation-form"
      className="scroll-mt-20 bg-white px-4 py-12 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-2 text-2xl font-bold text-[#0F172A] md:text-3xl">
          방문 예약
        </h2>
        <p className="mb-8 text-sm text-slate-600">
          원하시는 서비스와 방문 일정을 남겨 주시면 담당자가 확인 후
          연락드립니다.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pr-name">이름 *</Label>
            <Input
              id="pr-name"
              name="customerName"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="홍길동"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-phone">연락처 *</Label>
            <Input
              id="pr-phone"
              name="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              required
              placeholder="010-0000-0000"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-email">이메일 (선택)</Label>
            <Input
              id="pr-email"
              name="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pr-date">방문 희망 날짜 *</Label>
              <Input
                id="pr-date"
                name="reservationDate"
                type="date"
                min={today}
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pr-slot">시간대 *</Label>
              <select
                id="pr-slot"
                name="timeSlot"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              >
                <option value="">시간대를 선택하세요</option>
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-service">관심 서비스 *</Label>
            <select
              id="pr-service"
              name="serviceType"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              required
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            >
              <option value="">서비스를 선택하세요</option>
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pr-notes">추가 메시지 (선택)</Label>
            <textarea
              id="pr-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              placeholder="특이사항이나 궁금한 점을 자유롭게 남겨 주세요."
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "전송 중..." : "예약 요청 보내기"}
          </Button>
        </form>
      </div>
    </section>
  );
}
