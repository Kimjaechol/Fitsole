"use client";

import * as React from "react";
import { Heart, Sparkles, Zap } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SEGMENT_DESCRIPTIONS,
  SEGMENT_LABELS,
  SEGMENT_VALUES,
  type Segment,
} from "@/lib/types/segment";

/**
 * Segment selection modal (Phase 06 D-01).
 *
 * Shows the three locked options — 발 건강 고민 / 일반 소비자 / 운동선수 —
 * as large tappable cards. Mobile-first single column, 3 columns on md+.
 *
 * Dismissability:
 * - When `dismissable` is false (first-visit flow with no segment yet), the
 *   dialog cannot be closed via overlay click, escape, or the default close
 *   button — users MUST pick one of the three.
 * - When true (user opened via "바꾸기" later), the dialog closes normally.
 */

type SegmentSelectModalProps = {
  open: boolean;
  onSelect: (segment: Segment) => void;
  onClose?: () => void;
  dismissable?: boolean;
};

const SEGMENT_ICONS: Record<Segment, React.ComponentType<{ className?: string }>> = {
  health: Heart,
  general: Sparkles,
  athlete: Zap,
};

export function SegmentSelectModal({
  open,
  onSelect,
  onClose,
  dismissable = false,
}: SegmentSelectModalProps) {
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        if (dismissable) {
          onClose?.();
        }
        // Otherwise ignore — user must pick a segment.
      }
    },
    [dismissable, onClose]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[880px] sm:max-w-[880px]",
          !dismissable && "[&>button]:hidden"
        )}
        onEscapeKeyDown={(e) => {
          if (!dismissable) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (!dismissable) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (!dismissable) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl">
            어떤 이유로 FitSole을 찾아오셨나요?
          </DialogTitle>
          <DialogDescription>
            가장 가까운 항목을 선택하시면 맞춤 추천과 측정 가이드를 제공해
            드립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
          {SEGMENT_VALUES.map((segment) => {
            const Icon = SEGMENT_ICONS[segment];
            return (
              <button
                key={segment}
                type="button"
                onClick={() => onSelect(segment)}
                className={cn(
                  "group flex flex-col items-start gap-3 rounded-xl border border-border bg-white p-5 text-left",
                  "transition hover:border-[#0F172A] hover:shadow-md",
                  "focus:outline-none focus:ring-2 focus:ring-[#0F172A] focus:ring-offset-2"
                )}
                data-segment={segment}
                aria-label={SEGMENT_LABELS[segment]}
              >
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    "bg-[#F1F5F9] text-[#0F172A] group-hover:bg-[#0F172A] group-hover:text-white"
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-lg font-semibold text-[#0F172A]">
                  {SEGMENT_LABELS[segment]}
                </span>
                <span className="text-sm leading-relaxed text-[#64748B]">
                  {SEGMENT_DESCRIPTIONS[segment]}
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
