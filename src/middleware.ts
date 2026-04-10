export { auth as middleware } from "@/lib/auth";

// Middleware only checks session existence (lightweight, runs on edge).
// Full role check (role === "admin") happens in API routes and server
// components via requireAdmin() — see src/lib/admin-auth.ts (D-12).
//
// NOTE: /admin (no /dashboard) is reserved for Payload CMS admin (D-04)
// and must NOT be matched here or Payload's own auth will double-handle it.
export const config = {
  matcher: [
    "/mypage/:path*",
    "/api/profile/:path*",
    "/admin/dashboard/:path*",
  ],
};
