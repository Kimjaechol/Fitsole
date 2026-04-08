import { describe, it, expect } from "vitest";
import { loginSchema, signUpSchema, resetPasswordSchema } from "../validators/auth";

describe("loginSchema", () => {
  it("validates correct login input", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.password?.[0]).toContain("8자");
    }
  });
});

describe("signUpSchema", () => {
  it("validates correct signup input", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
      name: "홍길동",
    });
    expect(result.success).toBe(true);
  });

  it("rejects password mismatch with Korean error message", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "different456",
      name: "홍길동",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.confirmPassword?.[0]).toContain("비밀번호가 일치하지 않습니다");
    }
  });

  it("rejects short password", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "short",
      confirmPassword: "short",
      name: "홍길동",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = signUpSchema.safeParse({
      email: "user@example.com",
      password: "password123",
      confirmPassword: "password123",
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("validates correct email", () => {
    const result = resetPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = resetPasswordSchema.safeParse({
      email: "not-valid",
    });
    expect(result.success).toBe(false);
  });
});
