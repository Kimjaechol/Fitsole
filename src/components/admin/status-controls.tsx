"use client";

/**
 * Admin Order Status Controls (D-06, D-09).
 *
 * Renders the status-transition action buttons for the order detail page.
 *
 * Behavior:
 *   - Available buttons depend on the current order status (workflow gate)
 *   - Each transition opens a Dialog confirmation before firing the request
 *   - "배송 시작" (paid -> shipping) requires tracking number + carrier inputs
 *   - "제작 의뢰" (designing -> manufacturing) hits POST /api/admin/orders/[id]/dispatch
 *     instead of the generic PATCH status endpoint, so the factory email goes out
 *   - Toast feedback via sonner (Toaster lives in (admin) layout)
 *
 * Note: Task 1 ships the UI scaffolding wired against the existing PATCH
 * /status endpoint. The dispatch route + factory email is wired in Task 2.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/types/order";

interface StatusControlsProps {
  orderId: string;
  currentStatus: OrderStatus;
  hasDesignSpecs: boolean;
}

type Action =
  | { kind: "status"; nextStatus: OrderStatus; label: string }
  | { kind: "dispatch"; label: string }
  | { kind: "ship"; label: string };

const CARRIER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "cj", label: "CJ 대한통운" },
  { value: "hanjin", label: "한진택배" },
  { value: "lotte", label: "롯데택배" },
  { value: "logen", label: "로젠택배" },
  { value: "post", label: "우체국택배" },
];

function getActionsForStatus(
  status: OrderStatus,
  hasDesignSpecs: boolean
): Action[] {
  switch (status) {
    case "paid":
      return [
        { kind: "status", nextStatus: "designing", label: "인솔 설계 시작" },
      ];
    case "designing":
      return [
        {
          kind: "dispatch",
          label: hasDesignSpecs ? "제작 의뢰" : "제작 의뢰 (설계 필요)",
        },
      ];
    case "manufacturing":
      return [{ kind: "ship", label: "배송 시작" }];
    case "shipping":
      return [
        { kind: "status", nextStatus: "delivered", label: "배송 완료" },
      ];
    case "pending":
    case "delivered":
    case "cancelled":
    default:
      return [];
  }
}

export function StatusControls({
  orderId,
  currentStatus,
  hasDesignSpecs,
}: StatusControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openAction, setOpenAction] = useState<Action | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState(CARRIER_OPTIONS[0].value);

  const actions = getActionsForStatus(currentStatus, hasDesignSpecs);

  function closeDialog() {
    setOpenAction(null);
    setTrackingNumber("");
    setTrackingCarrier(CARRIER_OPTIONS[0].value);
  }

  async function performStatusUpdate(
    nextStatus: OrderStatus,
    extra?: { trackingNumber?: string; trackingCarrier?: string }
  ) {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        ...(extra ?? {}),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "상태 업데이트에 실패했습니다.");
    }
  }

  async function performDispatch() {
    const res = await fetch(`/api/admin/orders/${orderId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "공장 의뢰에 실패했습니다.");
    }
  }

  function confirmAction() {
    if (!openAction) return;

    startTransition(async () => {
      try {
        if (openAction.kind === "status") {
          await performStatusUpdate(openAction.nextStatus);
          toast.success(
            `상태가 "${ORDER_STATUS_LABELS[openAction.nextStatus]}"(으)로 변경되었습니다.`
          );
        } else if (openAction.kind === "ship") {
          if (!trackingNumber.trim()) {
            toast.error("운송장 번호를 입력해 주세요.");
            return;
          }
          await performStatusUpdate("shipping", {
            trackingNumber: trackingNumber.trim(),
            trackingCarrier,
          });
          toast.success("배송이 시작되었습니다.");
        } else if (openAction.kind === "dispatch") {
          if (!hasDesignSpecs) {
            toast.error(
              "인솔 설계 데이터가 없어 공장 의뢰를 보낼 수 없습니다."
            );
            return;
          }
          await performDispatch();
          toast.success("공장에 제작 의뢰가 발송되었습니다.");
        }
        closeDialog();
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "요청 처리 중 오류가 발생했습니다."
        );
      }
    });
  }

  if (actions.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-slate-500">
            현재 상태(<span className="font-semibold text-slate-700">{ORDER_STATUS_LABELS[currentStatus]}</span>)에서는 추가 액션이 없습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">상태 관리</h2>
            <span className="text-xs text-slate-500">
              현재: {ORDER_STATUS_LABELS[currentStatus]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const isDispatchDisabled =
                action.kind === "dispatch" && !hasDesignSpecs;
              return (
                <Button
                  key={action.label}
                  type="button"
                  variant={action.kind === "dispatch" ? "default" : "outline"}
                  disabled={pending || isDispatchDisabled}
                  onClick={() => setOpenAction(action)}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={openAction !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openAction?.kind === "dispatch"
                ? "공장 제작 의뢰"
                : openAction?.kind === "ship"
                  ? "배송 시작"
                  : "상태 변경"}
            </DialogTitle>
            <DialogDescription>
              {openAction?.kind === "dispatch"
                ? "공장에 인솔 제작 의뢰서가 발송됩니다. 계속하시겠습니까?"
                : openAction?.kind === "ship"
                  ? "운송장 번호와 택배사를 입력한 뒤 배송 상태로 전환합니다."
                  : `주문 상태를 "${
                      openAction && openAction.kind === "status"
                        ? ORDER_STATUS_LABELS[openAction.nextStatus]
                        : ""
                    }"(으)로 변경하시겠습니까?`}
            </DialogDescription>
          </DialogHeader>

          {openAction?.kind === "ship" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="trackingCarrier">택배사</Label>
                <select
                  id="trackingCarrier"
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {CARRIER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="trackingNumber">운송장 번호</Label>
                <Input
                  id="trackingNumber"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="예: 1234567890"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={pending}
            >
              취소
            </Button>
            <Button type="button" onClick={confirmAction} disabled={pending}>
              {pending ? "처리 중..." : "확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
