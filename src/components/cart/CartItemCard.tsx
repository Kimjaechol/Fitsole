"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CartItem } from "@/lib/cart/types";

interface CartItemCardProps {
  item: CartItem;
  onQuantityChange: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function CartItemCard({
  item,
  onQuantityChange,
  onRemove,
}: CartItemCardProps) {
  const unitPrice =
    item.price + (item.includesInsole ? item.bundleInsolePrice : 0);
  const totalPrice = unitPrice * item.quantity;

  return (
    <Card className="flex flex-row gap-4 p-4">
      {/* Product Image */}
      <Link
        href={`/catalog/${item.productSlug}`}
        className="relative h-[120px] w-[120px] shrink-0 overflow-hidden rounded-lg bg-muted"
      >
        {item.productImageUrl ? (
          <Image
            src={item.productImageUrl}
            alt={item.productName}
            fill
            className="object-cover"
            sizes="120px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No Image
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="flex flex-1 flex-col justify-between gap-2">
        <div>
          <Link
            href={`/catalog/${item.productSlug}`}
            className="font-semibold hover:underline"
          >
            {item.productName}
          </Link>
          <p className="text-sm text-muted-foreground">
            {item.size}mm
          </p>

          {item.includesInsole && (
            <Badge variant="secondary" className="mt-1">
              {item.designSource === "professional"
                ? "SALTED 정밀 인솔 포함"
                : "맞춤 인솔 포함"}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuantityChange(item.id, item.quantity - 1)}
              aria-label="수량 감소"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-medium">
              {item.quantity}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              aria-label="수량 증가"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Price + Remove */}
          <div className="flex items-center gap-3">
            <span className="font-bold">
              {totalPrice.toLocaleString("ko-KR")}원
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
              aria-label="삭제"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
