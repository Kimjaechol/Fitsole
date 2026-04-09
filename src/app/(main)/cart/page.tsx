"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { CartItemCard } from "@/components/cart/CartItemCard";
import { CartSummary } from "@/components/cart/CartSummary";
import { useCartStore } from "@/lib/cart/store";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);

  if (items.length === 0) {
    return (
      <div className="px-4 py-8">
        <h1 className="mb-8 text-2xl font-bold">장바구니</h1>
        <EmptyState
          icon={ShoppingCart}
          title="장바구니가 비어있습니다"
          body="마음에 드는 신발을 담아보세요"
          ctaText="쇼핑하러 가기"
          ctaHref="/catalog"
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">장바구니</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Items - 2/3 width on desktop */}
        <div className="space-y-4 lg:col-span-2">
          {items.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onQuantityChange={updateQuantity}
              onRemove={removeItem}
            />
          ))}

          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={clearCart}
            >
              장바구니 비우기
            </Button>
          </div>
        </div>

        {/* Order Summary - 1/3 width on desktop */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
