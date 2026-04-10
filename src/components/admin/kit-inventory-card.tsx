"use client";

/**
 * KitInventoryCard — shows a single smart insole kit inventory item and
 * lets the admin update availableQuantity inline via PATCH.
 *
 * The PATCH route is /api/admin/kit-inventory/[id] (sibling of reservations
 * route; implemented in this same plan). Kept trivially simple — single
 * available-quantity editor + read-only total.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";

export interface KitInventoryItem {
  id: string;
  kitName: string;
  totalQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
}

export function KitInventoryCard({ item }: { item: KitInventoryItem }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.availableQuantity));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const n = Number(value);
    if (Number.isNaN(n) || n < 0 || n > item.totalQuantity) {
      toast.error(`0 ~ ${item.totalQuantity} 사이 값을 입력하세요.`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/kit-inventory/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableQuantity: n }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "업데이트에 실패했습니다.");
      }
      toast.success("재고가 업데이트되었습니다.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setValue(String(item.availableQuantity));
    setEditing(false);
  };

  const pct =
    item.totalQuantity > 0
      ? Math.min(100, Math.max(0, (item.availableQuantity / item.totalQuantity) * 100))
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{item.kitName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-slate-700">
          <span>
            사용 가능:{" "}
            {editing ? (
              <Input
                type="number"
                min={0}
                max={item.totalQuantity}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="inline-block h-7 w-20 px-2 py-0 text-sm"
              />
            ) : (
              <span className="font-bold text-slate-900 tabular-nums">
                {item.availableQuantity}
              </span>
            )}
            {" / "}
            <span className="tabular-nums">전체 {item.totalQuantity}</span>
          </span>

          {editing ? (
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={save}
                disabled={busy}
                aria-label="저장"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={cancel}
                disabled={busy}
                aria-label="취소"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              aria-label="수량 편집"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="h-1.5 w-full rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
