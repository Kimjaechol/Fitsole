export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/mypage/:path*", "/api/profile/:path*"],
};
