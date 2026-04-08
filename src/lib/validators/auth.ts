import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해 주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export const signUpSchema = z
  .object({
    email: z.string().email("올바른 이메일 주소를 입력해 주세요."),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    confirmPassword: z.string(),
    name: z.string().min(1, "이름을 입력해 주세요."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email("올바른 이메일 주소를 입력해 주세요."),
});
