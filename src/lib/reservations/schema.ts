/**
 * Shared Zod schemas and type constants for reservation endpoints.
 *
 * Extracted so that both the admin route (/api/admin/reservations) and
 * the public route (/api/reservations) can import the same base schema
 * without pulling `requireAdmin()` → next-auth into test environments
 * that only exercise the public endpoint.
 */

import { z } from "zod";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type ServiceType = "measurement" | "consultation" | "pickup";

export const RESERVATION_STATUS_VALUES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const satisfies readonly ReservationStatus[];

export const SERVICE_TYPE_VALUES = [
  "measurement",
  "consultation",
  "pickup",
] as const satisfies readonly ServiceType[];

/**
 * Base reservation validation schema used by admin + public endpoints.
 * The public endpoint extends this with a "date must be >= today" refine.
 */
export const createReservationSchema = z.object({
  customerName: z.string().trim().min(1, "고객명은 필수입니다.").max(100),
  customerPhone: z.string().trim().min(1, "전화번호는 필수입니다.").max(40),
  customerEmail: z
    .string()
    .trim()
    .email("이메일 형식이 올바르지 않습니다.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" || v === undefined ? null : v)),
  reservationDate: z
    .string()
    .min(1, "예약일은 필수입니다.")
    .refine((s) => !Number.isNaN(new Date(s).getTime()), {
      message: "예약일 형식이 올바르지 않습니다.",
    }),
  timeSlot: z.string().trim().min(1, "시간대는 필수입니다.").max(40),
  serviceType: z.enum(SERVICE_TYPE_VALUES, {
    message: "서비스 유형이 올바르지 않습니다.",
  }),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
