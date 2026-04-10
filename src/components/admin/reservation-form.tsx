"use client";

/**
 * ReservationForm — dialog form for admin to create a new offline store
 * reservation. Validation mirrors the Zod schema on /api/admin/reservations.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

type ServiceType = "measurement" | "consultation" | "pickup";

const SERVICE_OPTIONS: Array<{ value: ServiceType; label: string }> = [
  { value: "measurement", label: "발 측정" },
  { value: "consultation", label: "상담" },
  { value: "pickup", label: "수령" },
];

// 10:00-19:00 in 1-hour blocks per spec (plan Task 2 #5)
const TIME_SLOTS = [
  "10:00-11:00",
  "11:00-12:00",
  "12:00-13:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
  "16:00-17:00",
  "17:00-18:00",
  "18:00-19:00",
];

interface FormErrors {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  reservationDate?: string;
  timeSlot?: string;
  serviceType?: string;
}

function validate(input: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  reservationDate: string;
  timeSlot: string;
  serviceType: ServiceType | "";
}): FormErrors {
  const errors: FormErrors = {};
  if (!input.customerName.trim()) errors.customerName = "고객명은 필수입니다.";
  if (!input.customerPhone.trim())
    errors.customerPhone = "전화번호는 필수입니다.";
  if (
    input.customerEmail.trim() !== "" &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.customerEmail.trim())
  ) {
    errors.customerEmail = "이메일 형식이 올바르지 않습니다.";
  }
  if (!input.reservationDate) errors.reservationDate = "예약일은 필수입니다.";
  if (!input.timeSlot) errors.timeSlot = "시간대는 필수입니다.";
  if (!input.serviceType) errors.serviceType = "서비스 유형은 필수입니다.";
  return errors;
}

export function ReservationForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setReservationDate("");
    setTimeSlot("");
    setServiceType("");
    setNotes("");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentErrors = validate({
      customerName,
      customerPhone,
      customerEmail,
      reservationDate,
      timeSlot,
      serviceType,
    });
    setErrors(currentErrors);
    if (Object.keys(currentErrors).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/reservations", {
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "예약을 생성하지 못했습니다.");
      }
      toast.success("예약이 생성되었습니다.");
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus className="mr-1.5 h-4 w-4" />
          새 예약
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>새 예약 등록</DialogTitle>
          <DialogDescription>
            오프라인 매장 방문 예약 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-name" className="text-xs text-slate-600">
              고객명 *
            </Label>
            <Input
              id="r-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="홍길동"
            />
            {errors.customerName && (
              <p className="text-xs text-red-600">{errors.customerName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-phone" className="text-xs text-slate-600">
              전화번호 *
            </Label>
            <Input
              id="r-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="010-0000-0000"
            />
            {errors.customerPhone && (
              <p className="text-xs text-red-600">{errors.customerPhone}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-email" className="text-xs text-slate-600">
              이메일 (선택)
            </Label>
            <Input
              id="r-email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="name@example.com"
            />
            {errors.customerEmail && (
              <p className="text-xs text-red-600">{errors.customerEmail}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-date" className="text-xs text-slate-600">
                예약일 *
              </Label>
              <Input
                id="r-date"
                type="date"
                value={reservationDate}
                onChange={(e) => setReservationDate(e.target.value)}
              />
              {errors.reservationDate && (
                <p className="text-xs text-red-600">
                  {errors.reservationDate}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-slot" className="text-xs text-slate-600">
                시간대 *
              </Label>
              <select
                id="r-slot"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              >
                <option value="">선택</option>
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.timeSlot && (
                <p className="text-xs text-red-600">{errors.timeSlot}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-service" className="text-xs text-slate-600">
              서비스 유형 *
            </Label>
            <select
              id="r-service"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
            >
              <option value="">선택</option>
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {errors.serviceType && (
              <p className="text-xs text-red-600">{errors.serviceType}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="r-notes" className="text-xs text-slate-600">
              메모
            </Label>
            <textarea
              id="r-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
              placeholder="특이사항이 있으면 입력하세요."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetForm();
                setOpen(false);
              }}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "등록 중..." : "예약 등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
