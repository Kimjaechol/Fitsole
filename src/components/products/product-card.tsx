import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  product: {
    name: string;
    slug: string;
    price: number;
    bundleInsolePrice?: number | null;
    images?: { image: { url?: string; alt?: string } }[];
    category?: { name: string } | string;
  };
}

const priceFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export function ProductCard({ product }: ProductCardProps) {
  const firstImage = product.images?.[0]?.image;
  const categoryName =
    typeof product.category === 'object' && product.category !== null
      ? product.category.name
      : typeof product.category === 'string'
        ? product.category
        : null;

  const bundlePrice =
    product.bundleInsolePrice && product.bundleInsolePrice > 0
      ? product.price + product.bundleInsolePrice
      : null;

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
          {firstImage?.url ? (
            <Image
              src={firstImage.url}
              alt={firstImage.alt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="text-sm">이미지 없음</span>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          {categoryName && (
            <Badge variant="secondary" className="mb-2 text-xs">
              {categoryName}
            </Badge>
          )}
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">
            {product.name}
          </h3>
          <p className="mt-2 text-base font-bold">
            {priceFormatter.format(product.price)}
          </p>
          {bundlePrice && (
            <p className="mt-1 text-xs text-muted-foreground">
              신발+인솔 세트: {priceFormatter.format(bundlePrice)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
