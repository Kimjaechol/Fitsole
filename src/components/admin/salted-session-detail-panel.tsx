"use client";

/**
 * Client wrapper that reads the `?id=` search param and either renders the
 * session detail loader or a placeholder. Split out of the server page so
 * the router/searchParams hooks can be used.
 */

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { SaltedSessionDetailLoader } from "@/components/admin/salted-session-detail";

interface Props {
  selectedId: string | null;
}

export function SaltedSessionDetailPanel({ selectedId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("id");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (!selectedId) {
    return (
      <Card>
        <CardContent className="flex h-full min-h-[240px] items-center justify-center p-6 text-center text-sm text-slate-500">
          목록에서 세션을 선택하면 상세 정보가 표시됩니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <SaltedSessionDetailLoader sessionId={selectedId} onClear={handleClear} />
  );
}
