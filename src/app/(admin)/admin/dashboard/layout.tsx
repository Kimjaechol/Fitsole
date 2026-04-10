import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Toaster } from "@/components/ui/sonner";

/**
 * Admin dashboard layout (D-04).
 *
 * Uses (admin) route group to avoid inheriting (main) layout's bottom tab bar.
 *
 * Threat model (T-05-06):
 * - Server-side auth() check, redirect to /login if no session
 * - Server-side isAdmin() DB check, 403 page if not admin
 */
export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/dashboard");
  }

  const admin = await isAdmin(session.user.id);

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-red-600">403</h1>
          <p className="mt-2 text-base text-slate-700">
            관리자 권한이 필요합니다.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            이 페이지는 관리자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 md:ml-[240px]">
        <div className="mx-auto max-w-[1280px] p-4 md:p-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
