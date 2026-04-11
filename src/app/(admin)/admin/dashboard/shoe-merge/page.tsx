import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import ShoeMergeClient from "@/components/admin/shoe-merge-client";

/**
 * /admin/dashboard/shoe-merge
 *
 * Partial scan merge tool for admins. Allows uploading a Revopoint interior
 * scan and an alginate cast scan, running ICP alignment, and extracting
 * unified dimensions with discrepancy resolution.
 */
export default async function ShoeMergePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const admin = await isAdmin(session.user.id);
  if (!admin) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold">접근 권한 없음</h1>
        <p className="mt-2 text-slate-600">
          관리자 권한이 필요합니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">
          부분 스캔 병합 (Revopoint + 알지네이트)
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Revopoint로 촬영한 신발 내부 부분 스캔과 알지네이트 캐스트로 뜬
          복제본 스캔을 병합하여 완전한 내부 측정값을 도출합니다.
        </p>
      </header>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <h3 className="font-semibold">작업 순서</h3>
        <ol className="mt-2 ml-5 list-decimal space-y-1">
          <li>
            Revopoint로 신발 내부를 직접 스캔 (3~5분) →{" "}
            <strong>.stl / .obj / .ply</strong> 파일 저장
          </li>
          <li>
            신발 내부에 알지네이트를 주입하여 캐스트 생성 (3~5분 경화)
          </li>
          <li>
            꺼낸 캐스트를 Revopoint로 외부 스캔 (2~3분) →{" "}
            <strong>.stl</strong> 파일 저장
          </li>
          <li>아래에 두 파일을 업로드하면 자동 병합됩니다</li>
        </ol>
      </div>

      <ShoeMergeClient />
    </div>
  );
}
