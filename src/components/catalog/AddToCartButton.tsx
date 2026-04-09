"use client";

import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/cart/store";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    bundleInsolePrice: number;
    imageUrl: string | null;
  };
  size: number;
  designId?: string;
  designSource?: "general" | "professional";
}

export function AddToCartButton({
  product,
  size,
  designId,
  designSource,
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);

  const handleClick = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImageUrl: product.imageUrl,
      size,
      price: product.price,
      bundleInsolePrice: product.bundleInsolePrice,
      includesInsole: !!designId,
      designId: designId ?? null,
      designSource: designSource ?? null,
      quantity: 1,
    });

    toast.success("장바구니에 추가되었습니다", {
      action: {
        label: "장바구니 보기",
        onClick: () => {
          window.location.href = "/cart";
        },
      },
    });
  };

  return (
    <Button
      variant="default"
      size="lg"
      className="bg-[#2563EB] hover:bg-[#2563EB]/90"
      onClick={handleClick}
    >
      <ShoppingCart className="mr-2 h-5 w-5" />
      장바구니에 담기
    </Button>
  );
}
