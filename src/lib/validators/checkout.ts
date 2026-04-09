import { z } from "zod";

export const shippingSchema = z.object({
  name: z
    .string()
    .min(2, "이름을 입력해 주세요")
    .max(50, "이름은 50자 이하여야 합니다"),
  phone: z
    .string()
    .regex(
      /^01[016789]-?\d{3,4}-?\d{4}$/,
      "올바른 휴대폰 번호를 입력해 주세요"
    ),
  zipcode: z
    .string()
    .regex(/^\d{5}$/, "우편번호를 검색해 주세요"),
  address: z
    .string()
    .min(1, "주소를 검색해 주세요"),
  detailAddress: z.string(),
});

export type ShippingFormData = z.infer<typeof shippingSchema>;
